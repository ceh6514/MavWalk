const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

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
  let formattedSql = '';
  let paramIndex = 0;
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (char === "'") {
      formattedSql += char;

      if (inSingleQuote) {
        if (i + 1 < sql.length && sql[i + 1] === "'") {
          formattedSql += "'";
          i += 1;
        } else {
          inSingleQuote = false;
        }
      } else {
        inSingleQuote = true;
      }

      continue;
    }

    if (char === '?' && !inSingleQuote) {
      if (paramIndex >= params.length) {
        throw new Error('Not enough parameters supplied for SQL statement.');
      }

      formattedSql += escapeValue(params[paramIndex]);
      paramIndex += 1;
      continue;
    }

    formattedSql += char;
  }

  if (paramIndex < params.length) {
    throw new Error('Too many parameters supplied for SQL statement.');
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

const executeInsertAndGetId = (sql, params = []) => {
  const formattedSql = formatSql(sql, params);
  const wrappedSql = `BEGIN; ${formattedSql}; SELECT last_insert_rowid() AS id; COMMIT;`;
  const result = spawnSync('sqlite3', ['-json', databasePath, wrappedSql], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'SQLite insert failed.');
  }

  const trimmedOutput = result.stdout.trim();
  if (!trimmedOutput) {
    throw new Error('Failed to retrieve inserted row id.');
  }

  const [row] = JSON.parse(trimmedOutput);
  return row ? row.id : null;
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
  { name: 'Arlington Hall', latitude: 32.730256, longitude: -97.106284 },
  { name: 'Business Building', latitude: 32.731143, longitude: -97.111431 },
  { name: 'Central Library', latitude: 32.729913, longitude: -97.112907 },
  { name: 'College Park Center', latitude: 32.730652, longitude: -97.108038 },
  { name: 'Engineering Research Building', latitude: 32.733442, longitude: -97.113229 },
  { name: 'Fine Arts Building', latitude: 32.730504, longitude: -97.115139 },
  { name: 'Maverick Activities Center', latitude: 32.731954, longitude: -97.116912 },
  { name: 'Nedderman Hall', latitude: 32.732161, longitude: -97.113876 },
  { name: 'Science Hall', latitude: 32.73047, longitude: -97.112021 },
  { name: 'Science & Engineering Innovation & Research Building', latitude: 32.733054, longitude: -97.110284 },
  { name: 'University Center', latitude: 32.731661, longitude: -97.110999 },
];

