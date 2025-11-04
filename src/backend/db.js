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
  { name: 'Arlington Hall', latitude: 32.7311085432566, longitude: -97.10943893455445 },
  { name: 'Business Building', latitude: 32.729722823761264, longitude: -97.11062181276046 },
  { name: 'Central Library', latitude: 32.72973218257906, longitude: -97.11288868672736 },
  { name: 'College Park Center', latitude: 32.730686125573584, longitude: -97.107987409975 },
  { name: 'Engineering Research Building', latitude: 32.73333488038476, longitude: -97.11330273623744 },
  { name: 'Fine Arts Building', latitude: 32.73125608493911, longitude: -97.11518573684964 },
  { name: 'Maverick Activities Center', latitude: 32.732001268010734, longitude: -97.11694111854234 },
  { name: 'Nedderman Hall', latitude: 32.73221994509294, longitude: -97.11402628867783 },
  { name: 'Science Hall', latitude: 32.73053390340398, longitude: -97.11365937913979 },
  {
    name: 'Science & Engineering Innovation & Research Building',
    latitude: 32.72807528494717,
    longitude: -97.11295766562837,
  },
  { name: 'University Center', latitude: 32.73171612022473, longitude: -97.11100963609321 },
];

const routeSeedData = [
  {
    start: 'Central Library',
    destination: 'Maverick Activities Center',
    eta: '7 minutes',
    summary: 'Curated walk from Central Library to Maverick Activities Center. Estimated travel time: 7 minutes.',
    pathCoordinates: [
      [32.72971344218098, -97.11331252075773],
      [32.72987533557884, -97.11332392014695],
      [32.72988548916178, -97.11371686376663],
      [32.729902975890454, -97.1137524030374],
      [32.730347475967406, -97.11424861170389],
      [32.73038865416891, -97.11437400497597],
      [32.73063459476982, -97.11442764915614],
      [32.73067633691977, -97.11448129333674],
      [32.73069664390215, -97.11474280871565],
      [32.73070228473135, -97.11547840453703],
      [32.730726540288295, -97.11613286353717],
      [32.730740078269356, -97.1161798021948],
      [32.73075135992105, -97.11634006418413],
      [32.731417538787625, -97.11630988933274],
      [32.7314305125895, -97.11647350408232],
      [32.73191279809287, -97.11648624457592],
      [32.73192859219686, -97.11660627342899],
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
      [32.72969764772741, -97.11323876001468],
      [32.72966380237511, -97.11332324959842],
      [32.729527292657124, -97.11334604837499],
      [32.72937273181058, -97.11333934285273],
      [32.72929714356392, -97.1133688471518],
      [32.72929488719737, -97.11342785574996],
      [32.7292982717472, -97.11349356987067],
      [32.729284733547175, -97.11366120793367],
      [32.72912791590836, -97.11366925456089],
      [32.72902637916402, -97.11366657235189],
      [32.728898329881396, -97.11366523124737],
      [32.72874546022954, -97.11367461897872],
      [32.72866197411227, -97.1137081465913],
      [32.728557616355765, -97.11371351100932],
      [32.7284543866688, -97.11372021653189],
      [32.72842618181489, -97.1135847649769],
      [32.728410951190725, -97.11327228762747],
      [32.7283319526536, -97.11326860232882],
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
      [32.72973428862971, -97.1132867072388],
      [32.7299689492939, -97.1132994477321],
      [32.730199096651866, -97.11329274220954],
      [32.730236890402715, -97.11329006000051],
      [32.73022504460252, -97.1137272600688],
      [32.730212634714924, -97.11380035026428],
      [32.7304185258084, -97.11380906744357],
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
      [32.72837959347153, -97.11329832758888],
      [32.72841738799266, -97.11330905642521],
      [32.72842641354738, -97.11371742274666],
      [32.728831434377724, -97.11370669391107],
      [32.728926202221196, -97.11366579022382],
      [32.72908922523486, -97.11366042580586],
      [32.72925450431944, -97.11367316629867],
      [32.72929173437903, -97.11364433255184],
      [32.7292860934622, -97.11332850244115],
      [32.72932952851526, -97.1132976570365],
      [32.73056623904298, -97.11328527302275],
      [32.73089115061454, -97.11326046258945],
      [32.731260623268994, -97.11323699326061],
      [32.731594557540035, -97.11322559387227],
      [32.731759267905204, -97.11332617671005],
      [32.73202043473826, -97.1133188006358],
      [32.73208304697783, -97.11331477732236],
      [32.7321586328622, -97.11343212396646],
      [32.732285549316906, -97.11343145341436],
      [32.73228554931757, -97.11347369820574],
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
      [32.73193131093942, -97.11660450667245],
      [32.73191720906424, -97.11624710232148],
      [32.73190761978755, -97.11534520953981],
      [32.73192567018936, -97.1152124401939],
      [32.73193356723898, -97.11507765919126],
      [32.73192567018936, -97.11487716406792],
      [32.73192115758925, -97.11485235363457],
      [32.73188110825329, -97.11477993399137],
      [32.73188618493068, -97.11475914687153],
      [32.73196289913151, -97.11475914687153],
      [32.731964591355776, -97.11471421987066],
      [32.73189972273563, -97.1147249487067],
      [32.73186587821934, -97.11442387074463],
      [32.731803829906234, -97.11441716522211],
      [32.731783523176205, -97.11440978914733],
      [32.73178465132799, -97.11436821490771],
      [32.73189521013412, -97.11436821490771],
      [32.73191382461585, -97.11422739893345],
      [32.73192284981657, -97.11399672895875],
      [32.731912696464356, -97.11364871233921],
      [32.731913067998946, -97.11317362140672],
      [32.73169082213437, -97.1131930674214],
      [32.73162764554566, -97.11324537049707],
      [32.73132529981799, -97.11322592448172],
      [32.731316274556434, -97.11240315686773],
      [32.73130245565482, -97.11236058427886],
      [32.73145701315112, -97.11217081799153],
      [32.73161721115429, -97.11205548300335],
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
      [32.73124136019825, -97.11114942943149],
      [32.731144338500805, -97.11117289876033],
      [32.731131855123415, -97.1093626120513],
      [32.731026372095826, -97.10929890958612],
      [32.73099647581426, -97.10914937643393],
      [32.73105006348166, -97.10906287519342],
      [32.731047807159584, -97.10885500399438],
      [32.73104724307821, -97.10868669537892],
      [32.73108842094916, -97.1084660836875],
      [32.731070370377836, -97.10814220694981],
      [32.731017346803384, -97.10808923332189],
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
      [32.73106021692708, -97.10807850448481],
      [32.731096882152805, -97.10866791991519],
      [32.731057396527014, -97.108688707035],
      [32.73105119164138, -97.10904477028161],
      [32.731009449672186, -97.10912188379059],
      [32.730990835003944, -97.10921911386714],
      [32.731064165492846, -97.1093418249302],
      [32.731107035598704, -97.10937267033462],
      [32.731128521222615, -97.11046209583766],
      [32.731145483262814, -97.11165069082703],
      [32.73098472033355, -97.11166946629054],
      [32.730980207682315, -97.11185587981706],
      [32.730695346330755, -97.11190684178854],
      [32.73064627111364, -97.11192159393805],
      [32.73061863103769, -97.11211337188212],
      [32.73064288661445, -97.11314401069562],
      [32.73063893803041, -97.1133136604167],
      [32.73050299388967, -97.11334718802931],
      [32.730465200253555, -97.11344039479232],
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
      [32.733234780196796, -97.11310538423552],
      [32.733220678527815, -97.1132401652382],
      [32.73300800063866, -97.1132594183707],
      [32.732869239764966, -97.1133962110304],
      [32.73285288176088, -97.11347935951046],
      [32.73285965059104, -97.11368588960433],
      [32.73208292406224, -97.11397556817727],
      [32.73194867434578, -97.11396953320721],
      [32.73192836764748, -97.11397221541654],
      [32.73189339499068, -97.1142994449159],
      [32.73164012486295, -97.11433967805102],
      [32.73082164564577, -97.11436717069364],
      [32.73071898266124, -97.11441813266495],
      [32.73071108550248, -97.1147855953001],
      [32.73072743208346, -97.1148714330045],
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
      [32.730708265089916, -97.1147627965237],
      [32.73062703714319, -97.11443422591924],
      [32.73049447748618, -97.11436247682798],
      [32.730291971078465, -97.11418209827208],
      [32.730127822088136, -97.1140104368948],
      [32.730176849189434, -97.1136543390706],
      [32.73022705283696, -97.11359868323274],
      [32.730210130262584, -97.1124848959409],
      [32.73013849132983, -97.11129064237672],
      [32.73004992973365, -97.11112501596907],
      [32.73003921208252, -97.11096609508533],
      [32.7298344482855, -97.11075285946848],
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
      [32.73111677195084, -97.10963674345629],
      [32.73114046331293, -97.11134262838812],
      [32.73113369506364, -97.11166030937854],
      [32.7309813933301, -97.11167640263399],
      [32.73096898354782, -97.1118507462195],
      [32.730647456766114, -97.11190170819071],
      [32.73028982736855, -97.11203581864144],
      [32.73021311171816, -97.1120666640471],
      [32.73020295817254, -97.11326963478722],
      [32.7297539446627, -97.11330584460916],
      [32.7297246120433, -97.11316636974075],
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

    CREATE TABLE IF NOT EXISTS walk_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER,
      start_location_id INTEGER NOT NULL,
      end_location_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

const recordWalkCompletion = ({ startLocationName, destinationLocationName }) => {
  const startLocation = getLocationByName(startLocationName);
  if (!startLocation) {
    throw new ValidationError(`Unknown start location: ${startLocationName}`);
  }

  const destinationLocation = getLocationByName(destinationLocationName);
  if (!destinationLocation) {
    throw new ValidationError(`Unknown destination: ${destinationLocationName}`);
  }

  const route = getRouteBetweenLocations(startLocationName, destinationLocationName);

  const insertedCompletion = querySingle(
    `INSERT INTO walk_completions (route_id, start_location_id, end_location_id)
     VALUES (?, ?, ?) RETURNING id`,
    [route ? route.id : null, startLocation.id, destinationLocation.id]
  );

  return querySingle(
    `SELECT
       wc.id,
       wc.completed_at AS completedAt,
       start.name AS startLocation,
       destination.name AS destination
     FROM walk_completions wc
     LEFT JOIN locations start ON start.id = wc.start_location_id
     LEFT JOIN locations destination ON destination.id = wc.end_location_id
     WHERE wc.id = ?`,
    [insertedCompletion.id]
  );
};

const getWalksTodayCount = () => {
  const completionRow = querySingle(
    `SELECT COUNT(*) AS count
     FROM walk_completions
     WHERE DATE(completed_at) = DATE('now', 'localtime')`
  );

  const requestRow = querySingle(
    `SELECT COUNT(*) AS count
     FROM walk_requests
     WHERE DATE(request_time) = DATE('now', 'localtime')`
  );

  const completions = completionRow ? Number(completionRow.count) || 0 : 0;
  const requests = requestRow ? Number(requestRow.count) || 0 : 0;

  return completions + requests;
};

const getMessagesCount = () => {
  const row = querySingle(
    `SELECT COUNT(*) AS count
     FROM messages`
  );

  return row ? Number(row.count) || 0 : 0;
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
  recordWalkCompletion,
  getWalksTodayCount,
  getMessagesCount,
  __test__: {
    formatSql,
  },
};
