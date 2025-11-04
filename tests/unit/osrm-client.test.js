const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

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

test('decodePolyline converts encoded coordinates to lat/lng pairs', () => {
  delete require.cache[require.resolve('../../src/backend/config')];
  delete require.cache[require.resolve('../../src/backend/lib/osrmClient')];

  const { __test__ } = require('../../src/backend/lib/osrmClient');
  const { decodePolyline } = __test__;

  const points = [
    { lat: 32.730001, lng: -97.110001 },
    { lat: 32.731111, lng: -97.111222 },
    { lat: 32.732222, lng: -97.112333 },
  ];

  const encoded = encodePolyline(points);
  const decoded = decodePolyline(encoded);

  assert.equal(decoded.length, points.length);
  decoded.forEach((coordinate, index) => {
    assert.ok(Math.abs(coordinate.lat - points[index].lat) < 1e-6);
    assert.ok(Math.abs(coordinate.lng - points[index].lng) < 1e-6);
  });
});

test('fetchWalkingRoute returns decoded geometry and steps', async (t) => {
  const samplePoints = [
    { lat: 32.730001, lng: -97.110001 },
    { lat: 32.731111, lng: -97.111222 },
  ];

  const geometry = encodePolyline(samplePoints);
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/route/v1/foot/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              geometry,
              duration: 603.4,
              distance: 1570.6,
              legs: [
                {
                  steps: [
                    {
                      maneuver: { type: 'depart', modifier: 'straight' },
                      name: 'Library Mall',
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

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  process.env.OSRM_BASE_URL = `http://127.0.0.1:${port}`;
  delete require.cache[require.resolve('../../src/backend/config')];
  delete require.cache[require.resolve('../../src/backend/lib/osrmClient')];
  const { fetchWalkingRoute } = require('../../src/backend/lib/osrmClient');

  t.after(() => {
    server.close();
  });

  const result = await fetchWalkingRoute({
    start: { lat: samplePoints[0].lat, lng: samplePoints[0].lng },
    end: { lat: samplePoints[samplePoints.length - 1].lat, lng: samplePoints[samplePoints.length - 1].lng },
  });

  assert.equal(result.coords.length, samplePoints.length);
  assert.equal(result.steps.length, 2);
  assert.equal(result.etaSeconds, 603);
  assert.equal(result.distanceMeters, 1571);
});
