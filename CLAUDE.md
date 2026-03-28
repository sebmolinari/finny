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

**Backend tests** (from `/backend`):

```bash
npm test              # run all tests
npm test -- --coverage  # with coverage report
```

Swagger UI is available at `http://localhost:5000/api/v1/api-docs` in development.

## Architecture Overview

Finny is a portfolio management app for tracking investments across brokers with analytics, tax reporting, automated emails, and scheduled background jobs.

### Backend

Express.js 5 + SQLite (encrypted via `better-sqlite3-multiple-ciphers`). All routes are under `/api/v1/`. JWT-based auth with two roles: `user` and `admin`.

```
backend/
  config/        # database.js (opens encrypted DB, no schema), swagger.js
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
  api/
    client.js        # axios instance + interceptors
    index.js         # barrel — re-exports all *API named exports
    *.api.js         # one file per resource (auth, assets, brokers, transactions, analytics…)
  auth/              # AuthContext.jsx, ProtectedRoute.jsx, SettingsContext.jsx
  pages/             # Route-level components; Dashboard/ is a feature folder with hooks/ and components/
  components/
    layout/          # Header, MenuContent, NavbarBreadcrumbs, PageContainer, …
    charts/          # MTMEvolutionChart, PortfolioValueChart, AssetAllocationChart, …
    dialogs/         # TransactionDialog, AssetDialog, BrokerDialog, …
    data-display/    # AuditFieldsDisplay, …
    scheduler/       # SchedulerForm, SchedulerHistory
    ui/              # LoadingSpinner, ChartCard, RouteErrorBoundary, …
  router/            # router.jsx — all route definitions in one place
  theme/             # MUI theme
```

**Key patterns:**

- API calls live in per-resource files under `src/api/` (e.g. `transactions.api.js`). Import from the barrel: `import { transactionAPI } from "../api"`. To add a new resource, create `src/api/myresource.api.js` and re-export it from `src/api/index.js`.
- Global axios interceptor (in `client.js`) handles 401 (fires `auth:unauthorized` CustomEvent — `AuthContext` listens and clears state so `ProtectedRoute` redirects), 429 (rate-limit toast), and timeout errors.
- User settings (timezone, date format, etc.) are fetched once globally via `SettingsContext`. Read them with `const { timezone, dateFormat } = useUserSettings()` from `auth/SettingsContext.jsx` — do **not** call `settingsAPI.get()` per page.
- All 25 route-level pages are loaded with `lazy()` + `Suspense` in `router.jsx` for code splitting.
- Admin-only pages use `<ProtectedRoute role="admin">` in `router.jsx` and appear under `adminItems` in `components/layout/MenuContent.jsx`.
- `handleApiError(err, fallbackMsg, setError)` from `utils/errorHandler.js` is the standard error handler in page components.

## Database

Migrations run automatically at startup via `migrationRunner.js`. To add a migration, create a numbered SQL file in `backend/migrations/` (e.g. `006_*.sql`).

### Column type conventions

Never use `REAL` or `FLOAT` for any column. Use:

| Data                                                    | Type               | Notes                                                                                          |
| ------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| Booleans / flags                                        | `INTEGER` (0/1)    | e.g. `email_notifications_enabled INTEGER DEFAULT 0`                                           |
| Counts, IDs, days                                       | `INTEGER`          | e.g. `lt_holding_period_days INTEGER DEFAULT 365`                                              |
| Small decimals (rates, percentages stored as fractions) | `NUMERIC(5,2)`     | e.g. `marginal_tax_rate NUMERIC(5,2) DEFAULT 0.25`, `risk_free_rate NUMERIC(5,2) DEFAULT 0.05` |
| Financial values (prices, quantities, amounts)          | `INTEGER` (scaled) | Use `toValueScale`/`fromValueScale` from `utils/valueScale.js` — **never store floats**        |
| Strings, dates, JSON                                    | `TEXT`             | Dates as `"YYYY-MM-DD"`, timestamps via `CURRENT_TIMESTAMP`                                    |

## Patterns & Checklists

### Adding a new page

1. Create `frontend/src/pages/MyPage.jsx`
2. Add route in `frontend/src/router/router.jsx` with a `handle: { title: "My Page" }` property — `NavbarBreadcrumbs` uses `useMatches()` to pick this up automatically; no manual `routeTitles` map update needed
3. If it needs a nav entry: add to the appropriate items array in `frontend/src/components/layout/MenuContent.jsx`
4. If it calls new API endpoints: create (or extend) `frontend/src/api/myresource.api.js` and re-export it from `frontend/src/api/index.js`
5. Admin-only pages: wrap in `<ProtectedRoute role="admin">` in `router.jsx` and add under `adminItems` in `MenuContent.jsx`
6. Wrap page content in `<PageContainer>` with **no** `title` or `subtitle` props — the navbar breadcrumb is the page title

