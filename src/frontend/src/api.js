const rawEnvBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

function normaliseBaseUrl(urlString) {
  if (!urlString) return '';

  try {
    const url = new URL(urlString, window.location.origin);

    if (['localhost', '127.0.0.1'].includes(url.hostname)) {
      url.hostname = window.location.hostname;
    }

    return url.origin + (url.pathname === '/' ? '' : url.pathname.replace(/\/$/, ''));
  } catch (error) {
    console.warn(`Invalid VITE_API_BASE_URL provided ("${urlString}"). Falling back to defaults.`, error);
    return '';
  }
}

function computeBaseUrl() {
  // 1) If an explicit env base URL is provided, respect it
  const normalised = normaliseBaseUrl(rawEnvBaseUrl);
  if (normalised) return normalised;

  // 2) In dev, prefer Vite proxy: same-origin '' so fetch('/api/...') works
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return '';
  }

  // 3) In production builds, default to same-origin
  return '';
}

const BASE_URL = computeBaseUrl();

async function request(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getMessages() {
  return request('/api/messages');
}

export async function getRoutes({ start, destination } = {}) {
  const qs = new URLSearchParams();
  if (start) qs.set('start', start);
  if (destination) qs.set('destination', destination);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/api/routes${suffix}`);
}

export async function postMessage(payload) {
  return request('/api/messages', { method: 'POST', body: payload });
}

export async function postWalkCompletion(payload) {
  return request('/api/walks/completions', { method: 'POST', body: payload });
}

export async function getRandomMessage({ start, destination } = {}) {
  const qs = new URLSearchParams();
  if (start) qs.set('start', start);
  if (destination) qs.set('destination', destination);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/api/messages/random${suffix}`);
}

export async function getStats() {
  return request('/api/stats');
}

// vite.config.ts
export default {
  server: {
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
  }
}
