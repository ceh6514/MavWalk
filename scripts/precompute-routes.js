#!/usr/bin/env node

const process = require('node:process');

const {
  initializeDatabase,
  getAllLocations,
  findRouteByStartEnd,
  upsertRoute,
  replaceRouteCoordinates,
  replaceRouteSteps,
} = require('../src/backend/db');
const { fetchWalkingRoute } = require('../src/backend/lib/osrmClient');

const parseArgs = (argv) => {
  return argv.reduce(
    (acc, arg) => {
      if (arg.startsWith('--limit=')) {
        acc.limit = Number(arg.split('=')[1]);
      } else if (arg.startsWith('--from=')) {
        acc.from = arg.split('=')[1].replace(/^"|"$/g, '');
      } else if (arg.startsWith('--to=')) {
        acc.to = arg.split('=')[1].replace(/^"|"$/g, '');
      } else if (arg === '--dry-run') {
        acc.dryRun = true;
      }

      return acc;
    },
    { limit: Infinity, dryRun: false }
  );
};

const buildInitials = (name = '') => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toLowerCase();
};

const matchesFilter = (location, filter) => {
  if (!filter) {
    return true;
  }

  const normalized = filter.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }

  const name = location.name.toLowerCase();
  if (name === normalized || name.includes(normalized)) {
    return true;
  }

  const initials = buildInitials(location.name);
  if (initials && initials === normalized.replace(/[^a-z]/g, '')) {
    return true;
  }

  return false;
};

const formatSummary = ({ startName, endName, distanceMeters, etaSeconds }) => {
  const parts = [`OSRM walking route from ${startName} to ${endName}.`];

  if (typeof distanceMeters === 'number' && Number.isFinite(distanceMeters)) {
    if (distanceMeters >= 1000) {
      parts.push(`Distance: ${(distanceMeters / 1000).toFixed(2)} km.`);
    } else {
      parts.push(`Distance: ${Math.round(distanceMeters)} m.`);
    }
  }

  if (typeof etaSeconds === 'number' && Number.isFinite(etaSeconds)) {
    const minutes = Math.max(1, Math.round(etaSeconds / 60));
    parts.push(`ETA: ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }

  return parts.join(' ');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  initializeDatabase();

  const locations = getAllLocations();
  const filteredStarts = locations.filter((location) => matchesFilter(location, args.from));
  const filteredDestinations = locations.filter((location) => matchesFilter(location, args.to));

  let remaining = Number.isFinite(args.limit) ? args.limit : Infinity;
  let computed = 0;

  for (const start of filteredStarts) {
    for (const destination of filteredDestinations) {
      if (start.id === destination.id) {
        continue;
      }

      if (remaining <= 0) {
        break;
      }

      const existing = findRouteByStartEnd(start.id, destination.id);
      if (existing) {
        continue;
      }

      console.log(`Missing route: ${start.name} -> ${destination.name}`);

      if (args.dryRun) {
        remaining -= 1;
        continue;
      }

      try {
        const osrmRoute = await fetchWalkingRoute({
          start: { lat: start.latitude, lng: start.longitude },
          end: { lat: destination.latitude, lng: destination.longitude },
        });

        const routeId = upsertRoute({
          startLocationId: start.id,
          endLocationId: destination.id,
          etaSeconds: osrmRoute.etaSeconds ?? null,
          distanceMeters: osrmRoute.distanceMeters ?? null,
          summary: formatSummary({
            startName: start.name,
            endName: destination.name,
            distanceMeters: osrmRoute.distanceMeters,
            etaSeconds: osrmRoute.etaSeconds,
          }),
        });

        replaceRouteCoordinates(routeId, osrmRoute.coords);
        replaceRouteSteps(routeId, osrmRoute.steps);

        computed += 1;
        remaining -= 1;
      } catch (error) {
        console.error(`Failed to compute route for ${start.name} -> ${destination.name}:`, error.message);
      }
    }
  }

  if (args.dryRun) {
    console.log('Dry run complete. No routes were persisted.');
  } else {
    console.log(`Precompute complete. ${computed} routes added.`);
  }
};

main().catch((error) => {
  console.error('Precompute failed:', error);
  process.exitCode = 1;
});
