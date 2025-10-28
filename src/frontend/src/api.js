const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
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

export async function postMessage(payload) {
  return request('/api/messages', { method: 'POST', body: payload });
}
