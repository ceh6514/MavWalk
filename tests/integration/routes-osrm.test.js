const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const encodePolyline = (points, precision = 6) => {
  const factor = 10 ** precision;
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  const encodeValue = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';

    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }

    chunk += String.fromCharCode(v + 63);
    return chunk;
  };

  points.forEach(({ lat, lng }) => {
    const scaledLat = Math.round(lat * factor);
    const scaledLng = Math.round(lng * factor);

    output += encodeValue(scaledLat - prevLat);
    output += encodeValue(scaledLng - prevLng);

    prevLat = scaledLat;
    prevLng = scaledLng;
  });

  return output;
};

test('OSRM provider fetches and caches new routes on demand', async (t) => {
  const dbPath = path.join(__dirname, '..', '..', 'src', 'backend', 'data', 'mavwalk.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const samplePoints = [
    { lat: 32.7297, lng: -97.1106 },
    { lat: 32.7333, lng: -97.1133 },
  ];
  const geometry = encodePolyline(samplePoints);

  let osrmHits = 0;
  const osrmServer = http.createServer((req, res) => {
    if (req.url.startsWith('/route/v1/foot/')) {
      osrmHits += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              geometry,
              duration: 420,
              distance: 980,
              legs: [
                {
                  steps: [
                    {
                      maneuver: { type: 'depart', modifier: 'straight' },
                      name: 'Test Walkway',
                    },
                    {
                      maneuver: { type: 'arrive' },
                      name: '',
                    },
                  ],
                },
              ],
            },
          ],
        })
      );
    } else {
      res.writeHead(404).end();
    }
  });

  await new Promise((resolve) => osrmServer.listen(0, resolve));
  const osrmPort = osrmServer.address().port;

  process.env.ROUTING_PROVIDER = 'osrm';
  process.env.ROUTING_CACHE_MODE = 'on_demand';
  process.env.OSRM_BASE_URL = `http://127.0.0.1:${osrmPort}`;

  delete require.cache[require.resolve('../../src/backend/config')];
  delete require.cache[require.resolve('../../src/backend/lib/osrmClient')];
  delete require.cache[require.resolve('../../src/backend/db')];
  delete require.cache[require.resolve('../../src/backend/server')];

  const { createApp } = require('../../src/backend/server');
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const appPort = server.address().port;
  const baseUrl = `http://127.0.0.1:${appPort}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => osrmServer.close(resolve));
  });

  const params = new URLSearchParams({
    start: 'Business Building',
    destination: 'Engineering Research Building',
  });

  const firstResponse = await fetch(`${baseUrl}/api/routes?${params.toString()}`);
  assert.equal(firstResponse.status, 200);
  const firstBody = await firstResponse.json();
  assert.equal(osrmHits, 1);
  assert.equal(firstBody.startLocation, 'Business Building');
  assert.equal(firstBody.destination, 'Engineering Research Building');
  assert.equal(firstBody.pathCoordinates.length, samplePoints.length);
  assert.equal(firstBody.steps.length, 2);
  assert.equal(firstBody.etaSeconds, 420);
  assert.equal(firstBody.distanceMeters, 980);

  const secondResponse = await fetch(`${baseUrl}/api/routes?${params.toString()}`);
  assert.equal(secondResponse.status, 200);
  await secondResponse.json();
  assert.equal(osrmHits, 1, 'subsequent fetch should use cached route');
});
