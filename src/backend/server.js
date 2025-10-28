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
} = require('./db');

const app = express();
const port = 3001;

initializeDatabase();

app.use(cors());
app.use(express.json());

//API Endpoints

//A simple test route
app.get('/', (req, res) => res.send('MavWalk Backend Server is running!')); //SUCCESS MESSAGE!

//User login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const user = findUserByCredentials(email, password);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        res.json({ message: 'Login successful!', user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Unable to process login request.' });
    }
});

//Get all pending walks
app.get('/api/walks', (req, res) => {
    try {
        const pendingWalks = getPendingWalkRequests();
        res.json(pendingWalks);
    } catch (error) {
        console.error('Failed to load pending walks:', error);
        res.status(500).json({ message: 'Unable to load walk requests.' });
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
        console.error('Failed to load locations:', error);
        res.status(500).json({ message: 'Unable to load locations.' });
    }
});

//Creating a walk, place holder route used
app.post('/api/walks', (req, res) => {
    const { userId, startLocation, destination } = req.body;

    try {
        const newWalkRequest = createWalkRequest({
            userId,
            startLocationName: startLocation,
            destinationLocationName: destination,
        });

        res.status(201).json(newWalkRequest);
    } catch (error) {
        console.error('Failed to create walk request:', error);
        res.status(400).json({ message: error.message || 'Unable to create walk request.' });
    }
});

//Joining a walk
app.post('/api/walks/:id/join', (req, res) => {
    const walkId = parseInt(req.params.id);
    const { buddyId } = req.body;
    try {
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
        console.error('Failed to join walk:', error);
        res.status(500).json({ message: 'Unable to join walk request.' });
    }
});


//Moving buddy/escort

/**
 * @api {get} /api/walks/:id Get Single Walk Details
 * @description Retrieves all details for a specific walk, including location.
 */
app.get('/api/walks/:id', (req, res) => {
    const walkId = parseInt(req.params.id);
    try {
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
        console.error('Failed to load walk details:', error);
        res.status(500).json({ message: 'Unable to load walk details.' });
    }
});

/**
 * @api {post} /api/walks/:id/sos Trigger S.O.S.
 * @description Logs an emergency event for an active walk.
 */
app.post('/api/walks/:id/sos', (req, res) => {
    const walkId = parseInt(req.params.id);
    const walk = getWalkRequestById(walkId);
    if(walk){
        console.log(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
        console.log(`!!! S.O.S. ACTIVATED FOR WALK #${walkId} !!!`);
        console.log(`!!! User: ${walk.userId}, Buddy: ${walk.buddyId}`);
        console.log(`!!! Last known location: ${walk.route.buddyCurrentCoords}`);
        console.log(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);
        res.status(200).json({ message: 'S.O.S. signal received. Campus police have been notified!' });
    } else {
        res.status(404).json({ message: 'Walk not found.' });
    }
});

/**
 * @api {post} /api/walks/:id/complete Mark Walk as Complete
 * @description Marks a walk as completed.
 */
app.post('/api/walks/:id/complete', (req, res) => {
    const walkId = parseInt(req.params.id);
    try {
        const walk = getWalkRequestById(walkId);
        if (!walk) {
            return res.status(404).json({ message: 'Walk not found.' });
        }

        const completedWalk = completeWalkRequest(walkId);
        res.status(200).json({ message: 'Walk marked as complete. Thank you!', walk: completedWalk });
    } catch (error) {
        console.error('Failed to complete walk:', error);
        res.status(500).json({ message: 'Unable to complete walk.' });
    }
});

// Route catalogue endpoints
app.get('/api/routes', (req, res) => {
    const { start, destination } = req.query;

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
        console.error('Failed to load routes:', error);
        res.status(500).json({ message: 'Unable to load route information.' });
    }
});

// Message endpoints
app.get('/api/messages', (req, res) => {
    try {
        const messages = getMessages();
        res.json(messages);
    } catch (error) {
        console.error('Failed to load messages:', error);
        res.status(500).json({ message: 'Unable to load saved messages.' });
    }
});

app.post('/api/messages', (req, res) => {
    const { message, startLocation, destination } = req.body;

    try {
        const savedMessage = saveMessage({
            message,
            startLocationName: startLocation,
            destinationLocationName: destination,
        });

        res.status(201).json(savedMessage);
    } catch (error) {
        console.error('Failed to save message:', error);
        res.status(400).json({ message: error.message || 'Unable to save message.' });
    }
});

// Return ONE random message, optionally filtered by start/destination (names)
app.get('/api/messages/random', (req, res) => {
    try {
      const { start, destination } = req.query;
      const all = getMessages(); // same source as /api/messages
  
      // getMessages() returns objects with { message, startLocation, destination } already joined
      const filtered = all.filter(m =>
        (start ? m.startLocation === start : true) &&
        (destination ? m.destination === destination : true)
      );
  
      if (filtered.length === 0) return res.json(null);
  
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      return res.json(pick);
    } catch (error) {
      console.error('Failed to get random message:', error);
      res.status(500).json({ message: 'Unable to load a random message.' });
    }
  });
  

app.listen(port, () => {
  console.log(`MavWalk server (v3) listening at http://localhost:${port}`);
});
