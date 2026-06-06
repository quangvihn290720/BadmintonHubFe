# BadmintonHub

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.13.

## Backend integration

The Angular app is wired to the BadmintonHub backend at `http://localhost:8080/api/v1`.

API base URL is read in this order:

1. `window.__BADMINTONHUB_CONFIG__.apiBaseUrl` from `public/env.js`
2. Angular environment fallback in `src/environments/environment*.ts`

For Vercel, set one of these environment variables before build:

- `BADMINTONHUB_API_BASE_URL=https://<render-service>.onrender.com`
- or `VITE_API_BASE_URL=https://<render-service>.onrender.com`
- or `NG_APP_API_BASE_URL=https://<render-service>.onrender.com`

The build script generates `public/env.js`. The app accepts either the Render root URL or the full `/api/v1` URL.

Local demo startup:

```bash
# backend, from ../BadmintonHubBe
docker compose up -d
.\mvnw.cmd -pl badmintonhub-bootstrap spring-boot:run -Dspring-boot.run.profiles=dev

# frontend, from this folder
npm install
npm start
```

Open `http://localhost:4200`.

Seed users from the backend `dev` profile:

- `admin` / `admin123` with role `ADMIN`
- `manager` / `admin123` with role `MANAGER`
- `cashier` / `admin123` with role `CASHIER`

The frontend sends `Authorization: Bearer <token>` after login and adds `X-Request-Id` to API requests. Booking lifecycle writes send an `Idempotency-Key`.

Integrated with backend:

- Login/session and role guards
- Court list and schedule
- Court admin CRUD/status page
- Booking create, check-in, service item add, check-out, cancel
- Service item list and admin create/update/deactivate
- Customer list/create and blacklist status read
- Staff/employee admin list/create/role/status
- Price-rule list/update through backend multiplier rules
- Daily and 7-day revenue report from backend report APIs

Still partially mock-backed:

- Customer points/blacklist reason are UI-only because backend stores only customer status.
- Payment page uses booking-derived payment summaries; backend has payment rows but no standalone payment list API yet.
- Pricing UI has Standard/VIP sections; backend price rules are global time multipliers, so the frontend maps them into the existing UI shape.
- Legacy service class names still include `MockBookingService` and `MockCustomerService`, but static mock data files are removed and real backend APIs are used where supported.

If the UI cannot connect, confirm:

- backend health is available at `http://localhost:8080/api/v1/health`
- frontend origin `http://localhost:4200` is allowed by backend CORS
- frontend origin `http://127.0.0.1:4200` is also allowed by backend CORS
- local storage key `badmintonhub_mock_mode` is not forcing mock mode

## Vercel Deployment

Recommended Vercel settings:

- Framework preset: Angular
- Build command: `npm run build`
- Output directory: `dist/BadmintonHub/browser`
- Environment variable: `BADMINTONHUB_API_BASE_URL=https://<render-service>.onrender.com`

The included `vercel.json` rewrites SPA routes to `index.html`.

After deploying the frontend, set backend CORS:

```text
APP_CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>
```

If login works locally but fails on Vercel, check:

- Render backend is awake and `https://<render-service>.onrender.com/api/v1/health` returns success.
- Vercel generated `env.js` contains the Render URL.
- Render `APP_CORS_ALLOWED_ORIGINS` includes the exact Vercel origin.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

