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

echo "==> Syncing public site files to ${HOST}:/srv/defxn-site (CMS editor excluded; its shared Auth Kit/UI primitives are not)"
# js/admin/ holds both the private CMS editor (admin.js, publish.js, crypto.js,
# store.js, gate.js -- genuinely local-only, see admin.html/account.js's own
# "Local CMS editing is available on this machine" copy) AND a few generic,
# public-facing primitives that happen to be built into the same directory:
# the Auth Kit (auth.js, used by the public /account page) and the shared
# <flux-authorization-dialog> bundle + its view-model (vendor/flux-elements.js,
# authorization-view.js, used by both /account and the identity broker,
# broker.html). A blanket `--exclude='js/admin/'` silently dropped all three --
# /account's sign-in panel kept working only because an OLDER copy of auth.js
# already happened to be on the server from before this exclude existed; any
# update to it, and broker.html entirely, never shipped. The includes below
# must come before the broader exclude -- rsync filter rules are first-match.
# docs/ is mostly internal (design audits, implementation plans) and stays
# excluded -- but docs/status.md and docs/evidence/* are publicly linked
# (the home page's status rail, the new /stats page) and must ship. Found
# live 2026-10-06: the blanket `--exclude='docs/'` meant rsync's own
# --delete never touched that path either, so the copy already on the
# server was whatever existed there from BEFORE this exclude was added --
# silently frozen, never updated by any deploy since. Same "includes
# before the broader exclude" discipline as js/admin/ above.
rsync -az --delete \
  --include='js/admin/' --include='js/admin/auth.js' --include='js/admin/authorization-view.js' \
  --include='js/admin/vendor/' --include='js/admin/vendor/*' \
  --include='docs/' --include='docs/status.md' --include='docs/WHITEPAPER.md' --include='docs/evidence/' --include='docs/evidence/*' \
  --exclude='.git' --exclude='.vercel' --exclude='.gitignore' --exclude='.vercelignore' \
  --exclude='.DS_Store' --exclude='admin.html' --exclude='admin-app.html' \
  --exclude='js/admin/*' --exclude='scripts/' --exclude='tests/' --exclude='docs/*' \
  --exclude='legacy/' --exclude='undefined/' --exclude='gateway/' --exclude='ops/' \
  --exclude='README.md' --exclude='Flux Chain Admin.command' --exclude='node_modules/' \
  "$REPO_ROOT/" "$HOST:/srv/defxn-site/"

echo "==> Syncing *.defxn.com gateway shell to ${HOST}:/srv/defxn-gateway"
rsync -az --delete "$REPO_ROOT/gateway/" "$HOST:/srv/defxn-gateway/"

echo "==> Done. Verify with: ssh ${HOST} 'ls /srv/defxn-site /srv/defxn-gateway'"