### Adding a new backend route

1. Create `backend/routes/myRoute.js`
2. Mount in `backend/server.js` under `/api/v1/myroute`
3. If new DB columns are needed: add a numbered migration in `backend/migrations/`

### Testing

Jest is configured in `backend/`. Tests live under `backend/tests/`:

```
backend/tests/
  unit/          # isolated tests — models, services, utils, middleware, routes
  integration/   # full request-cycle tests using supertest
  setup/
    testDb.js    # in-memory SQLite built from real migrations (auto-mapped via moduleNameMapper)
    testApp.js   # Express app wired up for integration tests
    env.js       # test env vars
```

**Rules:**

- Every new function or method **must** have a corresponding unit test in `backend/tests/unit/`.
- Unit tests for a file at `backend/foo/bar.js` go in `backend/tests/unit/foo/bar.test.js`.
- Use `testDb.clearAll()` in `beforeEach` to reset state between tests — never share state across tests.
- The test DB schema is kept in sync automatically: adding a migration file is all that's needed.
- Coverage thresholds are enforced at 80% (branches, functions, lines, statements) — keep them green.

### Frontend import conventions

- Do **not** add `import React from "react"` — React 19 + Vite use the automatic JSX transform; the default import is never needed
- Run `npm run lint` from `frontend/` before committing to catch unused imports

### Date & timezone handling

Users configure an IANA timezone in `user_settings.timezone` (e.g. `America/Argentina/Buenos_Aires`). All date logic must respect this — never use raw `new Date()` to represent "today" or "now" for the user.

**Backend** (`backend/utils/dateUtils.js`):

- `getTodayInTimezone(tz)` → `"YYYY-MM-DD"` in the given timezone
- `getYesterdayInTimezone(tz)` → `"YYYY-MM-DD"` yesterday in the given timezone
- `getNowInTimezoneISO(tz)` → ISO-8601 datetime string in the given timezone
- `getSchedulerNow(tz)` → `{ time, today, dayOfWeek, dayOfMonth }` used by the scheduler

Rules:

- Do **not** use `new Date().toISOString()` or `new Date().getFullYear()` etc. when the result represents a user-facing date. Use the utils above.
- For scheduler fire times, resolve the creator's timezone via `UserSettings.findByUserId(scheduler.created_by)?.timezone || "UTC"` and pass it to `getSchedulerNow`.
- SQLite stores all timestamps in UTC. `CURRENT_TIMESTAMP` and `.toISOString()` are fine for audit/log columns.

**Frontend** (`frontend/src/utils/dateUtils.js`):

- `getTodayInTimezone(tz)` → `"YYYY-MM-DD"` in the given timezone
- `formatDatetimeInTimezone(isoStr, tz)` → human-readable datetime for display
- `formatDate(isoStr)` → short date display

Rules:

- Get the user's timezone from `SettingsContext`: `const { timezone } = useUserSettings()`. Do **not** call `settingsAPI.get()` per page — settings are fetched once globally.
- Use `getTodayInTimezone(timezone)` wherever "today" is needed (date picker defaults, range start/end, event greying, YTD year, etc.). Never use `new Date().toISOString().split("T")[0]` or `toDateInput(new Date())`.
- For relative date arithmetic (e.g. 30 days ago from today): derive from `new Date(getTodayInTimezone(tz))`, do the arithmetic, then convert back via `.toISOString().split("T")[0]`.
- `useUserSettings()` falls back to `"UTC"` automatically if settings haven't loaded yet.

**What does NOT need timezone handling:**

- Date-only DB iteration in analytics (parses as UTC midnight, arithmetic stays consistent)
- Audit log `executed_at` / `created_at` columns (UTC is correct)
- Year selectors that are display-only (TaxReport, HostMetrics)
- Copyright year

## Release Process

### After adding or changing features

1. **Commit and push** your changes to the `develop` branch.

2. **Update documentation** by running `/update-docs`. This compares `develop` against `origin/master`, updates `CHANGELOG.md` and `FEATURES.md`, and determines the next version. Review the changes, then commit and push them to `develop`.

3. **Open a PR** from `develop` → `master` on GitHub and merge it.

4. **Re-sync `develop`** with master after the merge:

   ```bash
   git checkout develop
   git fetch origin
   git merge origin/master
   git push origin develop
   ```

5. **Tag the release** on master:

   ```bash
   git checkout master
   git pull origin master
   git tag -a v1.x.y -m "Release v1.x.y"
   git push origin --tags
   ```

   Follow [semver](https://semver.org): increment patch for fixes, minor for features, major for breaking changes.
