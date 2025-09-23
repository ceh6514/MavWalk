//MavWalk backend

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

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
        destination: 'Preston Hall', 
        requestTime: new Date(), 
        status: 'pending', // pending -> active -> completed
        buddyId: null,
        // --- NEW: Location Data ---
        route: {
            startCoords: [32.7296, -97.1131], // Central Library
            endCoords: [32.730911, -97.113221],   // Preston Hall
            buddyCurrentCoords: [32.7296, -97.1131] // Buddy starts at the start location
        },
        eta: '3 minutes'
    },
    { 
        id: 102, 
        userId: 2, 
        startLocation: 'SEIR Building', 
        destination: 'Pickhard Hall', 
        requestTime: new Date(), 
        status: 'pending', 
        buddyId: null,
        route: {
            startCoords: [32.7278, -97.1135], // SEIR
            endCoords: [32.7290, -97.1114],   // PKH
            buddyCurrentCoords: [32.7278, -97.1135]
        },
        eta: '2 minutes'
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
        route: {
            startCoords: [32.7300, -97.1145], //A random start point
            endCoords: [32.7325, -97.1120],   //Another end point
            buddyCurrentCoords: [32.7300, -97.1145]
        },
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
