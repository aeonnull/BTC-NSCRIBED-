#!/usr/bin/env bash
# Build the React (CRA/CRACO) frontend and place the output in /public, which
# Vercel serves statically. The FastAPI backend (backend/server.py) runs as the
# serverless function and only handles /api/* routes on Vercel.
set -euo pipefail

echo "==> Building nscribed frontend"
cd frontend
yarn install --frozen-lockfile --network-timeout 600000

# CRA treats warnings as errors when CI=true; mirror the Dockerfile's build flags.
export CI=false
export DISABLE_ESLINT_PLUGIN=true
export GENERATE_SOURCEMAP=false
export NODE_OPTIONS=--max-old-space-size=1024
yarn build
cd ..

echo "==> Publishing build to /public"
rm -rf public
cp -r frontend/build public
echo "==> Done"
