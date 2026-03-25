Compare the local `develop` branch against `origin/master` and update the documentation files to reflect what will ship in the next release.

Steps:
1. Run `git fetch origin` to ensure remote refs are up to date
2. Run `git diff origin/master...develop --stat` to get an overview of all changes between branches
3. Run `git diff origin/master...develop` on changed files to understand what was added, modified, or removed (use the Bash tool; diff may be large so focus on routes, models, pages, components, and migrations)
4. Read the current `frontend/src/assets/CHANGELOG.md` and `frontend/src/assets/FEATURES.md`
5. Determine the appropriate next version:
   - Bump **patch** (e.g. 1.0.0 → 1.0.1) for bug fixes, refactors, and internal improvements
   - Bump **minor** (e.g. 1.0.0 → 1.1.0) when new user-facing features were added
6. Add a new dated version entry to the top of CHANGELOG.md using today's date and this structure (only include sections that apply):
   ```
   ## [X.Y.Z] – YYYY-MM-DD

   ### Added
   - ...

   ### Changed
   - ...

   ### Removed
   - ...
   ```
7. Update `frontend/src/assets/FEATURES.md`:
   - Add new `##` sections for genuinely new features
   - Update existing sections that changed in behaviour or scope
   - Remove bullet points or sections for capabilities that were dropped
8. Keep all descriptions user-facing and concise — focus on what the user experiences, not implementation details
