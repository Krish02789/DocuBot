#!/usr/bin/env bash
# Production build script — builds the React frontend then the Express API server.
# The API server serves both /api/* and the React app in production.
set -euo pipefail

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Building frontend"
BASE_PATH=/ pnpm --filter @workspace/docubot run build

echo "==> Building API server"
pnpm --filter @workspace/api-server run build

echo "==> Build complete"
