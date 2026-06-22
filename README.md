# Weight Path

Private single-user weight-loss and fasting tracker. The production app stores data in MongoDB and requires one app password.

## Local Docker run

1. Copy `.env.example` to `.env` and set a reachable MongoDB connection string, password, and session secret.
2. Start the application:

```bash
docker compose up --build
```

Open `http://localhost:8080`. Stop it with `docker compose down`.

## VPS deployment from GitHub Actions

The workflow in `.github/workflows/deploy.yml` deploys every push to `main` into `$HOME/weight-path` on the VPS. The deploy user must be allowed to run `docker compose` without `sudo`; Docker and Compose must already be installed.

Create these repository Action secrets:

- `MONGO_URI`
- `SSH_KEY` — private key for `VPS_USER`
- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `WEBAPP_PORT` — host port, for example `8080`
- `APP_PASSWORD` — unique password for this app only
- `SESSION_SECRET` — long random secret, for example output from `openssl rand -base64 48`

Allow `WEBAPP_PORT` through the VPS firewall and ensure the MongoDB deployment allows connections from the VPS IP address.

The selected direct-port setup is served as HTTP at `http://VPS_HOST:WEBAPP_PORT`. It is not encrypted; do not reuse the app password and use it only on trusted networks. A domain-backed HTTPS proxy should replace this configuration when available.
