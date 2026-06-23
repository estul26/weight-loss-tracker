# Weight Path 

Private single-user weight-loss and fasting tracker backed by MongoDB. The app stores one date-unique daily check-in, settings, and backups; it is not medical advice.

## Requirements and local run

Use a MongoDB replica set or MongoDB Atlas deployment. Replace-import operations run in a transaction, so standalone MongoDB instances are intentionally rejected at startup.

1. Copy `.env.example` to `.env` and set every secret.
2. Start the application:

```bash
docker compose up --build
```

Open `http://localhost:8080`. Stop it with `docker compose down`.

Environment variables:

- `MONGO_URI` — reachable replica-set or Atlas connection string.
- `MONGO_DB_NAME` — database name; defaults to `weight_path`.
- `APP_PASSWORD` — dedicated password for this app.
- `SESSION_SECRET` — a long random signing secret, e.g. `openssl rand -base64 48`.
- `APP_TIME_ZONE` — IANA timezone used for defaults and future-date validation, e.g. `America/Edmonton`; defaults to `UTC`.
- `WEBAPP_PORT` — host port used by Docker Compose; defaults to `8080`.

## Data model and automatic migration

New deployments use `tracker_settings` for settings and `daily_logs` for date-unique logs. Saves and deletes operate on one log document at a time, so two tabs cannot overwrite unrelated records.

At startup, an older `tracker_state` document is migrated once. Its settings are copied and its logs are copied into `daily_logs`; the original document is retained as rollback evidence. If a legacy log is malformed, startup stops before log writes and reports the record number. Back up MongoDB before deploying, then fix the invalid legacy record or temporarily roll back the image.

The browser-only predecessor is also handled safely: when local records exist, the app offers a one-time merge by date. MongoDB settings remain authoritative, and browser storage is cleared only after the server confirms success. Malformed browser records are never silently deleted; automatic migration pauses and leaves that browser data in place for manual repair/export.

## Backup and restore

History exports CSV or version-2 JSON. Imports are checked in the browser and server for valid dates, clock values, numeric ranges, booleans, enums, duplicate dates, and required CSV columns.

- Imports are limited to **5 MB** and **5,000 records**.
- **Merge** replaces matching dates and leaves MongoDB settings unchanged.
- **Replace** swaps all logs atomically and restores settings from a JSON backup (CSV retains current settings).

Export a JSON backup before any replace import.

## Security and direct HTTP

The supplied deployment intentionally supports direct HTTP and therefore uses non-`Secure`, HTTP-only, SameSite-Strict session cookies. Anyone able to observe the network can read the password, session, and health data. Only use this setup on a trusted private network, never reuse `APP_PASSWORD`, and prefer a domain-backed HTTPS reverse proxy when available.

Helmet, login rate limiting, strict API validation, signed sessions, JSON-only errors, and database-backed health checks are included, but they do not make HTTP confidential.

## Verification

Run the automated checks:

```bash
npm test
npm run build
npm audit --omit=dev
```

Manual release checklist:

1. Start against a replica-set MongoDB and verify `GET /health` succeeds only while MongoDB is reachable.
2. Sign in, save a check-in, refresh, edit it, and delete it; verify one date remains one record.
3. In two tabs, save different dates simultaneously and verify both remain. Save the same date in both tabs and verify the final save is the displayed record.
4. Try a future date, `99:99` time, duplicate-date import, malformed CSV, and a file above 5 MB; each should fail without changing stored data.
5. Export JSON, merge it, then replace from it after taking a fresh backup; verify JSON replace restores its settings and CSV replace preserves current settings.
6. Seed a legacy `tracker_state` document in a staging database, deploy once, and confirm `daily_logs` contains its records while the legacy document remains untouched.
7. Seed `weight-path-data-v1` browser storage, load the app with existing MongoDB logs, move the records, refresh, and confirm the migration prompt does not return.
8. Disconnect MongoDB or block the app temporarily during startup and save/logout; verify the app shows retry or sync-unavailable feedback instead of claiming it is synced.

## VPS deployment from GitHub Actions

The workflow in `.github/workflows/deploy.yml` deploys every push to `main` into `$HOME/weight-path` on the VPS. The deploy user must be allowed to run `docker compose` without `sudo`; Docker and Compose must already be installed.

Create these repository Action secrets:

- `MONGO_URI`
- `SSH_KEY` — private key for `VPS_USER`
- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `WEBAPP_PORT`
- `APP_PASSWORD`
- `SESSION_SECRET`
- `MONGO_DB_NAME` — optional; uses `weight_path` when omitted.
- `APP_TIME_ZONE` — optional but recommended; uses `UTC` when omitted.

The workflow uploads `shared/` alongside the client and server code, builds the Docker image, and verifies `/health`. Allow `WEBAPP_PORT` through the VPS firewall only when the private-network HTTP risk above is acceptable.
