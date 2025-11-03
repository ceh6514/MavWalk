//MavWalk backend

const express = require('express');
const cors = require('cors');

const {
    initializeDatabase,
    findUserByCredentials,
    getAllLocations,
    getPendingWalkRequests,
    createWalkRequest,
    getWalkRequestById,
    joinWalkRequest,
    updateWalkBuddyPosition,
    completeWalkRequest,
    getRouteBetweenLocations,
    getAllRoutes,
    saveMessage,
    getMessages,
    recordWalkCompletion,
    getWalksTodayCount,
    getMessagesCount,
} = require('./db');

const {
    getRequiredString,
    parsePositiveInteger,
    getOptionalString,
    handleError,
} = require('./validation');

const port = 3001;

let databaseInitialized = false;

const ensureDatabaseInitialized = () => {
    if (!databaseInitialized) {
        initializeDatabase();
        databaseInitialized = true;
    }
};

const createApp = () => {
    ensureDatabaseInitialized();

    const app = express();

    app.use(cors());
    app.use(express.json());

    //API Endpoints

    //A simple test route
    app.get('/', (req, res) => res.send('MavWalk Backend Server is running!')); //SUCCESS MESSAGE!

    app.get('/api/stats', (req, res) => {
        try {
            const walksToday = getWalksTodayCount();
            const messagesShared = getMessagesCount();

            res.json({ walksToday, messagesShared });
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to load stats:',
                responseMessage: 'Unable to load stats.',
            });
        }
    });

    app.post('/api/walks/completions', (req, res) => {
        try {
            const startLocation = getRequiredString(req.body?.startLocation, 'startLocation');
            const destination = getRequiredString(req.body?.destination, 'destination');

            const completion = recordWalkCompletion({
                startLocationName: startLocation,
                destinationLocationName: destination,
            });

            res.status(201).json({
                message: 'Walk completion recorded.',
                completion,
            });
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to record walk completion:',
                responseMessage: 'Unable to record walk completion.',
            });
        }
    });

    //User login
    app.post('/api/login', (req, res) => {
        try {
            const email = getRequiredString(req.body?.email, 'email');
            const password = getRequiredString(req.body?.password, 'password');
            const user = findUserByCredentials(email, password);

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            res.json({ message: 'Login successful!', user });
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Login error:',
                responseMessage: 'Unable to process login request.',
            });
        }
    });

    //Get all pending walks
    app.get('/api/walks', (req, res) => {
        try {
            const pendingWalks = getPendingWalkRequests();
            res.json(pendingWalks);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to load pending walks:',
                responseMessage: 'Unable to load walk requests.',
            });
        }
    });

    //Return a list of known campus locations with coordinates so the frontend can render markers.
    app.get('/api/locations', (req, res) => {
        try {
            const locations = getAllLocations().map((location) => ({
                name: location.name,
                coordinates: [location.latitude, location.longitude],
            }));
            res.json(locations);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to load locations:',
                responseMessage: 'Unable to load locations.',
            });
        }
    });

    //Creating a walk, place holder route used
    app.post('/api/walks', (req, res) => {
        try {
            const userId = parsePositiveInteger(req.body?.userId, 'userId');
            const startLocation = getRequiredString(req.body?.startLocation, 'startLocation');
            const destination = getRequiredString(req.body?.destination, 'destination');

            const newWalkRequest = createWalkRequest({
                userId,
                startLocationName: startLocation,
                destinationLocationName: destination,
            });

            res.status(201).json(newWalkRequest);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to create walk request:',
                responseMessage: 'Unable to create walk request.',
            });
        }
    });

    //Joining a walk
    app.post('/api/walks/:id/join', (req, res) => {
        try {
            const walkId = parsePositiveInteger(req.params.id, 'walk id');
            const buddyId = parsePositiveInteger(req.body?.buddyId, 'buddyId');
            const walkRequest = getWalkRequestById(walkId);

            if (!walkRequest) {
                return res.status(404).json({ message: 'Walk request not found.' });
            }

            if (walkRequest.status !== 'pending') {
                return res.status(400).json({ message: 'This walk is no longer available.' });
            }

            const updatedWalk = joinWalkRequest(walkId, buddyId);
            res.json({ message: 'Successfully joined the walk!', walk: updatedWalk });
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to join walk:',
                responseMessage: 'Unable to join walk request.',
            });
        }
    });


    //Moving buddy/escort

    /**
     * @api {get} /api/walks/:id Get Single Walk Details
     * @description Retrieves all details for a specific walk, including location.
     */
    app.get('/api/walks/:id', (req, res) => {
        try {
            const walkId = parsePositiveInteger(req.params.id, 'walk id');
            const walk = getWalkRequestById(walkId);

            if (!walk) {
                return res.status(404).json({ message: 'Walk not found.' });
            }

            if (walk.status === 'active' && walk.route) {
                const [currentLat, currentLon] = walk.route.buddyCurrentCoords;
                const [endLat, endLon] = walk.route.endCoords;

                const updatedLat = currentLat + (endLat - currentLat) * 0.5;
                const updatedLon = currentLon + (endLon - currentLon) * 0.1;

                updateWalkBuddyPosition(walkId, updatedLat, updatedLon);

                walk.route.buddyCurrentCoords = [updatedLat, updatedLon];
            }

            res.json(walk);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to load walk details:',
                responseMessage: 'Unable to load walk details.',
            });
        }
    });

    /**
     * @api {post} /api/walks/:id/sos Trigger S.O.S.
     * @description Logs an emergency event for an active walk.
     */
    app.post('/api/walks/:id/sos', (req, res) => {
        try {
            const walkId = parsePositiveInteger(req.params.id, 'walk id');
            const walk = getWalkRequestById(walkId);

            if (walk) {
                console.log(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
                console.log(`!!! S.O.S. ACTIVATED FOR WALK #${walkId} !!!`);
                console.log(`!!! User: ${walk.userId}, Buddy: ${walk.buddyId}`);
                console.log(`!!! Last known location: ${walk.route.buddyCurrentCoords}`);
                console.log(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);
                res.status(200).json({ message: 'S.O.S. signal received. Campus police have been notified!' });
            } else {
                res.status(404).json({ message: 'Walk not found.' });
            }
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to trigger S.O.S.:',
                responseMessage: 'Unable to send S.O.S. for walk.',
            });
        }
    });

    /**
     * @api {post} /api/walks/:id/complete Mark Walk as Complete
     * @description Marks a walk as completed.
     */
    app.post('/api/walks/:id/complete', (req, res) => {
        try {
            const walkId = parsePositiveInteger(req.params.id, 'walk id');
            const walk = getWalkRequestById(walkId);
            if (!walk) {
                return res.status(404).json({ message: 'Walk not found.' });
            }

            const completedWalk = completeWalkRequest(walkId);
            res.status(200).json({ message: 'Walk marked as complete. Thank you!', walk: completedWalk });
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to complete walk:',
                responseMessage: 'Unable to complete walk.',
            });
        }
    });

    // Route catalogue endpoints
    app.get('/api/routes', (req, res) => {
        const start = getOptionalString(req.query.start);
        const destination = getOptionalString(req.query.destination);

        try {
            if (start && destination) {
                const route = getRouteBetweenLocations(start, destination);

                if (!route) {
                    return res.status(404).json({ message: 'Route not found for the selected locations.' });
                }

                return res.json(route);
            }

            const routes = getAllRoutes();
            res.json(routes);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to load routes:',
                responseMessage: 'Unable to load route information.',
            });
        }
    });

    // Message endpoints
    app.get('/api/messages', (req, res) => {
        try {
            const messages = getMessages();
            res.json(messages);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to load messages:',
                responseMessage: 'Unable to load saved messages.',
            });
        }
    });

    app.post('/api/messages', (req, res) => {
        try {
            const message = getRequiredString(req.body?.message, 'message');
            const startLocation = getOptionalString(req.body?.startLocation);
            const destination = getOptionalString(req.body?.destination);

            const savedMessage = saveMessage({
                message,
                startLocationName: startLocation,
                destinationLocationName: destination,
            });

            res.status(201).json(savedMessage);
        } catch (error) {
            return handleError(res, error, {
                logMessage: 'Failed to save message:',
                responseMessage: 'Unable to save message.',
            });
        }
    });

    // Return ONE random message, optionally filtered by start/destination (names)
    app.get('/api/messages/random', (req, res) => {
        try {
          const start = getOptionalString(req.query.start);
          const destination = getOptionalString(req.query.destination);
          const all = getMessages();

          const filtered = all.filter((message) =>
            (start ? message.startLocation === start : true) &&
            (destination ? message.destination === destination : true)
          );

          if (filtered.length === 0) {
            return res.json(null);
          }

          const pick = filtered[Math.floor(Math.random() * filtered.length)];
          return res.json(pick);
        } catch (error) {
          return handleError(res, error, {
            logMessage: 'Failed to get random message:',
            responseMessage: 'Unable to load a random message.',
          });
        }
      });

    return app;
};

if (require.main === module) {
    const app = createApp();
    app.listen(port, () => {
        console.log(`MavWalk server (v3) listening at http://localhost:${port}`);
    });
}

module.exports = {
    createApp,
    getRequiredString,
    parsePositiveInteger,
    getOptionalString,
    handleError,
};
