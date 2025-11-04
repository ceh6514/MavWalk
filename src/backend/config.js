const normalizeValue = (value, allowed, fallback) => {
  if (!value) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

const routingProvider = normalizeValue(process.env.ROUTING_PROVIDER, ['seed', 'osrm'], 'seed');
const routingCacheMode = normalizeValue(process.env.ROUTING_CACHE_MODE, ['precompute', 'on_demand'], 'on_demand');

const osrmBaseUrl = process.env.OSRM_BASE_URL || 'http://localhost:5000';

module.exports = {
  routingProvider,
  routingCacheMode,
  osrmBaseUrl,
};
