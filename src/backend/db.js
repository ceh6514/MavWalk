const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const dataDirectory = path.join(__dirname, 'data');
if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, 'mavwalk.db');

const escapeValue = (value) => {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
};

const formatSql = (sql, params) => {
  let formattedSql = sql;
  params.forEach((param) => {
    const placeholderIndex = formattedSql.indexOf('?');
    if (placeholderIndex === -1) {
      throw new Error('Too many parameters supplied for SQL statement.');
    }
    formattedSql = `${formattedSql.slice(0, placeholderIndex)}${escapeValue(param)}${formattedSql.slice(placeholderIndex + 1)}`;
  });

  if (formattedSql.includes('?')) {
    throw new Error('Not enough parameters supplied for SQL statement.');
  }

  return formattedSql;
};

const execute = (sql, params = []) => {
  const formattedSql = formatSql(sql, params);
  const result = spawnSync('sqlite3', [databasePath, formattedSql], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'SQLite command failed.');
  }
};

const query = (sql, params = []) => {
  const formattedSql = formatSql(sql, params);
  const result = spawnSync('sqlite3', ['-json', databasePath, formattedSql], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'SQLite query failed.');
  }

  const trimmedOutput = result.stdout.trim();
  if (!trimmedOutput) {
    return [];
  }

  return JSON.parse(trimmedOutput);
};

const querySingle = (sql, params = []) => {
  const [first] = query(sql, params);
  return first || null;
};

const campusLocationSeedData = [
  { name: 'Central Library', latitude: 32.72991314809259, longitude: -97.11290672883602 },
  { name: 'College Park Center', latitude: 32.730652363101214, longitude: -97.10803828570232 },
  { name: 'Engineering Research Building', latitude: 32.73344190653296, longitude: -97.11322886238746 },
  { name: 'Fine Arts Building', latitude: 32.73050397086501, longitude: -97.11513947404578 },
  { name: 'Maverick Activities Center', latitude: 32.73195397555977, longitude: -97.11691204643674 },
  { name: 'Science Hall', latitude: 32.73048850678233, longitude: -97.11365621515012 },
  { name: 'University Center', latitude: 32.73166137076197, longitude: -97.11099924459786 },
];

const routeSeedData = [
  {
    start: 'Central Library',
    destination: 'Maverick Activities Center',
    eta: '7 minutes',
    summary: 'Curated walk from Central Library to Maverick Activities Center. Estimated travel time: 7 minutes.',
    pathCoordinates: [
      [32.7296, -97.1131],
      [32.7293, -97.1142],
      [32.7289, -97.1154],
      [32.7282, -97.1167],
    ],
    steps: [
      'Exit the Central Library toward the west plaza.',
      'Go straight until you get on the bridge connecting to the Fine Arts Building.',
      'Continue past the building and take a right',
      'The Maverick Activities Center is on your left with giant glass windows.',
    ],
  },
  {
    start: 'College Park Center',
    destination: 'Science Hall',
    eta: '6 minutes',
    summary: 'Curated walk from College Park Center to Science Hall. Estimated travel time: 6 minutes.',
    pathCoordinates: [
      [32.7323, -97.1056],
      [32.7315, -97.1078],
      [32.7306, -97.1102],
      [32.7297, -97.1124],
    ],
    steps: [
      'Leave College Park Center and head northwest toward Spaniolo Drive.',
      'Turn left on Spaniolo Drive and continue straight.',
      'Cross UTA Boulevard and keep following Spaniolo Drive.',
      'Science Hall is on the right—enter through the south entrance.',
    ],
  },
  {
    start: 'Engineering Research Building',
    destination: 'Fine Arts Building',
    eta: '8 minutes',
    summary: 'Curated walk from Engineering Research Building to Fine Arts Building. Estimated travel time: 8 minutes.',
    pathCoordinates: [
      [32.732, -97.1114],
      [32.7316, -97.1128],
      [32.7314, -97.1147],
      [32.731, -97.1171],
    ],
    steps: [
      'Exit the Engineering Research Building toward the courtyard.',
      'Follow the path west along West Mitchell Street.',
      'Continue straight past the Architecture Building.',
      'The Fine Arts Building is ahead on the left—enter through the main lobby.',
    ],
  },
  {
    start: 'University Center',
    destination: 'Central Library',
    eta: '4 minutes',
    summary: 'Curated walk from University Center to Central Library. Estimated travel time: 4 minutes.',
    pathCoordinates: [
      [32.7312, -97.1109],
      [32.7308, -97.1118],
      [32.7302, -97.1126],
      [32.7296, -97.1131],
    ],
    steps: [
      'Leave the University Center heading west toward Cooper Street.',
      'Turn slightly right and follow the path toward the Central Library mall.',
      'Continue straight until you reach the library plaza.',
      'Enter the Central Library through the front doors.',
    ],
  },
];

