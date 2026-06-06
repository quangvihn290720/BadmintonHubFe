import { writeFileSync } from 'node:fs';

const apiBaseUrl =
  process.env.BADMINTONHUB_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.NG_APP_API_BASE_URL ||
  '';

writeFileSync(
  'public/env.js',
  `window.__BADMINTONHUB_CONFIG__ = { apiBaseUrl: ${JSON.stringify(apiBaseUrl)} };\n`
);