const routeSeedData = [
  {
    start: 'Central Library',
    destination: 'Maverick Activities Center',
    eta: '7 minutes',
    summary: 'Curated walk from Central Library to Maverick Activities Center. Estimated travel time: 7 minutes.',
    pathCoordinates: [
      [32.729913, -97.112907],
      [32.73035, -97.11385],
      [32.73078, -97.11473],
      [32.73138, -97.11572],
      [32.73186, -97.11645],
      [32.731954, -97.116912],
    ],
    steps: [
      'Exit the Central Library toward the west plaza.',
      'Follow the promenade alongside the water fountain and continue up the ramp.',
      'Stay on the path as it curves past the Fine Arts Building.',
      'Keep left at the green space toward the Activity Center lawn.',
      'Enter the Maverick Activities Center near the glass façade.',
    ],
  },
  {
    start: 'Central Library',
    destination: 'Science & Engineering Innovation & Research Building',
    eta: '6 minutes',
    summary: 'Curated walk from Central Library to SEIR. Estimated travel time: 6 minutes.',
    pathCoordinates: [
      [32.729913, -97.112907],
      [32.730302, -97.11221],
      [32.73092, -97.11155],
      [32.73165, -97.11105],
      [32.73244, -97.11066],
      [32.733054, -97.110284],
    ],
    steps: [
      'Leave the library through the east entrance toward the mall.',
      'Head north, keeping the Planetarium on your left.',
      'Continue straight toward the bridge that crosses Cooper Street.',
      'Cross the bridge and stay on the elevated walkway.',
      'SEIR is the glass building ahead on your right.',
    ],
  },
  {
    start: 'Central Library',
    destination: 'Science Hall',
    eta: '4 minutes',
    summary: 'Curated walk from Central Library to Science Hall. Estimated travel time: 4 minutes.',
    pathCoordinates: [
      [32.729913, -97.112907],
      [32.73019, -97.11246],
      [32.73036, -97.11219],
      [32.73047, -97.112021],
    ],
    steps: [
      'Walk east across the library mall toward the Planetarium.',
      'Follow the sidewalk as it angles slightly north.',
      'Keep to the right of the Planetarium lawn.',
      'Science Hall is the brick building just ahead on your left.',
    ],
  },
  {
    start: 'Science & Engineering Innovation & Research Building',
    destination: 'Nedderman Hall',
    eta: '5 minutes',
    summary: 'Curated walk from SEIR to Nedderman Hall. Estimated travel time: 5 minutes.',
    pathCoordinates: [
      [32.733054, -97.110284],
      [32.73302, -97.11115],
      [32.73286, -97.11215],
      [32.73248, -97.11302],
      [32.732161, -97.113876],
    ],
    steps: [
      'Exit SEIR toward the central courtyard.',
      'Head west across the bridge toward the Life Science Building.',
      'Continue straight as the sidewalk bends toward the engineering complex.',
      'Cross the service drive and stay on the shaded path.',
      'Nedderman Hall is the large building on your left.',
    ],
  },
  {
    start: 'Maverick Activities Center',
    destination: 'University Center',
    eta: '8 minutes',
    summary: 'Curated walk from Maverick Activities Center to University Center. Estimated travel time: 8 minutes.',
    pathCoordinates: [
      [32.731954, -97.116912],
      [32.73172, -97.11624],
      [32.73137, -97.11535],
      [32.73116, -97.11433],
      [32.73105, -97.11341],
      [32.73128, -97.11245],
      [32.731661, -97.110999],
    ],
    steps: [
      'Leave the MAC through the main entrance toward the pedestrian mall.',
      'Continue east, keeping the Intramural Fields to your right.',
      'Follow the walkway past the Science & Engineering buildings.',
      'Stay straight as the path descends toward Cooper Street.',
      'Cross the plaza in front of the University Center and head inside.',
    ],
  },
  {
    start: 'University Center',
    destination: 'College Park Center',
    eta: '7 minutes',
    summary: 'Curated walk from University Center to College Park Center. Estimated travel time: 7 minutes.',
    pathCoordinates: [
      [32.731661, -97.110999],
      [32.73145, -97.11031],
      [32.73101, -97.10935],
      [32.73073, -97.10866],
      [32.730652, -97.108038],
    ],
    steps: [
      'Exit the University Center facing Spaniolo Drive.',
      'Head south toward the College Park District.',
      'Follow the sidewalk past the West Campus Library.',
      'Continue straight toward the arena plaza.',
      'Enter College Park Center at the main rotunda.',
    ],
  },
  {
    start: 'College Park Center',
    destination: 'Science Hall',
    eta: '6 minutes',
    summary: 'Curated walk from College Park Center to Science Hall. Estimated travel time: 6 minutes.',
    pathCoordinates: [
      [32.730652, -97.108038],
      [32.73087, -97.1092],
      [32.731, -97.11048],
      [32.7308, -97.11173],
      [32.73047, -97.112021],
    ],
    steps: [
      'Leave College Park Center toward Spaniolo Drive.',
      'Cross Center Street and continue west.',
      'Follow the tree-lined sidewalk up the gentle hill.',
      'Keep straight as you pass the University Center courtyard.',
      'Science Hall is on the corner just ahead.',
    ],
  },
  {
    start: 'Engineering Research Building',
    destination: 'Fine Arts Building',
    eta: '8 minutes',
    summary: 'Curated walk from Engineering Research Building to Fine Arts Building. Estimated travel time: 8 minutes.',
    pathCoordinates: [
      [32.733442, -97.113229],
      [32.73298, -97.11334],
      [32.73245, -97.11375],
      [32.73193, -97.11451],
      [32.73127, -97.11504],
      [32.730504, -97.115139],
    ],
    steps: [
      'Exit ERB onto the engineering mall and head south.',
      'Continue toward the Architecture Building courtyard.',
      'Stay on the shaded pathway beside Woolf Hall.',
      'Cross Mitchell Street and keep the planetarium dome in sight.',
      'Fine Arts is the building with the large mural on your right.',
    ],
  },
  {
    start: 'Fine Arts Building',
    destination: 'Business Building',
    eta: '5 minutes',
    summary: 'Curated walk from Fine Arts Building to Business Building. Estimated travel time: 5 minutes.',
    pathCoordinates: [
      [32.730504, -97.115139],
      [32.73064, -97.11454],
      [32.73087, -97.11387],
      [32.73105, -97.11318],
      [32.731143, -97.111431],
    ],
    steps: [
      'Leave the Fine Arts patio heading east toward the library mall.',
      'Stay on the sidewalk that parallels the Planetarium lawn.',
      'Continue past the Central Library entrance.',
      'Follow the path as it curves toward the College of Business.',
      'The Business Building entrance faces the fountain courtyard.',
    ],
  },
  {
    start: 'Arlington Hall',
    destination: 'Central Library',
    eta: '9 minutes',
    summary: 'Curated walk from Arlington Hall to Central Library. Estimated travel time: 9 minutes.',
    pathCoordinates: [
      [32.730256, -97.106284],
      [32.73037, -97.10738],
      [32.73046, -97.10864],
      [32.7305, -97.10992],
      [32.73032, -97.11102],
      [32.729913, -97.112907],
    ],
    steps: [
      'Start at Arlington Hall and walk west toward Spaniolo Drive.',
      'Cross the light at Spaniolo and continue straight toward campus.',
      'Follow the sidewalk past the College Park district.',
      'Continue along the tree-lined mall toward the library fountain.',
      'Enter the Central Library at the main plaza.',
    ],
  },
];

