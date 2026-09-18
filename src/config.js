// In dev, calls go through Vite's proxy (see vite.config.ts) via a relative
// path — the staging backend's CORS only allows the exact production origin,
// so the browser can never call it directly from a local dev port.
export const API_BASE_URL = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_BASE_URL || "https://backend.staging.cybersquadapp.com";