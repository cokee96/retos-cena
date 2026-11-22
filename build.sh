#!/usr/bin/env bash
set -e

echo "→ Building client..."
cd client
npm ci
npm run build
cd ..

echo "→ Copying client build to server/public..."
mkdir -p server/public
cp -r client/dist/. server/public/

echo "→ Installing server dependencies..."
cd server
npm ci --omit=dev

echo "✓ Build complete"
