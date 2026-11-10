#!/usr/bin/env bash
# Resident Evil 4 3D Simulation Launcher
# Starts both Backend (Port 8000) and Real 3D Horror Engine (Port 5173)

set -e

# Setup devbin path
mkdir -p /tmp/devbin
NODE="/Users/swapnil/Library/pnpm/bin/node"
PNPM_CLI="/Users/swapnil/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs"

ln -sf "$NODE" /tmp/devbin/node
cat << 'EOF' > /tmp/devbin/pnpm
#!/bin/sh
exec "/Users/swapnil/Library/pnpm/bin/node" "/Users/swapnil/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs" "$@"
EOF
chmod +x /tmp/devbin/pnpm

export PATH="/tmp/devbin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "🩸 RESIDENT EVIL 4: 3D HORROR SIMULATION ENGINE"
echo "=========================================================="
echo "Starting Backend on http://localhost:8000..."

# Start FastAPI backend in background
cd "$ROOT"
"$ROOT/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "Shutting down 3D Simulation servers..."
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "Starting Three.js 3D Engine on http://localhost:5173..."
cd "$ROOT/frontend"
pnpm run dev --host 0.0.0.0 --port 5173

