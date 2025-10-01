//MavWalk backend

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Simple lookup for well-known campus locations so routes can have consistent coordinates.
const campusLocations = {
    'Central Library': { lat: 32.72991314809259, lon: -97.11290672883602 },
    'College Park Center': { lat: 32.730652363101214, lon: -97.10803828570232 },
    'Engineering Research Building': { lat: 32.73344190653296, lon: -97.11322886238746 },
    'Fine Arts Building': { lat: 32.73050397086501, lon: -97.11513947404578 },
    'Maverick Activities Center': { lat: 32.73195397555977, lon: -97.11691204643674 },
    'Science Hall': { lat: 32.73048850678233, lon: -97.11365621515012 },
    'University Center': { lat: 32.73166137076197, lon: -97.11099924459786 },
};

const DEFAULT_START_COORDS = [32.7300, -97.1145];
const DEFAULT_END_COORDS = [32.7325, -97.1120];

const getLocationCoords = (locationName) => {
    const coords = campusLocations[locationName];
    if (!coords) {
        return null;
    }
    return [coords.lat, coords.lon];
};

const buildRoute = (startLocation, destination) => {
    const startCoords = getLocationCoords(startLocation) || [...DEFAULT_START_COORDS];
    const endCoords = getLocationCoords(destination) || [...DEFAULT_END_COORDS];

    return {
        startCoords: [...startCoords],
        endCoords: [...endCoords],
        buddyCurrentCoords: [...startCoords],
    };
};

//In memory database
//We've added coordinates to simulate location tracking.
let users = [
    { id: 1, email: 'jdoe@uta.edu', password: 'password123', name: 'Jane Doe' }, //Test students
    { id: 2, email: 'slowell@uta.edu', password: 'password123', name: 'Seth Lowell' }
];
let walkRequests = [
    {
        id: 101,
        userId: 1,
        startLocation: 'Central Library',
        destination: 'University Center',
        requestTime: new Date(),
        status: 'pending', // pending -> active -> completed
        buddyId: null,
        // --- NEW: Location Data ---
        route: buildRoute('Central Library', 'University Center'),
        eta: '3 minutes'
    },
    {
        id: 102,
        userId: 2,
        startLocation: 'College Park Center',
        destination: 'Maverick Activities Center',
        requestTime: new Date(),
        status: 'pending',
        buddyId: null,
        route: buildRoute('College Park Center', 'Maverick Activities Center'),
        eta: '6 minutes'
    }
];
let nextWalkId = 103;

//API Endpoints

//A simple test route
app.get('/', (req, res) => res.send('MavWalk Backend Server is running!')); //SUCCESS MESSAGE!

//User login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json({ message: 'Login successful!', user: userWithoutPassword });
    } else {
        res.status(401).json({ message: 'Invalid credentials.' });
    }
});

//Get all pending walks
app.get('/api/walks', (req, res) => {
    const pendingWalks = walkRequests.filter(walk => walk.status === 'pending');
    res.json(pendingWalks);
});

//Return a list of known campus locations with coordinates so the frontend can render markers.
app.get('/api/locations', (req, res) => {
    const locations = Object.entries(campusLocations).map(([name, coords]) => ({
        name,
        coordinates: [coords.lat, coords.lon],
    }));
    res.json(locations);
});

//Creating a walk, place holder route used
app.post('/api/walks', (req, res) => {
    const { userId, startLocation, destination } = req.body;
    const newWalkRequest = {
        id: nextWalkId++,
        userId,
        startLocation,
        destination,
        requestTime: new Date(),
        status: 'pending',
        buddyId: null,
        //Add some default coordinates for new requests
        route: buildRoute(startLocation, destination),
        eta: '7 minutes'
    };
    walkRequests.push(newWalkRequest);
    res.status(201).json(newWalkRequest);
});

//Joining a walk
app.post('/api/walks/:id/join', (req, res) => {
    const walkId = parseInt(req.params.id);
    const { buddyId } = req.body;
    const walkRequest = walkRequests.find(w => w.id === walkId);

    if (walkRequest) {
        if (walkRequest.status === 'pending') {
            walkRequest.status = 'active';
            walkRequest.buddyId = buddyId;
            res.json({ message: 'Successfully joined the walk!', walk: walkRequest });
        } else {
            res.status(400).json({ message: 'This walk is no longer available.' });
        }
    } else {
        res.status(404).json({ message: 'Walk request not found.' });
    }
});


//Moving buddy/escort

/**
 * @api {get} /api/walks/:id Get Single Walk Details
 * @description Retrieves all details for a specific walk, including location.
 */
app.get('/api/walks/:id', (req, res) => {
    const walkId = parseInt(req.params.id);
    const walk = walkRequests.find(w => w.id === walkId);

    if (walk) {
        //Simulating the marker moving
        //This is a simple simulation. In a real app, the buddy's phone would send updates.
        //We'll just move the buddy slightly closer to the destination each time this is called.
        if (walk.status === 'active') {
             const [lat, lon] = walk.route.buddyCurrentCoords;
             const [endLat, endLon] = walk.route.endCoords;
             //Move half or 1/10th of the remaining distance
             walk.route.buddyCurrentCoords[0] += (endLat - lat) * 0.5; //.5 should go pretty fast
             walk.route.buddyCurrentCoords[1] += (endLon - lon) * 0.1; //.1 relatively speedy
        }
        res.json(walk);
    } else {
        res.status(404).json({ message: 'Walk not found.' });
    }
});

/**
 * @api {post} /api/walks/:id/sos Trigger S.O.S.
 * @description Logs an emergency event for an active walk.
 */
app.post('/api/walks/:id/sos', (req, res) => {
    const walkId = parseInt(req.params.id);
    const walk = walkRequests.find(w => w.id === walkId);
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
    const walk = walkRequests.find(w => w.id === walkId);
    if (walk) {
        walk.status = 'completed';
        res.status(200).json({ message: 'Walk marked as complete. Thank you!', walk });
    } else {
        res.status(404).json({ message: 'Walk not found.' });
    }
});


app.listen(port, () => {
  console.log(`MavWalk server (v3) listening at http://localhost:${port}`);
});
