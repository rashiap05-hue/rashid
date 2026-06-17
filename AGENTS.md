# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
Primary product is **Travo DMC**, a B2B travel platform built on the Emergent
`fastapi_react_mongo_shadcn` stack:

- `backend/` — FastAPI + MongoDB API (`backend/server.py`), served by `uvicorn` on port **8001**, all routes under `/api`.
- `frontend/` — Create React App (via `@craco/craco`, package manager **yarn**) on port **3000**, talks to the backend through `REACT_APP_BACKEND_URL`.
- The root-level `server.ts` + `src/` + root `package.json` are the **legacy** TypeScript/Express/SQLite stack that was migrated away. They are not the primary product; ignore them unless explicitly asked.

### Required environment (already provisioned in the VM snapshot)
- MongoDB 8.0 is installed but **not auto-started** (it is a service; the update script does not start it).
- The code hardcodes several `/app/...` paths (e.g. `backend/routes/experts.py`, `backend/routes/wallets.py`, test helpers). A symlink **`/app -> /workspace`** makes them resolve. Recreate it if missing: `sudo ln -sfn /workspace /app`.
- Backend deps live in a virtualenv at `backend/venv` (gitignored). `emergentintegrations` is installed from an extra index (see update script) and is imported at startup by `routes/ai.py`, `routes/payments.py`, `routes/passport_scan.py`, `routes/stripe_webhook.py` — the backend will not boot without it.
- Env files are **gitignored** and live only in the VM (not in git): `backend/.env` (`MONGO_URL`, `DB_NAME`, optional `JWT_SECRET`/`EMERGENT_LLM_KEY`/`STRIPE_API_KEY`) and `frontend/.env` (`REACT_APP_BACKEND_URL=http://localhost:8001`, `DISABLE_VISUAL_EDITS=true`).

### Starting the services (run each in its own background shell; nothing is auto-started)
1. MongoDB: `mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --bind_ip 127.0.0.1 --port 27017`
2. Backend: `cd backend && ./venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001` (seeds the DB on first startup: admin user, 1543 airports, hotels, etc.)
3. Frontend: `cd frontend && BROWSER=none yarn start`

Health checks: `curl localhost:8001/api/health` and `curl -s -o /dev/null -w '%{http_code}' localhost:3000`.

Seeded admin login: `testadmin@example.com` / `password123`.

### Gotcha: frontend visual-edits babel plugin
`frontend/craco.config.js` enables an Emergent "visual edits" babel metadata plugin
(`frontend/plugins/visual-edits/`) during dev. That plugin has a latent crash
(`TypeError: Cannot read properties of null (reading 'traverse')` in
`babel-metadata-plugin.js`) that breaks `yarn start` compilation on some files.
It is dev-only tooling, not application logic. It is disabled here via
`DISABLE_VISUAL_EDITS=true` in `frontend/.env`, which is honored by an added gate
in `craco.config.js`. **If that `craco.config.js` change is not merged**, the env
flag is ignored and `yarn start` will crash again — keep both together.

### Tests & lint
- Backend tests are **integration tests** that hit a running backend; start MongoDB + backend first, then:
  `cd backend && REACT_APP_BACKEND_URL=http://localhost:8001 ./venv/bin/python -m pytest tests/ -q`
  A few tests in `tests/test_airports.py` are stale vs. the current dataset (they hardcode `452` airports while the repo seeds 1543, and expect a `testuser@demo.com` account that is not seeded) — these failures are pre-existing, not environment problems.
- Backend lint (error level): `cd backend && ./venv/bin/python -m flake8 --select=E9,F63,F7,F82 --exclude=venv .`
- Frontend lint runs automatically inside the CRA/craco compile (eslint warnings appear in the `yarn start` output).
