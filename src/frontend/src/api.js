import { apiUrl } from './api/client';

async function request(path, opts = {}) {
  const url = apiUrl(path);
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

export async function getRandomMessage({ start, destination, exclude } = {}) {
  const qs = new URLSearchParams();
  if (start) qs.set('start', start);
  if (destination) qs.set('destination', destination);
  if (Array.isArray(exclude) && exclude.length) {
    const sanitized = exclude.filter((value) => Number.isInteger(value) && value > 0);
    if (sanitized.length) {
      qs.set('exclude', sanitized.join(','));
    }
  }
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
