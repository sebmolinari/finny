# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Backend** (from `/backend`):

```bash
npm run dev   # nodemon auto-restart
npm start     # production
```

**Frontend** (from `/frontend`):

```bash
npm run dev   # Vite dev server on port 3000
npm run build # production build
npm run lint  # ESLint (frontend only)
```

No test framework is currently configured.

Swagger UI is available at `http://localhost:5000/api/v1/api-docs` in development.

## Architecture Overview

Finny is a portfolio management app for tracking investments across brokers with analytics, tax reporting, automated emails, and scheduled background jobs.

### Backend

Express.js 5 + SQLite (encrypted via `better-sqlite3-multiple-ciphers`). All routes are under `/api/v1/`. JWT-based auth with two roles: `user` and `admin`.

```
backend/
  config/        # database.js (schema + encryption), swagger.js
  middleware/    # auth.js, admin.js, validators/
  models/        # Static-method classes wrapping SQLite (User, Asset, Transaction, AuditLog…)
  routes/        # One file per resource; mounted in server.js
  services/      # Business logic (analyticsService, priceService, portfolioEmailService, schedulerService)
  utils/         # logger.js, dateUtils.js, valueScale.js, validationMiddleware.js
  migrations/    # Numbered SQL files applied by migrationRunner.js at startup
  scripts/       # migrationRunner.js, restore.js, exportPlain.js
```

**Key patterns:**

- Models use static class methods: `User.create()`, `Asset.findById()`, etc.
- All mutations write an audit log via `AuditLog.logCreate/logUpdate/logDelete(userId, username, table, recordId, values, req.ip, req.get("user-agent"))`.
- Financial values are stored as scaled integers to avoid float errors. Use `toValueScale(float, scale)` / `fromValueScale(value, scale)` from `utils/valueScale.js`. Scale per field: quantity=8, price=6, fee=4, amount=4 decimals.
- Logger lives at `utils/logger.js` (NOT `config/logger.js`).
- Background scheduler polls every 60 seconds via `setInterval` started in the `app.listen` callback. It reads enabled schedulers from the DB each tick so no restart is needed after changes.

### Frontend

React 19 + Vite + Material UI 7. React Router 7 with a single `ProtectedRoute` component (accepts optional `role="admin"` prop).

```
frontend/src/
  api/api.js     # All axios calls organized by resource (authAPI, assetAPI, schedulerAPI…)
  auth/          # AuthContext.jsx, ProtectedRoute.jsx
  pages/         # Route-level components
  components/    # Reusable UI components
  router/        # router.jsx — all route definitions in one place
  theme/         # MUI theme
```

**Key patterns:**

- All API calls go through `src/api/api.js`. Add new endpoint groups as named exports (`export const fooAPI = { … }`).
- Global axios interceptor handles 401 (redirect to login), 429 (rate limit toast), and timeout errors.
- Admin-only pages use `<ProtectedRoute role="admin">` in `router.jsx` and appear under `adminItems` in `MenuContent.jsx`.
- `handleApiError(err, fallbackMsg, setError)` from `utils/errorHandler.js` is the standard error handler in page components.

## Environment

Backend requires a `.env` file. See `backend/.env.example` for all variables. Key ones:

- `DATABASE_PATH` — path to the encrypted SQLite file (relative to `/backend`)
- `DB_KEY` — encryption key (min 8 chars)
- `JWT_SECRET` — min 32 chars
- `EMAIL_ENABLED=true` — enables nodemailer (requires SMTP vars)

## Database

Migrations run automatically at startup via `migrationRunner.js`. To add a migration, create a numbered SQL file in `backend/migrations/` (e.g. `006_*.sql`).

## Patterns & Checklists

### Adding a new page
1. Create `frontend/src/pages/MyPage.jsx`
2. Add route in `frontend/src/router/router.jsx`
3. If it needs a nav entry: add to the appropriate items array in `frontend/src/components/MenuContent.jsx`
4. If it calls new API endpoints: add them to `frontend/src/api/api.js`
5. Admin-only pages: wrap in `<ProtectedRoute role="admin">` in `router.jsx` and add under `adminItems` in `MenuContent.jsx`

### Adding a new backend route
1. Create `backend/routes/myRoute.js`
2. Mount in `backend/server.js` under `/api/v1/myroute`
3. If new DB columns are needed: add a numbered migration in `backend/migrations/`

### Frontend import conventions
- Do **not** add `import React from "react"` — React 19 + Vite use the automatic JSX transform; the default import is never needed
- Run `npm run lint` from `frontend/` before committing to catch unused imports

### After adding or changing features
- Run `/update-docs` to update `frontend/src/assets/CHANGELOG.md` and `README.md`