const seedUsers = () => {
  const existingUsers = querySingle('SELECT COUNT(1) AS count FROM users');
  if (existingUsers && existingUsers.count > 0) {
    return;
  }

  execute(
    `INSERT INTO users (email, password, name)
     VALUES
       ('jdoe@uta.edu', 'password123', 'Jane Doe'),
       ('slowell@uta.edu', 'password123', 'Seth Lowell')`
  );
};

const seedLocations = () => {
  const existingLocations = querySingle('SELECT COUNT(1) AS count FROM locations');
  if (existingLocations && existingLocations.count > 0) {
    return;
  }

  campusLocationSeedData.forEach((location) => {
    execute(
      'INSERT INTO locations (name, latitude, longitude) VALUES (?, ?, ?)',
      [location.name, location.latitude, location.longitude]
    );
  });
};

const seedRoutes = () => {
  const existingRoutes = querySingle('SELECT COUNT(1) AS count FROM routes');
  if (existingRoutes && existingRoutes.count > 0) {
    return;
  }

  routeSeedData.forEach((route) => {
    const startLocation = getLocationByName(route.start);
    const destinationLocation = getLocationByName(route.destination);

    if (!startLocation || !destinationLocation) {
      return;
    }

    const insertedRoute = querySingle(
      'INSERT INTO routes (start_location_id, end_location_id, eta, summary) VALUES (?, ?, ?, ?) RETURNING id',
      [startLocation.id, destinationLocation.id, route.eta, route.summary]
    );

    const insertedRouteId = insertedRoute.id;

    route.pathCoordinates.forEach(([latitude, longitude], index) => {
      execute(
        'INSERT INTO route_coordinates (route_id, point_index, latitude, longitude) VALUES (?, ?, ?, ?)',
        [insertedRouteId, index, latitude, longitude]
      );
    });

    route.steps.forEach((instruction, index) => {
      execute(
        'INSERT INTO route_steps (route_id, step_number, instruction) VALUES (?, ?, ?)',
        [insertedRouteId, index + 1, instruction]
      );
    });
  });
};

const seedWalkRequests = () => {
  const existingWalks = querySingle('SELECT COUNT(1) AS count FROM walk_requests');
  if (existingWalks && existingWalks.count > 0) {
    return;
  }

  const walkSeedData = [
    {
      userEmail: 'jdoe@uta.edu',
      start: 'Central Library',
      destination: 'University Center',
    },
    {
      userEmail: 'slowell@uta.edu',
      start: 'College Park Center',
      destination: 'Maverick Activities Center',
    },
  ];

  walkSeedData.forEach((walk) => {
    const user = querySingle('SELECT id FROM users WHERE email = ?', [walk.userEmail]);
    const startLocation = getLocationByName(walk.start);
    const destinationLocation = getLocationByName(walk.destination);
    const route = getRouteBetweenLocations(walk.start, walk.destination);

    if (!user || !startLocation || !destinationLocation) {
      return;
    }

    execute(
      `INSERT INTO walk_requests (
         user_id,
         route_id,
         start_location_id,
         end_location_id,
         status,
         buddy_id,
         buddy_latitude,
         buddy_longitude,
         eta
       ) VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?, ?)` ,
      [
        user.id,
        route ? route.id : null,
        startLocation.id,
        destinationLocation.id,
        startLocation.latitude,
        startLocation.longitude,
        route ? route.eta : '7 minutes',
      ]
    );
  });
};

