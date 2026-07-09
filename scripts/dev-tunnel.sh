#!/usr/bin/env bash
# Brings up the app + Postgres stack, serves the static site same-origin
# with the API (see dev-server.js - the site's fetch('/api/...') calls need
# that), and exposes the whole thing via a Cloudflare Quick Tunnel. No
# domain, no DNS change, no Cloudflare account, no risk to
# sweetdreamsrvrentals.com (see punch list Section 1). The printed
# https://*.trycloudflare.com URL is ephemeral and changes every run, so
# re-register it as the Stripe webhook endpoint (Dashboard > Developers >
# Webhooks) each time this restarts.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
source .env 2>/dev/null || true
set +a

# Some Synology Container Manager installs only ship the older hyphenated
# docker-compose binary, not the `docker compose` plugin subcommand.
if docker compose version > /dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

"${DC[@]}" up -d --build

echo "Waiting for app health check..."
until curl -sf "http://127.0.0.1:${APP_HOST_PORT:-3000}/api/health" > /dev/null; do sleep 1; done

echo "App healthy. Starting the dev server..."
API_PORT="${APP_HOST_PORT:-3000}" node scripts/dev-server.js &
DEV_SERVER_PID=$!
trap "kill $DEV_SERVER_PID 2>/dev/null" EXIT

until curl -sf http://127.0.0.1:4321/api/health > /dev/null; do sleep 1; done

echo "Dev server up. Starting Cloudflare Quick Tunnel..."
cloudflared tunnel --url http://localhost:4321
