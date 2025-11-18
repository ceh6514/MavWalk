const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const fallbackBaseUrl = import.meta.env.DEV ? '' : 'http://localhost:3001';

export const API_BASE_URL = rawBaseUrl || fallbackBaseUrl;

export function apiUrl(path) {
  if (!API_BASE_URL) {
    return path;
  }

  return new URL(path, API_BASE_URL).toString();
}
