# MavWalk
An application made to empower every UTA student to navigate campus with confidence and peace of mind by instantly connecting them with a trusted network of student and officer walking partners.
Engineers: Cleona Hua, Jaafar Alumary, Paul Dang, Saina Shrestha

To run the web-app (First time setup)
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1) Set up Backend Server
This is how to use the backend server for the MavWalk application, built with Node.js and Express.

Setup Instructions
Install Node.js: If you don't have it, download and install Node.js from nodejs.org.

Install Dependencies: Open your terminal in the project directory (where package.json is located) and run the following command. This will install Express and other necessary packages.

npm install

Running the Server
Start the Server: To start the server, run the following command in your terminal:

node server.js

You should see a message confirming that the server is running:

MavWalk server listening at http://localhost:3001


--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
2) Set up Frontend Server
This is how to use the frontend for the MavWalk application, built with React and Vite.

Setup Instructions
Install Node.js: If you don't already have it, download and install Node.js from nodejs.org. This will also install npm.

Navigate to the frontend Directory: Open your terminal and change your directory to be inside the frontend folder.

cd path/to/MavWalk/frontend

Install Dependencies: Run the following command to install React and all other necessary packages listed in package.json.

npm install

Running the Development Server
Start the Frontend: To run the React application in development mode, use the following command:

npm run dev

Your terminal will show you a local URL, usually http://localhost:5173. Open this URL in your web browser to see the application.

IMPORTANT: For the frontend to work correctly, you must also have the backend server running at the same time. Open a separate terminal window, navigate to the backend folder, and run node server.js.


--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
3) Go to http://localhost:5173


TL:DR
Start backend server in one terminal window via entering "npm install" in the terminal while you are in the "backend" folder, then when it is done, enter "node server.js"
Then start frontend server by also doing "npm install" but in the frontend->src folder (technically frontend/src), then entering "npm run dev" NOTE: Do this in another window of the terminal
Then, when those are both up, go into http://localhost:5173 and you will see it working!
