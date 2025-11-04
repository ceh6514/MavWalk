const { URL } = require('node:url');

const { osrmBaseUrl } = require('../config');

const DEFAULT_TIMEOUT_MS = 10_000;

const abortableFetch = async (resource, options = {}) => {
  const controller = new AbortController();
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const decodePolyline = (polylineString, precision = 6) => {
  if (!polylineString) {
    return [];
  }

  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const factor = 10 ** precision;

  while (index < polylineString.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = polylineString.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    latitude += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = polylineString.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    longitude += deltaLng;

    coordinates.push({ lat: latitude / factor, lng: longitude / factor });
  }

  return coordinates;
};

const formatStepInstruction = (step) => {
  if (!step) {
    return 'Continue';
  }

  if (step.maneuver && step.maneuver.instruction) {
    return step.maneuver.instruction;
  }

  const { maneuver = {}, name = '' } = step;
  const fragments = [];

  if (maneuver.type) {
    const capitalized = maneuver.type.charAt(0).toUpperCase() + maneuver.type.slice(1);
    fragments.push(capitalized);
  }

  if (maneuver.modifier) {
    fragments.push(maneuver.modifier.toLowerCase());
  }

  if (name) {
    fragments.push(`onto ${name}`);
  }

  const sentence = fragments.join(' ').trim();
  if (sentence.length === 0) {
    return 'Continue straight';
  }

  return sentence.endsWith('.') ? sentence : `${sentence}.`;
};

const fetchWalkingRoute = async ({ start, end }) => {
  if (!start || typeof start.lat !== 'number' || typeof start.lng !== 'number') {
    throw new Error('fetchWalkingRoute requires a numeric start latitude and longitude.');
  }

  if (!end || typeof end.lat !== 'number' || typeof end.lng !== 'number') {
    throw new Error('fetchWalkingRoute requires a numeric end latitude and longitude.');
  }

  const coordinatesPath = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = new URL(`/route/v1/foot/${coordinatesPath}`, osrmBaseUrl);
  url.searchParams.set('geometries', 'polyline6');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'true');

  const response = await abortableFetch(url);

  if (!response.ok) {
    throw new Error(`OSRM request failed with status ${response.status}`);
  }

  const body = await response.json();

  if (!body.routes || body.routes.length === 0) {
    throw new Error('OSRM response did not include any routes.');
  }

  const [route] = body.routes;
  const coords = decodePolyline(route.geometry);

  if (coords.length === 0) {
    throw new Error('OSRM route geometry was empty.');
  }

  const steps = (route.legs || [])
    .flatMap((leg) => leg.steps || [])
    .map((step) => formatStepInstruction(step));

  return {
    coords,
    steps,
    etaSeconds: typeof route.duration === 'number' ? Math.round(route.duration) : null,
    distanceMeters: typeof route.distance === 'number' ? Math.round(route.distance) : null,
  };
};

module.exports = {
  fetchWalkingRoute,
  __test__: {
    decodePolyline,
    formatStepInstruction,
  },
};