const initializeDatabase = () => {
  execute(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_location_id INTEGER NOT NULL,
      end_location_id INTEGER NOT NULL,
      eta TEXT,
      summary TEXT,
      FOREIGN KEY(start_location_id) REFERENCES locations(id),
      FOREIGN KEY(end_location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS route_coordinates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      point_index INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      FOREIGN KEY(route_id) REFERENCES routes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS route_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      FOREIGN KEY(route_id) REFERENCES routes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS walk_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      route_id INTEGER,
      start_location_id INTEGER NOT NULL,
      end_location_id INTEGER NOT NULL,
      request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      buddy_id INTEGER,
      buddy_latitude REAL,
      buddy_longitude REAL,
      eta TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(route_id) REFERENCES routes(id),
      FOREIGN KEY(start_location_id) REFERENCES locations(id),
      FOREIGN KEY(end_location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER,
      start_location_id INTEGER,
      end_location_id INTEGER,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(route_id) REFERENCES routes(id),
      FOREIGN KEY(start_location_id) REFERENCES locations(id),
      FOREIGN KEY(end_location_id) REFERENCES locations(id)
    );
  `);

  seedUsers();
  seedLocations();
  seedRoutes();
  seedWalkRequests();
};

const getLocationByName = (name) => {
  if (!name) {
    return null;
  }

  return querySingle(
    'SELECT id, name, latitude, longitude FROM locations WHERE name = ?',
    [name]
  );
};

const buildRouteDetails = (routeRow) => {
  if (!routeRow) {
    return null;
  }

  const coordinates = query(
    'SELECT latitude, longitude FROM route_coordinates WHERE route_id = ? ORDER BY point_index ASC',
    [routeRow.id]
  ).map((coordinate) => [coordinate.latitude, coordinate.longitude]);

  const steps = query(
    'SELECT instruction FROM route_steps WHERE route_id = ? ORDER BY step_number ASC',
    [routeRow.id]
  ).map((step) => step.instruction);

  return {
    id: routeRow.id,
    startLocation: routeRow.startLocation,
    destination: routeRow.destination,
    startCoordinates: [routeRow.startLatitude, routeRow.startLongitude],
    destinationCoordinates: [routeRow.endLatitude, routeRow.endLongitude],
    pathCoordinates: coordinates,
    eta: routeRow.eta,
    summary: routeRow.summary,
    steps,
  };
};

const getRouteBetweenLocations = (start, destination) => {
  if (!start || !destination) {
    return null;
  }

  const routeRow = querySingle(
    `SELECT
       r.id,
       s.name AS startLocation,
       s.latitude AS startLatitude,
       s.longitude AS startLongitude,
       e.name AS destination,
       e.latitude AS endLatitude,
       e.longitude AS endLongitude,
       r.eta,
       r.summary
     FROM routes r
     INNER JOIN locations s ON r.start_location_id = s.id
     INNER JOIN locations e ON r.end_location_id = e.id
     WHERE s.name = ? AND e.name = ?`,
    [start, destination]
  );

  return buildRouteDetails(routeRow);
};

const getRouteById = (routeId) => {
  if (!routeId) {
    return null;
  }

  const routeRow = querySingle(
    `SELECT
       r.id,
       s.name AS startLocation,
       s.latitude AS startLatitude,
       s.longitude AS startLongitude,
       e.name AS destination,
       e.latitude AS endLatitude,
       e.longitude AS endLongitude,
       r.eta,
       r.summary
     FROM routes r
     INNER JOIN locations s ON r.start_location_id = s.id
     INNER JOIN locations e ON r.end_location_id = e.id
     WHERE r.id = ?`,
    [routeId]
  );

  return buildRouteDetails(routeRow);
};

const getAllRoutes = () => {
  const routeRows = query(`
    SELECT
      r.id,
      s.name AS startLocation,
      s.latitude AS startLatitude,
      s.longitude AS startLongitude,
      e.name AS destination,
      e.latitude AS endLatitude,
      e.longitude AS endLongitude,
      r.eta,
      r.summary
    FROM routes r
    INNER JOIN locations s ON r.start_location_id = s.id
    INNER JOIN locations e ON r.end_location_id = e.id
    ORDER BY s.name, e.name
  `);

  return routeRows.map((row) => buildRouteDetails(row));
};

const findUserByCredentials = (email, password) => {
  if (!email || !password) {
    return null;
  }

  return querySingle(
    'SELECT id, email, name FROM users WHERE email = ? AND password = ?',
    [email, password]
  );
};

const buildWalkResponse = (row) => {
  if (!row) {
    return null;
  }

  const routeDetails = row.routeId ? getRouteById(row.routeId) : null;
  const buddyLatitude = row.buddyLatitude !== null && row.buddyLatitude !== undefined ? row.buddyLatitude : row.startLatitude;
  const buddyLongitude = row.buddyLongitude !== null && row.buddyLongitude !== undefined ? row.buddyLongitude : row.startLongitude;

  return {
    id: row.id,
    userId: row.userId,
    startLocation: row.startLocation,
    destination: row.destination,
    requestTime: row.requestTime,
    status: row.status,
    buddyId: row.buddyId,
    eta: row.eta || (routeDetails ? routeDetails.eta : null),
    route: {
      startCoords: [row.startLatitude, row.startLongitude],
      endCoords: [row.endLatitude, row.endLongitude],
      buddyCurrentCoords: [buddyLatitude, buddyLongitude],
      pathCoordinates: routeDetails ? routeDetails.pathCoordinates : undefined,
      steps: routeDetails ? routeDetails.steps : undefined,
      summary: routeDetails ? routeDetails.summary : undefined,
    },
  };
};

const getPendingWalkRequests = () => {
  const rows = query(`
    SELECT
      wr.id,
      wr.user_id AS userId,
      wr.route_id AS routeId,
      start.name AS startLocation,
      start.latitude AS startLatitude,
      start.longitude AS startLongitude,
      destination.name AS destination,
      destination.latitude AS endLatitude,
      destination.longitude AS endLongitude,
      wr.request_time AS requestTime,
      wr.status,
      wr.buddy_id AS buddyId,
      wr.buddy_latitude AS buddyLatitude,
      wr.buddy_longitude AS buddyLongitude,
      wr.eta
    FROM walk_requests wr
    INNER JOIN locations start ON wr.start_location_id = start.id
    INNER JOIN locations destination ON wr.end_location_id = destination.id
    WHERE wr.status = 'pending'
    ORDER BY wr.request_time DESC
  `);

  return rows.map((row) => buildWalkResponse(row));
};

const getWalkRequestById = (walkId) => {
  const row = querySingle(`
    SELECT
      wr.id,
      wr.user_id AS userId,
      wr.route_id AS routeId,
      start.name AS startLocation,
      start.latitude AS startLatitude,
      start.longitude AS startLongitude,
      destination.name AS destination,
      destination.latitude AS endLatitude,
      destination.longitude AS endLongitude,
      wr.request_time AS requestTime,
      wr.status,
      wr.buddy_id AS buddyId,
      wr.buddy_latitude AS buddyLatitude,
      wr.buddy_longitude AS buddyLongitude,
      wr.eta
    FROM walk_requests wr
    INNER JOIN locations start ON wr.start_location_id = start.id
    INNER JOIN locations destination ON wr.end_location_id = destination.id
    WHERE wr.id = ?
  `, [walkId]);

  return buildWalkResponse(row);
};

const createWalkRequest = ({ userId, startLocationName, destinationLocationName }) => {
  if (!userId || !startLocationName || !destinationLocationName) {
    throw new Error('userId, startLocation, and destination are required.');
  }

  const startLocation = getLocationByName(startLocationName);
  const destinationLocation = getLocationByName(destinationLocationName);

  if (!startLocation || !destinationLocation) {
    throw new Error('Unable to find start or destination location.');
  }

  const route = getRouteBetweenLocations(startLocationName, destinationLocationName);
  const eta = route ? route.eta : '7 minutes';

  const insertedWalk = querySingle(
    `INSERT INTO walk_requests (
       user_id,
       route_id,
       start_location_id,
       end_location_id,
       status,
       buddy_id,
       buddy_latitude,
       buddy_longitude,
       eta
     ) VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?, ?) RETURNING id` ,
    [
      userId,
      route ? route.id : null,
      startLocation.id,
      destinationLocation.id,
      startLocation.latitude,
      startLocation.longitude,
      eta,
    ]
  );

  return getWalkRequestById(insertedWalk.id);
};

const joinWalkRequest = (walkId, buddyId) => {
  execute('UPDATE walk_requests SET status = ?, buddy_id = ? WHERE id = ?', ['active', buddyId, walkId]);
  return getWalkRequestById(walkId);
};

const updateWalkBuddyPosition = (walkId, latitude, longitude) => {
  execute(
    'UPDATE walk_requests SET buddy_latitude = ?, buddy_longitude = ? WHERE id = ?',
    [latitude, longitude, walkId]
  );
};

const completeWalkRequest = (walkId) => {
  execute('UPDATE walk_requests SET status = ? WHERE id = ?', ['completed', walkId]);
  return getWalkRequestById(walkId);
};

const getAllLocations = () => {
  return query('SELECT id, name, latitude, longitude FROM locations ORDER BY name ASC');
};

const saveMessage = ({ message, startLocationName, destinationLocationName }) => {
  if (!message || !message.trim()) {
    throw new Error('Message content is required.');
  }

  const startLocation = getLocationByName(startLocationName);
  const destinationLocation = getLocationByName(destinationLocationName);
  const route = startLocation && destinationLocation
    ? getRouteBetweenLocations(startLocationName, destinationLocationName)
    : null;

  const insertedMessage = querySingle(
    `INSERT INTO messages (message, route_id, start_location_id, end_location_id)
     VALUES (?, ?, ?, ?) RETURNING id` ,
    [
      message.trim(),
      route ? route.id : null,
      startLocation ? startLocation.id : null,
      destinationLocation ? destinationLocation.id : null,
    ]
  );

  return querySingle(
    `SELECT
       m.id,
       m.message,
       m.created_at AS createdAt,
       start.name AS startLocation,
       destination.name AS destination
     FROM messages m
     LEFT JOIN locations start ON start.id = m.start_location_id
     LEFT JOIN locations destination ON destination.id = m.end_location_id
     WHERE m.id = ?`,
    [insertedMessage.id]
  );
};

const getMessages = () => {
  return query(`
    SELECT
      m.id,
      m.message,
      m.created_at AS createdAt,
      start.name AS startLocation,
      destination.name AS destination
    FROM messages m
    LEFT JOIN locations start ON start.id = m.start_location_id
    LEFT JOIN locations destination ON destination.id = m.end_location_id
    ORDER BY m.created_at DESC
  `);
};

module.exports = {
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
  getRouteById,
  getAllRoutes,
  saveMessage,
  getMessages,
};
