const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

export function apiUrl(path: string) {
  if (!path) return API_BASE || path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!path.startsWith('/')) path = `/${path}`;
  return (API_BASE ? API_BASE.replace(/\/$/, '') : '') + path;
}

export function mediaUrl(path: string) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  // normalize
  if (!path.startsWith('/')) path = `/${path}`;
  // If it's already absolute on the current host and no API_BASE, leave it
  return (API_BASE ? API_BASE.replace(/\/$/, '') : '') + path;
}

export default {
  API_BASE,
  apiUrl,
  mediaUrl,
};
