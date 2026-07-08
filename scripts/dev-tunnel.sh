#!/usr/bin/env bash
# Brings up the app + Postgres stack and exposes it via a Cloudflare Quick
# Tunnel for local Stripe webhook testing. No domain, no DNS change, no
# Cloudflare account, no risk to sweetdreamsrvrentals.com (see punch list
# Section 1). The printed https://*.trycloudflare.com URL is ephemeral and
# changes every run, so re-register it as the Stripe webhook endpoint
# (Dashboard > Developers > Webhooks) each time this restarts.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d --build

echo "Waiting for app health check..."
until curl -sf http://127.0.0.1:3000/api/health > /dev/null; do sleep 1; done

echo "App healthy. Starting Cloudflare Quick Tunnel..."
exec cloudflared tunnel --url http://localhost:3000
