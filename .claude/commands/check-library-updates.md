Check for outdated npm packages in both backend and frontend, then analyze each update and recommend whether to upgrade or skip.

Steps:

1. Run `npx --yes npm-check-updates --format group 2>/dev/null` from `backend/` and from `frontend/` in parallel using the Bash tool. Capture full output from both.

2. Parse the output for each workspace. For every outdated package record:
   - Package name
   - Current version
   - Latest version
   - Version jump type: **patch** (x.y.Z), **minor** (x.Y.z), or **major** (X.y.z)

3. For each package apply this decision framework:

   **Upgrade (green)**
   - Patch bumps → almost always safe; recommend upgrade
   - Minor bumps for stable, widely-used packages (e.g. axios, express, eslint plugins) → recommend upgrade
   - Security-related packages (helmet, jsonwebtoken, bcrypt, cors) any version → recommend upgrade and flag as security-sensitive

   **Evaluate (yellow)**
   - Minor bumps for packages with historically breaking minor releases (e.g. MUI, React Router, Vite, Prisma) → recommend reading changelog before upgrading
   - Dev tooling minor bumps that may affect build output → evaluate

   **Skip / defer (red)**
   - Major bumps for core framework packages (express, react, react-dom, vite, MUI, react-router-dom, better-sqlite3*) → skip; flag as high-effort migration requiring dedicated work
   - Major bumps that pull in peer-dependency conflicts → skip

4. Format your response as two sections — **Backend** and **Frontend** — each containing a markdown table:

   | Package | Current | Latest | Jump | Recommendation | Notes |
   |---------|---------|--------|------|----------------|-------|

   Use these emojis in the Recommendation column:
   - ✅ Upgrade
   - ⚠️ Evaluate
   - ❌ Skip / defer

5. After the tables add a short **Summary** with:
   - Total counts: upgrades / evaluate / skip per workspace
   - Any security-sensitive packages called out explicitly
   - A suggested one-liner to apply all recommended upgrades at once (use `npx npm-check-updates -u --filter "pkg1,pkg2,..."` then `npm install`) for each workspace

Do NOT actually run `ncu -u` or `npm install` — only report and recommend.
