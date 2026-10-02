#!/bin/bash
# Double-click to edit and publish Flux Protocol from the browser. Starts the local publish host and opens the admin page.
# Needs a running Ark Miner (the Desktop app, or ark-miner-cli); the page tells you if it cannot find one.
# Keep this window open while you work: closing it stops the host.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install Node 22 or newer (https://nodejs.org), then double-click this again."
  read -r -p "Press Return to close." _
  exit 1
fi
node scripts/publish-host.mjs --open
status=$?
if [ $status -ne 0 ]; then read -r -p "The publish host stopped (exit $status). Press Return to close." _; fi
