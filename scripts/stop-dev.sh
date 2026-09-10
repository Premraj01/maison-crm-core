#!/usr/bin/env bash
# Stops the Maison dev servers — the NestJS API, the Vite server, and the
# --watch supervisors behind them.
#
# Everything is matched against THIS repository's absolute path, so a Nest or
# Vite server belonging to another project on this machine is left alone. The
# port sweep at the end is scoped to the two ports this stack uses, and prints
# whatever it kills, because a port can be held by something unrelated.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 3000 = NestJS API, 8080 = Vite, 8081+ = Vite's fallbacks when 8080 is taken.
PORTS=(3000 8080 8081 8082)

killed=0

describe() { ps -p "$1" -o command= 2>/dev/null | cut -c1-88; }

# Supervisors first: killing the API alone would let `nest --watch` restart it.
for pattern in \
  "${REPO_ROOT}/backend/node_modules/.bin/nest" \
  "${REPO_ROOT}/frontend/node_modules/.bin/vite" \
  "${REPO_ROOT}/backend/dist/main"
do
  for pid in $(pgrep -f "$pattern" 2>/dev/null || true); do
    # Never kill this script or the npm run that invoked it.
    [ "$pid" = "$$" ] && continue
    echo "  watcher  pid ${pid}  $(describe "$pid")"
    kill "$pid" 2>/dev/null || true
    killed=1
  done
done

sleep 1

# Anything still holding a port — a detached `node dist/main.js`, say.
for port in "${PORTS[@]}"; do
  for pid in $(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true); do
    echo "  port ${port}  pid ${pid}  $(describe "$pid")"
    kill "$pid" 2>/dev/null || true
    killed=1
  done
done

if [ "$killed" -eq 0 ]; then
  echo "Nothing to stop."
  exit 0
fi

sleep 2

still_up=""
for port in "${PORTS[@]}"; do
  lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1 && still_up="${still_up} ${port}"
done

if [ -n "$still_up" ]; then
  echo "Still listening on:${still_up} — force with:"
  echo "  lsof -ti tcp:${still_up// /,tcp:} | xargs kill -9"
  exit 1
fi

echo "Stopped."