const routeMessageSeedData = [
  {
    start: 'Central Library',
    destination: 'Maverick Activities Center',
    messages: [
      'Need a buddy from Central Library to the MAC—anyone up for a quick workout?',
      'Heading to the MAC from the library. Could use some company along the way!',
      'Library study session is done—walking to the MAC if anyone wants to join.',
      'Looking for a safe walk from Central Library to the MAC. Meet me by the fountain?',
    ],
  },
  {
    start: 'Central Library',
    destination: 'Science & Engineering Innovation & Research Building',
    messages: [
      'Walking to SEIR from the library for lab—walk with me?',
      'Need a partner from Central Library to SEIR. Leaving in five minutes!',
      'Anyone heading toward SEIR from the library? Let’s walk together.',
      'Looking for a study buddy en route from Central Library to SEIR.',
    ],
  },
  {
    start: 'Central Library',
    destination: 'Science Hall',
    messages: [
      'Quick walk from Central Library to Science Hall—join me?',
      'Heading to Science Hall from the library before class. Company appreciated!',
      'Leaving the library for Science Hall. Walk buddy wanted!',
      'Need a safe walk from Central Library to Science Hall. Meet near the front steps.',
    ],
  },
  {
    start: 'Science & Engineering Innovation & Research Building',
    destination: 'Nedderman Hall',
    messages: [
      'Walking from SEIR to Nedderman for a group meeting—come along?',
      'Headed to Nedderman from SEIR. Would love a walking buddy!',
      'Anyone else going from SEIR to Nedderman Hall? Let’s link up.',
      'Need a partner for the short walk from SEIR over to Nedderman.',
    ],
  },
  {
    start: 'Maverick Activities Center',
    destination: 'University Center',
    messages: [
      'Leaving the MAC for the UC—walk with me?',
      'Looking for company from MAC to UC after my workout.',
      'Heading toward University Center from MAC. Anyone else going that way?',
      'MAC to UC stroll—seeking a buddy for the evening walk.',
    ],
  },
  {
    start: 'University Center',
    destination: 'College Park Center',
    messages: [
      'Walking from UC to College Park Center for the game—join up!',
      'Anyone heading to College Park Center from UC? Let’s walk together.',
      'UC to CPC in a few—looking for a walking partner.',
      'Need a safe walk from University Center to CPC. Meet at the main entrance?',
    ],
  },
  {
    start: 'College Park Center',
    destination: 'Science Hall',
    messages: [
      'Leaving College Park Center for Science Hall—company welcome!',
      'Walking to Science Hall from CPC after the event. Join me?',
      'Need a buddy from College Park Center to Science Hall. Heading out soon.',
      'Taking the route from CPC to Science Hall—let’s walk together.',
    ],
  },
  {
    start: 'Engineering Research Building',
    destination: 'Fine Arts Building',
    messages: [
      'Heading from ERB to Fine Arts for rehearsal—walk buddy wanted.',
      'Need a partner for the walk from ERB to the Fine Arts Building.',
      'Walking ERB to Fine Arts—anyone else going that way?',
      'Leaving ERB now and heading to Fine Arts. Join me for the walk?',
    ],
  },
  {
    start: 'Fine Arts Building',
    destination: 'Business Building',
    messages: [
      'Fine Arts to Business Building walk—who’s coming?',
      'Heading toward the Business Building from Fine Arts. Looking for company!',
      'Need a safe walk from Fine Arts to Business Building—meet outside the lobby?',
      'Walking from the mural at Fine Arts over to the Business Building. Join in!',
    ],
  },
  {
    start: 'Arlington Hall',
    destination: 'Central Library',
    messages: [
      'Leaving Arlington Hall for the library—walk with me?',
      'Need a buddy from Arlington Hall to Central Library this evening.',
      'Heading toward Central Library from Arlington Hall. Company appreciated!',
      'Looking for a safe walk from Arlington Hall to the library fountain.',
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
  campusLocationSeedData.forEach((location) => {
    execute(
      `INSERT INTO locations (name, latitude, longitude)
       VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude`,
      [location.name, location.latitude, location.longitude]
    );
  });
};

const seedRoutes = () => {
  routeSeedData.forEach((route) => {
    const startLocation = getLocationByName(route.start);
    const destinationLocation = getLocationByName(route.destination);

    if (!startLocation || !destinationLocation) {
      return;
    }

    const existingRoute = querySingle(
      'SELECT id FROM routes WHERE start_location_id = ? AND end_location_id = ?',
      [startLocation.id, destinationLocation.id]
    );

    let routeId = null;

    if (existingRoute) {
      routeId = existingRoute.id;
      execute('UPDATE routes SET eta = ?, summary = ? WHERE id = ?', [route.eta, route.summary, routeId]);
    } else {
      const insertedRoute = querySingle(
        'INSERT INTO routes (start_location_id, end_location_id, eta, summary) VALUES (?, ?, ?, ?) RETURNING id',
        [startLocation.id, destinationLocation.id, route.eta, route.summary]
      );
      routeId = insertedRoute.id;
    }

    if (!routeId) {
      return;
    }

    const coordinateCount = (route.pathCoordinates || []).length;
    const stepCount = (route.steps || []).length;

    (route.pathCoordinates || []).forEach(([latitude, longitude], index) => {
      execute(
        `INSERT INTO route_coordinates (route_id, point_index, latitude, longitude)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(route_id, point_index)
         DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude`,
        [routeId, index, latitude, longitude]
      );
    });

    if (coordinateCount === 0) {
      execute('DELETE FROM route_coordinates WHERE route_id = ?', [routeId]);
    } else {
      execute('DELETE FROM route_coordinates WHERE route_id = ? AND point_index >= ?', [routeId, coordinateCount]);
    }

    (route.steps || []).forEach((instruction, index) => {
      execute(
        `INSERT INTO route_steps (route_id, step_number, instruction)
         VALUES (?, ?, ?)
         ON CONFLICT(route_id, step_number)
         DO UPDATE SET instruction = excluded.instruction`,
        [routeId, index + 1, instruction]
      );
    });

    if (stepCount === 0) {
      execute('DELETE FROM route_steps WHERE route_id = ?', [routeId]);
    } else {
      execute('DELETE FROM route_steps WHERE route_id = ? AND step_number > ?', [routeId, stepCount]);
    }
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

const seedMessages = () => {
  routeMessageSeedData.forEach(({ start, destination, messages }) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }

    const startLocation = getLocationByName(start);
    const destinationLocation = getLocationByName(destination);
    const route = startLocation && destinationLocation
      ? getRouteBetweenLocations(start, destination)
      : null;

    if (!startLocation || !destinationLocation) {
      return;
    }

    messages.forEach((messageText) => {
      const trimmedMessage = typeof messageText === 'string' ? messageText.trim() : '';

      if (!trimmedMessage) {
        return;
      }

      const existingMessage = querySingle(
        `SELECT id FROM messages WHERE message = ? AND start_location_id = ? AND end_location_id = ?`,
        [trimmedMessage, startLocation.id, destinationLocation.id]
      );

      if (existingMessage) {
        return;
      }

      querySingle(
        `INSERT INTO messages (message, route_id, start_location_id, end_location_id) VALUES (?, ?, ?, ?) RETURNING id`,
        [
          trimmedMessage,
          route ? route.id : null,
          startLocation.id,
          destinationLocation.id,
        ]
      );
    });
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_routes_start_end
      ON routes (start_location_id, end_location_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_route_coordinates_point
      ON route_coordinates (route_id, point_index);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_route_steps_number
      ON route_steps (route_id, step_number);

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
  seedMessages();
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
    throw new ValidationError('userId, startLocation, and destination are required.');
  }

  const startLocation = getLocationByName(startLocationName);
  const destinationLocation = getLocationByName(destinationLocationName);

  if (!startLocation || !destinationLocation) {
    throw new ValidationError('Unable to find start or destination location.');
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
    throw new ValidationError('Message content is required.');
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
  ValidationError,
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
  __test__: {
    formatSql,
  },
};
