# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **Travo DMC B2B Travel Platform**. The active product is a React
frontend (`frontend/`) + FastAPI backend (`backend/`) + MongoDB. The root-level
Node/TypeScript/Express/SQLite app (`server.ts`, `src/`, root `package.json`,
`index.html`, `vite.config.ts`) is a **legacy pre-migration prototype — do not
run it**; it is superseded by `backend/` + `frontend/`.

### Services (run these for end-to-end work)

| Service | Dir | Dev command | Port |
| --- | --- | --- | --- |
| MongoDB | — | `mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017` | 27017 |
| Backend (FastAPI) | `backend/` | `uvicorn server:app --host 0.0.0.0 --port 8001 --reload` | 8001 |
| Frontend (CRA/CRACO) | `frontend/` | `BROWSER=none yarn start` | 3000 |

Start each long-running service in its own tmux session. There is **no systemd**,
so `mongod` must be started manually (not via `systemctl`/`service`). MongoDB
binaries and the `/data/db` data dir are provisioned during environment setup.

### Non-obvious caveats

- **`/app` symlink is required.** Several files hardcode `/app` as the repo root
  (e.g. `backend/routes/experts.py`, `backend/routes/wallets.py`, and tests that
  read `/app/frontend/.env`). Setup creates `/app -> /workspace`; if the backend
  import fails with `PermissionError: '/app'`, recreate it: `sudo ln -sfn /workspace /app`.
- **`.env` files are gitignored and required.** `backend/.env` needs `MONGO_URL`
  and `DB_NAME` (the backend crashes on import without them). `frontend/.env`
  needs `REACT_APP_BACKEND_URL=http://localhost:8001`. The update script
  recreates both if missing.
- **Visual-edits babel plugin is disabled in dev** via `DISABLE_VISUAL_EDITS=true`
  in `frontend/.env`. The Emergent `plugins/visual-edits/babel-metadata-plugin.js`
  crashes during multi-file dev compiles (`Cannot read properties of null
  (reading 'traverse')`) on the resolved `@babel/traverse`. It is editor-only
  instrumentation and is not needed to run or test the product. The opt-out flag
  lives in `frontend/craco.config.js`; if that change is not merged, the flag has
  no effect and the dev server will fail to compile a few components — keep it.
- **Backend seeds data on startup** (`server.py` `startup_event`): airports,
  cities, hotels, etc. First boot is slightly slower while seeding runs.

### Tests & lint

- Backend tests in `backend/tests/` are **integration tests that hit the live
  backend** — start MongoDB + backend first, then run e.g.
  `REACT_APP_BACKEND_URL=http://localhost:8001 python3 -m pytest backend/tests/test_crud_admin.py`.
  Most test files read `REACT_APP_BACKEND_URL`; some read `BACKEND_URL`. (Note:
  `test_airports.py` asserts an airport count of 452 that is stale vs the current
  seed of 1543 — a data expectation, not an env problem.)
- Frontend lint runs automatically during `yarn start`/`yarn build` (eslint
  `react-hooks` rules; currently emits warnings only).
- Backend lint/format console scripts (`black`, `flake8`, `isort`, `mypy`) are
  installed under `~/.local/bin`, which is not on `PATH`; invoke them as
  `python3 -m black` / `python3 -m flake8` etc.

### Test credentials

See `memory/test_credentials.md` (e.g. admin `testadmin@example.com` /
`password123`).
