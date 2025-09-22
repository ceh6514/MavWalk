# MavWalk
An application made to empower every UTA student to navigate campus with confidence and peace of mind by instantly connecting them with a trusted network of student and officer walking partners.
Engineers: Cleona Hua, Jaafar Alumary, Paul Dang, Saina Shrestha


--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
This is the backend server for the MavWalk application, built with Node.js and Express.

Setup Instructions
Install Node.js: If you don't have it, download and install Node.js from nodejs.org.

Install Dependencies: Open your terminal in the project directory (where package.json is located) and run the following command. This will install Express and other necessary packages.

npm install

Running the Server
Start the Server: To start the server, run the following command in your terminal:

node server.js

You should see a message confirming that the server is running:

MavWalk server listening at http://localhost:3001

The server is now running and ready to accept API requests from your frontend application.



--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
MavWalk Frontend
This is the frontend for the MavWalk application, built with React and Vite.

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