//MavWalk Backend Server

//Import necessary packages
const express = require('express');
const cors = require('cors');

//Initialize the Express app
const app = express();
const port = 3001; //Modifiable for any port we want!

//Middleware
app.use(cors()); //Enables Cross-Origin Resource Sharing, allowing frontend to communicate with this server
app.use(express.json()); //Allows the server to understand and parse JSON data from requests

//Here is the In-memory database
//This is a temporary substitute for a real database.
//It allows us to build and test the API endpoints without database setup.
//In a future iteration, we can replace this with a connection to a real database like PostgreSQL, MongoDB, or Firestore but TBD!
let users = [
    { id: 1, email: 'student1@uta.edu', password: 'password123', name: 'Alex Doe' },
    { id: 2, email: 'student2@uta.edu', password: 'password456', name: 'Jane Smith' }
];
let walkRequests = [
    { id: 101, userId: 1, startLocation: 'Library', destination: 'KC Hall', requestTime: new Date(), status: 'pending', buddyId: null },
    { id: 102, userId: 2, startLocation: 'SEIR Building', destination: 'Arlington Hall', requestTime: new Date(), status: 'pending', buddyId: null }
];
let nextWalkId = 103;


//API Endpoitns
//A simple test route to ensure the server is running
app.get('/', (req, res) => {
  res.send('MavWalk Backend Server is running!');
});

/**
 * @api {post} /api/login User Login
 * @description Authenticates a user based on email and password.
 * @param {string} email - User's UTA email.
 * @param {string} password - User's password.
 * @returns {object} User object if successful, or an error message.
 */
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        //In a real app, we would need to return a secure token (like a JWT) here.
        //For now, we will return the user object without the password.
        const { password, ...userWithoutPassword } = user;
        res.json({ message: 'Login successful!', user: userWithoutPassword });
    } else {
        res.status(401).json({ message: 'Invalid credentials.' });
    }
});

/**
 * @api {get} /api/walks Get All Walk Requests
 * @description Retrieves a list of all current walk requests.
 * @returns {array} A list of walk request objects.
 */
app.get('/api/walks', (req, res) => {
    //We will return only pending requests, as those are the ones available to be joined.
    const pendingWalks = walkRequests.filter(walk => walk.status === 'pending');
    res.json(pendingWalks);
});

/**
 * @api {post} /api/walks Create a Walk Request
 * @description Creates a new walk request for a logged-in user.
 * @param {number} userId - The ID of the user making the request.
 * @param {string} startLocation - The starting point of the walk.
 * @param {string} destination - The destination of the walk.
 * @returns {object} The newly created walk request object.
 */
app.post('/api/walks', (req, res) => {
    const { userId, startLocation, destination } = req.body;

    if (!userId || !startLocation || !destination) {
        return res.status(400).json({ message: 'Missing required fields for walk request.' });
    }

    const newWalkRequest = {
        id: nextWalkId++,
        userId,
        startLocation,
        destination,
        requestTime: new Date(),
        status: 'pending', //Status can be 'pending', 'active', 'completed'
        buddyId: null
    };

    walkRequests.push(newWalkRequest);
    res.status(201).json(newWalkRequest);
});

/**
 * @api {post} /api/walks/:id/join Join a Walk Request
 * @description Allows a user to accept/join an existing walk request.
 * @param {number} id - The ID of the walk request to join.
 * @param {number} buddyId - The ID of the user joining as a buddy.
 * @returns {object} The updated walk request object.
 */
app.post('/api/walks/:id/join', (req, res) => {
    const walkId = parseInt(req.params.id);
    const { buddyId } = req.body;

    if (!buddyId) {
        return res.status(400).json({ message: 'Buddy ID is required to join a walk.' });
    }

    const walkRequest = walkRequests.find(w => w.id === walkId);

    if (walkRequest) {
        if (walkRequest.status === 'pending') {
            walkRequest.status = 'active'; //The walk is now active with a buddy
            walkRequest.buddyId = buddyId;
            res.json({ message: 'Successfully joined the walk!', walk: walkRequest });
        } else {
            res.status(400).json({ message: 'This walk is no longer available.' });
        }
    } else {
        res.status(404).json({ message: 'Walk request not found.' });
    }
});


//Start the server and listen for incoming requests
app.listen(port, () => {
  console.log(`MavWalk server listening at http://localhost:${port}`);
});
