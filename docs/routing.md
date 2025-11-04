# Routing configuration

MavWalk supports two routing providers:

- **Seed** (default): serves the curated campus routes bundled with the app.
- **OSRM**: generates walking directions from a running [OSRM](http://project-osrm.org/) backend and persists them in SQLite for future requests.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `ROUTING_PROVIDER` | `seed` | Selects the routing backend (`seed` or `osrm`). |
| `ROUTING_CACHE_MODE` | `on_demand` | `on_demand` fetches and stores routes the first time they are requested. `precompute` requires the cache to be primed ahead of time and returns `404 {"reason":"missing-precomputed-route"}` when a route is missing. |
| `OSRM_BASE_URL` | `http://localhost:5000` | Base URL for the OSRM service. |

Set these variables when starting the backend, for example:

```bash
ROUTING_PROVIDER=osrm OSRM_BASE_URL=http://localhost:5000 npm start --prefix src/backend
```

## Running OSRM locally

The quickest way to run OSRM is via Docker. The example below launches a foot-routing server using the `texas-latest` dataset:

```bash
docker run --rm -it -p 5000:5000 \
  osrm/osrm-backend \
  osrm-routed --algorithm mld /data/texas-latest.osrm
```

Replace the dataset with your campus extract. The backend expects OSRM’s HTTP API to be reachable at `OSRM_BASE_URL`.

## Precomputing routes

When `ROUTING_CACHE_MODE=precompute`, populate the database using the helper script:

```bash
node scripts/precompute-routes.js
```

### Useful flags

- `--limit=10` – stop after generating 10 new routes.
- `--from="Central Library"` / `--to="MAC"` – restrict start or destination locations (matching by name or initials).
- `--dry-run` – report missing routes without persisting them.

Example:

```bash
node scripts/precompute-routes.js --from="Central Library" --to="MAC" --limit=5
```

## Rolling back to seed-only routing

Simply restart the backend with `ROUTING_PROVIDER=seed`. The persisted OSRM routes remain in the database but are ignored while the seed provider is active. To remove them entirely, delete `src/backend/data/mavwalk.db` and restart the server to re-seed the original dataset.
