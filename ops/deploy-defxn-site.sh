#!/usr/bin/env bash
# Syncs the public defxn.com site (this repo's static files, admin surface
# excluded) and the *.defxn.com gateway shell (gateway/) to a fleet node's
# Caddy roots. Pairs with ark-miner-cli/ops/caddy/install-defxn-site.sh and
# install-defxn-wildcard.sh, which install the Caddy config that serves these
# roots -- run the install script(s) once per node, then this script for every
# content update.
#
# Usage: ops/deploy-defxn-site.sh <ssh-alias>
#   e.g. ops/deploy-defxn-site.sh flx-bk2
set -euo pipefail
HOST="${1:?usage: deploy-defxn-site.sh <ssh-host-alias>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Ensuring /srv/defxn-site and /srv/defxn-gateway exist on ${HOST}"
ssh "$HOST" "mkdir -p /srv/defxn-site /srv/defxn-gateway"

echo "==> Syncing public site files to ${HOST}:/srv/defxn-site (admin surface excluded)"
rsync -az --delete \
  --exclude='.git' --exclude='.vercel' --exclude='.gitignore' --exclude='.vercelignore' \
  --exclude='.DS_Store' --exclude='admin.html' --exclude='admin-app.html' \
  --exclude='js/admin/' --exclude='scripts/' --exclude='tests/' --exclude='docs/' \
  --exclude='legacy/' --exclude='undefined/' --exclude='gateway/' --exclude='ops/' \
  --exclude='README.md' --exclude='Flux Chain Admin.command' --exclude='node_modules/' \
  "$REPO_ROOT/" "$HOST:/srv/defxn-site/"

echo "==> Syncing *.defxn.com gateway shell to ${HOST}:/srv/defxn-gateway"
rsync -az --delete "$REPO_ROOT/gateway/" "$HOST:/srv/defxn-gateway/"

echo "==> Done. Verify with: ssh ${HOST} 'ls /srv/defxn-site /srv/defxn-gateway'"
