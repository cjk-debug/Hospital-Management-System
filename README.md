# Hospital Appointment and Patient Management System (`MedCore HMS`)

Web application for managing doctors, patients, appointments, medical records, and billing with `localStorage` persistence and role-based access (`Admin` / `Receptionist`).

## Scripts

- `npm install` — Install dependencies
- `npm run dev` — Start local dev server on port 3000
- `npm test` — Run unit tests (`src/services/HospitalManager.test.ts`)
- `npm run lint` — TypeScript type check (`tsc --noEmit`)
- `npm run build` — Build production static bundle into `dist/`
- `npm start` — Serve the production build on `$PORT` (default `3000`)

## Deployment

No external API keys or environment variables are required. Any static host (`dist/` output) or Node PaaS (`npm run build` + `npm start`) can host this application.
