// Single API gateway origin. In production this is the public Caddy host
// (e.g. https://api.instigi.com); Caddy strips the `/auth` and `/training`
// prefixes before proxying. In development it is left empty so requests are
// relative to the Vite dev server, which proxies `/auth` and `/training` to the
// individual services (see vite.config.ts).
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const AUTH_API = `${API_BASE}/auth`;
export const EXERCISES_API = `${API_BASE}/training/exercises`;
export const SESSIONS_API = `${API_BASE}/training/sessions`;
