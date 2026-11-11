#!/usr/bin/env bash
# Sends one site cut to a fleet node's Caddy root for defxn.com. Layer: app (the DEFXN site's static deploy).
# Pairs with ark-miner-cli/ops/caddy/install-defxn-site.sh, which installs ops/caddy/defxn-site.caddy, the block
# that serves /srv/defxn-site: run the install script once per node and after each change to that block, then this
# script for every cut.
#
# Owner ruling 2026-11-11: the site is reached two ways. The pack goes to the stores and the FXN browser opens it
# by its name (bundle-deploy). The same folder goes behind Caddy for defxn.com in a plain web browser (this script).
#
# A DRY RUN IS THE DEFAULT. Without --go this script prints every remote command and what would be sent, and
# contacts no machine.
#
# Usage: ops/deploy-defxn-site.sh [--cut <cut folder>] [--go] [--allow-dirty] [--with-gateway] <ssh-alias>
#        ops/deploy-defxn-site.sh --rollback [--go] <ssh-alias>
#        ops/deploy-defxn-site.sh --checks [--cut <cut folder>] [--site <host>] [--ip <node address>]
#   e.g. ops/deploy-defxn-site.sh flx-bk2              (dry run of the newest cut)
#        ops/deploy-defxn-site.sh --go flx-bk2         (sends it), then the same for flx-mk2
#   The nodes are the plan's: flx-bk2 and flx-mk2 (keeper-work/deploy-day.md, "11b. Deploy table for the genesis
#   apps", order 5). The alias is an argument, as in every ops/deploy-*-site.sh.
#
# What ships: a cut made by scripts/cut-site.mjs, never the working tree. Until 2026-11-11 this script sent the
# repo's own files with a long list of rsync excludes. That shipped uncommitted work, could not say what was live,
# and sent no 3D view, because the view is built in fxn-3d and exists only in a cut's stage. From the cut:
#     stage/               the site folder, the same bytes the pack publishes
#     web-only/            what defxn.com serves and the pack leaves out (broker.html)
#     served-files.sha256  one line per served file; it ships with the files, so anyone can check what is live
#   docs/ no longer ships: pages read js/content/reference snapshots (js/pages/reference.js), not docs/.
#
# It refuses, naming what and how to fix: a cut whose verdict is not PASS; a cut whose files no longer match
# served-files.sha256; a cut from a dirty tree (no commit names it), unless --allow-dirty is given.
#
# The switch (the same layout ark-miner-cli/ops/caddy/static-site-release.sh uses):
#     /srv/defxn-site.new   the cut is copied here and checked against served-files.sha256 on the node
#     /srv/defxn-site.prev  the tree that was live; it stays until the next deploy, for --rollback
#     /srv/defxn-site       two renames put .new here. Between them Caddy answers 404 for well under a second.
#   Unchanged files are not sent again (rsync --checksum --link-dest=/srv/defxn-site).
#
# --with-gateway also sends the cut's gateway/ folder to /srv/defxn-gateway, the *.defxn.com shell, as this script
#   always did before. It is no longer the default: the gateway shell is another surface, it has no .prev copy and
#   no rollback here, and a site launch should not move it without being asked.
# --rollback puts /srv/defxn-site.prev back. The tree it replaces stays as /srv/defxn-site.rolled-back.
# --checks fetches the post-deploy URLs from the public site and compares each answer with the cut. --ip <address>
#   asks one node (curl --resolve), because defxn.com answers from two.
set -euo pipefail

GO=0; ALLOW_DIRTY=0; WITH_GATEWAY=0; MODE=deploy; CUT=""; SITE="defxn.com"; IP=""; HOST=""
while [ $# -gt 0 ]; do
  case "$1" in
    --go) GO=1; shift ;;
    --dry-run) GO=0; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --with-gateway) WITH_GATEWAY=1; shift ;;
    --rollback) MODE=rollback; shift ;;
    --checks) MODE=checks; shift ;;
    --cut) CUT="${2:?--cut needs a cut folder}"; shift 2 ;;
    --site) SITE="${2:?--site needs a host name}"; shift 2 ;;
    --ip) IP="${2:?--ip needs an address}"; shift 2 ;;
    --*) echo "Refused: unknown option '$1'. Missing: one of --cut, --go, --allow-dirty, --with-gateway, --rollback, --checks, --site, --ip. To fix: read the usage lines at the top of $0. Nothing was sent." >&2; exit 1 ;;
    *) HOST="$1"; shift ;;
  esac
done
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="/srv/defxn-site"
GATEWAY_BASE="/srv/defxn-gateway"

# remote <command>: prints the command; runs it only with --go.
remote() {
  if [ "$GO" -eq 1 ]; then echo "    ssh $HOST '$1'"; ssh "$HOST" "$1"; else echo "    would run: ssh $HOST '$1'"; fi
}

if [ "$MODE" = rollback ]; then
  [ -n "$HOST" ] || { echo "Refused: no node was named. Missing: the ssh alias (flx-bk2 or flx-mk2). To fix: ops/deploy-defxn-site.sh --rollback <ssh-alias>. Nothing was changed." >&2; exit 1; }
  echo "==> Rollback on ${HOST}: ${BASE}.prev becomes ${BASE}; the tree it replaces stays as ${BASE}.rolled-back"
  remote "set -e; test -d ${BASE}.prev || { echo 'Refused: ${BASE}.prev is not there, so there is no earlier cut to go back to.' >&2; exit 1; }; rm -rf ${BASE}.rolled-back; mv ${BASE} ${BASE}.rolled-back; mv ${BASE}.prev ${BASE}; head -c 64 ${BASE}/served-files.sha256 2>/dev/null || echo '(the restored tree has no served-files.sha256: it is from before the cuts)'"
  if [ "$GO" -eq 1 ]; then echo "==> Rolled back. Check: ops/deploy-defxn-site.sh --checks --cut <the cut that is live now>"; else echo "==> Dry run: no machine was contacted. Add --go to roll back."; fi
  exit 0
fi

# The cut: named, or the newest in <repo>/.release.
if [ -z "$CUT" ]; then
  CUT="$(ls -dt "$REPO_ROOT"/.release/site-cut-* 2>/dev/null | head -1 || true)"
  [ -n "$CUT" ] || { echo "Refused: no cut was named and $REPO_ROOT/.release holds none. Missing: a cut folder. To fix: node scripts/cut-site.mjs, or pass --cut <folder>. Nothing was sent." >&2; exit 1; }
fi
CUT="$(cd "$CUT" 2>/dev/null && pwd)" || { echo "Refused: the cut folder does not exist. Missing: a folder made by scripts/cut-site.mjs. To fix: pass --cut <folder>. Nothing was sent." >&2; exit 1; }
for need in MANIFEST.txt served-files.sha256 stage/index.html; do
  [ -f "$CUT/$need" ] || { echo "Refused: $CUT has no $need, so it is not a site cut. Missing: a folder made by scripts/cut-site.mjs. To fix: cut again. Nothing was sent." >&2; exit 1; }
done
mf() { sed -n "s/^$1: //p" "$CUT/MANIFEST.txt" | head -1; }
NAME="$(mf cut)"; VERDICT="$(mf verdict)"; CID="$(mf content-id)"; FILES="$(mf files)"; BYTES="$(mf staged-bytes)"
DIRTY="$(mf dirty-trees)"; WEB_ONLY="$(mf web-only)"; SUMS_SHA="$(mf served-files-sha256)"

# One file of each kind the Caddy block types or caches, taken from the cut, so the checks never name a file that is gone.
pick() { (cd "$CUT/stage" && find . -type f -path "$1" | LC_ALL=C sort | head -1 | sed 's|^\./||'); }
F_CJS="$(pick './fxn-3d/engine/grammar/*.cjs')"; F_MJS="$(pick './fxn-3d/view/js/*.mjs')"; F_DOC="$(pick './fxn-3d/view/edit/*.fxn.gz')"
F_BLOB="$(pick './fxn-3d/view/edit/blob/*.pack')"; F_SHELL="$(sed -n 's/.*src="\/\(js\/bundle\/shell-1\.js?v=[0-9a-f]*\)".*/\1/p' "$CUT/stage/index.html" | head -1)"
F_ROUTE="$(cd "$CUT/stage" && ls fxn/*.html 2>/dev/null | head -1 | sed 's/\.html$//')"
F_OBJECT="$(pick './fxn-3d/view/world/*/index.html')"

checks() {
  local url="https://${SITE}" resolve=()
  [ -n "$IP" ] && resolve=(--resolve "${SITE}:443:${IP}")
  local fail=0
  # expect <path> <what must be true> <grep pattern over "HTTP status + headers">...
  expect() {
    local path="$1" what="$2"; shift 2
    local head; head="$(curl -sI --max-time 15 ${resolve[@]+"${resolve[@]}"} "${url}${path}" | tr -d '\r' || true)"
    local ok=1 pat
    for pat in "$@"; do
      case "$pat" in
        '!'*) printf '%s\n' "$head" | grep -Eiq -- "${pat#!}" && ok=0 ;;
        *) printf '%s\n' "$head" | grep -Eiq -- "$pat" || ok=0 ;;
      esac
    done
    if [ "$ok" -eq 1 ]; then echo "    PASS ${path}: ${what}"; else echo "    FAIL ${path}: ${what}"; printf '%s\n' "$head" | sed 's/^/         | /' | head -14; fail=1; fi
  }
  echo "==> Checks against ${url}${IP:+ at ${IP}} for cut ${NAME}"
  expect "/" "the shell: 200, HTML, asked again each visit, no framing" '^HTTP/[0-9.]+ 200' '^content-type: text/html' '^cache-control: no-cache' '^x-frame-options: DENY' '^x-content-type-options: nosniff' "^content-security-policy:.*media-src 'self'"
  [ -n "$F_ROUTE" ] && expect "/${F_ROUTE}" "a page address answers its own file, with no redirect" '^HTTP/[0-9.]+ 200' '^content-type: text/html' '!^location:'
  # The view is three pages deep (the site frames the view page, which frames an object page, which frames the canvas page). Each
  # must be allowed to frame the next (frame-src 'self') and to be framed by this site (frame-ancestors 'self', SAMEORIGIN), and none
  # may hold an inline script, because script-src is 'self' with no hash. 2026-11-11: a view policy with no frame-src passed every
  # check here while no 3D drew.
  # served <path> <file of the cut> <what>: the served body is the cut's file, byte for byte, and holds no inline script.
  served() {
    local path="$1" file="$2" what="$3" body; body="$(mktemp)"
    curl -s --max-time 30 ${resolve[@]+"${resolve[@]}"} -o "$body" "${url}${path}" || true
    local got want; got="$(shasum -a 256 < "$body" | cut -d' ' -f1)"; want="$(shasum -a 256 < "$file" | cut -d' ' -f1)"
    if [ "$got" = "$want" ]; then echo "    PASS ${path}: the node serves this cut's ${what} (${want:0:16})"; else echo "    FAIL ${path}: the node serves another ${what} (its bytes hash to ${got:0:16}, this cut's to ${want:0:16})"; fail=1; fi
    # an inline script is a <script> tag with no src and with text before its end tag
    local inline; inline="$(tr '\n' ' ' < "$body" | grep -Eo '<script[^>]*>[^<]*' | grep -Ev '^<script[^>]*[[:space:]]src=' | grep -Ev '^<script[^>]*>[[:space:]]*$' | head -1 | cut -c1-80 || true)"
    if [ -z "$inline" ]; then echo "    PASS ${path}: no inline script, so script-src 'self' runs all of it"; else echo "    FAIL ${path}: holds an inline script (${inline}), which script-src 'self' refuses, so the page's 3D does not start. Cut again with the current fxn-3d export."; fail=1; fi
    rm -f "$body"
  }
  local view_headers=('^HTTP/[0-9.]+ 200' '^content-type: text/html' '^x-frame-options: SAMEORIGIN' "^content-security-policy:.*script-src 'self';" "^content-security-policy:.*frame-src 'self'" "^content-security-policy:.*frame-ancestors 'self'" '!^content-security-policy:.*(sha256-|unsafe-eval)')
  expect "/fxn-3d/view/index.html" "the 3D view: 200, HTML, framed by this site only, may frame its object page, scripts from files only" "${view_headers[@]}"
  served "/fxn-3d/view/index.html" "$CUT/stage/fxn-3d/view/index.html" "view page"
  if [ -n "$F_OBJECT" ]; then
    expect "/${F_OBJECT}" "an object page of the view: the same headers (it is framed by the view page and frames the canvas page)" "${view_headers[@]}"
    served "/${F_OBJECT}" "$CUT/stage/${F_OBJECT}" "object page"
  else echo "    FAIL the cut holds no object page under fxn-3d/view/world/: the view has nothing to frame"; fail=1; fi
  [ -n "$F_CJS" ] && expect "/${F_CJS}" "a .cjs module is typed as JavaScript" '^HTTP/[0-9.]+ 200' '^content-type: text/javascript'
  [ -n "$F_MJS" ] && expect "/${F_MJS}" "a .mjs module of the view is typed as JavaScript (and is not rewritten to /js/)" '^HTTP/[0-9.]+ 200' '^content-type: text/javascript'
  [ -n "$F_DOC" ] && expect "/${F_DOC}" "a 3D document: stored bytes, no Content-Encoding, kept for a year" '^HTTP/[0-9.]+ 200' '!^content-encoding:' '^cache-control:.*immutable' "^content-length: $(wc -c < "$CUT/stage/$F_DOC" | tr -d ' ')\$"
  [ -n "$F_BLOB" ] && expect "/${F_BLOB}" "a mesh pack: bytes, kept for a year" '^HTTP/[0-9.]+ 200' '^content-type: application/octet-stream' '^cache-control:.*immutable'
  [ -n "$F_SHELL" ] && expect "/${F_SHELL}" "a built bundle asked for with its hash is kept for a year" '^HTTP/[0-9.]+ 200' '^content-type: text/javascript' '^cache-control:.*immutable'
  expect "/broker.html" "the identity broker is served" '^HTTP/[0-9.]+ 200' '^content-type: text/html' '^x-frame-options: DENY'
  expect "/no-such-file-$$.mjs" "a missing file is a 404, never the shell" '^HTTP/[0-9.]+ 404'
  expect "/_headers" "the pack's header file is not served" '^HTTP/[0-9.]+ 404'
  # The cut's shell says <meta name="defxn-host" content="static">, so the site asks no /api/session. /api/* still goes to the admin
  # host (127.0.0.1:3437, the CMS editor's own API), and its answer is printed, not judged: no public page depends on it.
  echo "    NOTE /api/session: $(curl -sI --max-time 15 ${resolve[@]+"${resolve[@]}"} "${url}/api/session" | head -1 | tr -d '\r') (the admin host's API; a cut's pages do not ask for it)"
  if grep -q '<meta name="defxn-host" content="static"' "$CUT/stage/index.html"; then echo "    PASS the cut's shell names a static host, so no page asks /api/session"; else echo "    FAIL the cut's shell has no <meta name=\"defxn-host\" content=\"static\">: every page would ask /api/session"; fail=1; fi
  # Which cut is live: the served shell is this cut's shell, byte for byte (its built bundles carry their hashes, so another cut has
  # another shell). The list itself is checked on the node's disk at deploy time and is not served (2026-11-11).
  served "/" "$CUT/stage/index.html" "shell"
  expect "/served-files.sha256" "the deploy's own list is not served" '^HTTP/[0-9.]+ 404'
  echo "    BY EYE, in a plain browser and in the FXN browser. THIS IS THE TRUE PROOF: no check above shows that the 3D draws. The home posts 'held HEROIN' and shows its 12 stone words; a topic page's object lands in its slot; /auth opens; the console shows no CSP refusal and no module type error."
  return "$fail"
}

if [ "$MODE" = checks ]; then
  checks && echo "==> Every check passed." || { echo "==> A check failed. Roll back with: ops/deploy-defxn-site.sh --rollback --go <ssh-alias>" >&2; exit 1; }
  exit 0
fi

[ -n "$HOST" ] || { echo "Refused: no node was named. Missing: the ssh alias (flx-bk2 or flx-mk2). To fix: ops/deploy-defxn-site.sh [--go] <ssh-alias>. Nothing was sent." >&2; exit 1; }
echo "==> Cut ${NAME}: ${FILES} files, ${BYTES} bytes, content ID ${CID}"
echo "    from ${CUT}"
if [ "$VERDICT" != PASS ]; then
  # No flag sends a refused cut. A dry run goes on, so the steps can be read before the cut is fixed.
  if [ "$GO" -eq 1 ]; then echo "Refused: this cut's verdict is ${VERDICT:-missing}, so its own checks did not pass. Missing: a cut with verdict PASS. To fix: read $CUT/FINDINGS.txt, fix what it names, and cut again. Nothing was sent." >&2; exit 1; fi
  echo "!!!! THIS CUT'S VERDICT IS ${VERDICT:-missing}: $(sed -n 's/^check: \([a-z0-9-]*\) FAIL .*/\1/p' "$CUT/MANIFEST.txt" | tr '\n' ' ')failed. With --go it is refused, and no flag sends it. A dry run goes on." >&2
fi

if [ "$DIRTY" != none ]; then
  echo "!!!! DIRTY TREES: ${DIRTY}. This cut holds work no commit names." >&2
  sed -n 's/^git: /!!!!   /p' "$CUT/MANIFEST.txt" >&2
  if [ "$GO" -eq 1 ] && [ "$ALLOW_DIRTY" -ne 1 ]; then
    echo "Refused: a cut from a dirty tree is not sent, so what a node serves is always a commit you can name. Missing: clean trees in ${DIRTY}. To fix: commit them and cut again, or pass --allow-dirty to send this cut anyway. Nothing was sent." >&2
    exit 1
  fi
  [ "$GO" -eq 1 ] || echo "!!!! A dry run goes on. With --go this cut is refused unless --allow-dirty is given." >&2
fi

echo "==> Checking the cut against its own served-files.sha256 (on this machine)"
WEB_ONLY_RE="^($(printf '%s' "$WEB_ONLY" | sed 's/, */|/g; s/\./\\./g'))\$"
(cd "$CUT" && awk -v re="$WEB_ONLY_RE" '{ rel = substr($0, 67); print substr($0, 1, 66) ((rel ~ re) ? "web-only/" : "stage/") rel }' served-files.sha256 | shasum -a 256 -c --quiet -) || {
  echo "Refused: a file of the cut no longer matches served-files.sha256 (named above). Missing: the cut as it was made. To fix: cut again; never edit a cut. Nothing was sent." >&2; exit 1; }
[ "$(shasum -a 256 "$CUT/served-files.sha256" | cut -d' ' -f1)" = "$SUMS_SHA" ] || { echo "Refused: served-files.sha256 is not the list MANIFEST.txt names. To fix: cut again. Nothing was sent." >&2; exit 1; }
SERVED="$(wc -l < "$CUT/served-files.sha256" | tr -d ' ')"
echo "    ${SERVED} files match."

echo "==> What would be sent to ${HOST}:${BASE}.new/ (${SERVED} files and served-files.sha256):"
(cd "$CUT/stage" && find . -type f | sed 's|^\./||' | awk -F/ '{ top = (NF > 1) ? $1 "/" : "(root files)"; n[top]++ } END { for (t in n) printf "    %6d files  %s\n", n[t], t }' | LC_ALL=C sort -k3)
echo "    $(ls "$CUT/web-only" | wc -l | tr -d ' ') web-only files: $(ls "$CUT/web-only" | tr '\n' ' ')"
echo "    $(du -sk "$CUT/stage" | cut -f1) KiB on disk in stage/. The full list is ${CUT}/served-files.sha256."

RSYNC=(rsync -az --delete --checksum "--link-dest=${BASE}" "$CUT/stage/" "$CUT/web-only/" "$CUT/served-files.sha256" "${HOST}:${BASE}.new/")
echo "==> Steps on ${HOST}"
remote "mkdir -p ${BASE} && rm -rf ${BASE}.new"
if [ "$GO" -eq 1 ]; then echo "    ${RSYNC[*]}"; "${RSYNC[@]}"; else echo "    would run: ${RSYNC[*]}"; fi
remote "cd ${BASE}.new && sha256sum -c --quiet served-files.sha256 && test \"\$(find . -type f | wc -l)\" -eq $((SERVED + 1))"
remote "set -e; rm -rf ${BASE}.prev; mv ${BASE} ${BASE}.prev; mv ${BASE}.new ${BASE}"
if [ "$WITH_GATEWAY" -eq 1 ]; then
  GW=(rsync -az --delete "$CUT/stage/gateway/" "${HOST}:${GATEWAY_BASE}/")
  remote "mkdir -p ${GATEWAY_BASE}"
  if [ "$GO" -eq 1 ]; then echo "    ${GW[*]}"; "${GW[@]}"; else echo "    would run: ${GW[*]}"; fi
else
  echo "    ${GATEWAY_BASE} (the *.defxn.com shell) is left as it is: pass --with-gateway to send the cut's gateway/ folder."
fi

echo "==> The node's Caddy block must be the current ops/caddy/defxn-site.caddy (its @view policy has frame-src 'self' and names no script hash; no node variable is needed). Install it with ark-miner-cli/ops/caddy/install-defxn-site.sh after each change to the block."
echo "==> Post-deploy checks (run them with: ops/deploy-defxn-site.sh --checks --cut ${CUT} [--ip <node address>]):"
echo "    https://${SITE}/                              200, text/html, Cache-Control no-cache, X-Frame-Options DENY, CSP with media-src 'self'"
echo "    https://${SITE}/${F_ROUTE:-<a page address>}   200, text/html, no Location header"
echo "    https://${SITE}/fxn-3d/view/index.html        200, text/html, X-Frame-Options SAMEORIGIN, CSP with script-src 'self', frame-src 'self' and frame-ancestors 'self'; this cut's bytes; no inline script"
echo "    https://${SITE}/${F_OBJECT:-<an object page>}   the same headers; this cut's bytes; no inline script"
echo "    https://${SITE}/${F_CJS:-<a .cjs file>}   200, Content-Type text/javascript"
echo "    https://${SITE}/${F_MJS:-<a .mjs file>}   200, Content-Type text/javascript"
echo "    https://${SITE}/${F_DOC:-<a .fxn.gz file>}   200, no Content-Encoding, Cache-Control immutable, the file's own length"
echo "    https://${SITE}/${F_BLOB:-<a .pack file>}   200, application/octet-stream, Cache-Control immutable"
echo "    https://${SITE}/${F_SHELL:-<a shell bundle>}   200, text/javascript, Cache-Control immutable"
echo "    https://${SITE}/broker.html                   200, text/html"
echo "    https://${SITE}/no-such-file.mjs              404 (never the shell)"
echo "    https://${SITE}/api/session                   printed, not judged: the cut's pages ask no /api/session (meta defxn-host static)"
echo "    https://${SITE}/                              this cut's shell, byte for byte"
echo "    https://${SITE}/served-files.sha256           404 (the list is checked on the node's disk, not served)"
echo "    by eye (the true proof; a 200 on the view page is not): the home posts 'held HEROIN' with its 12 stone words, a topic page's object lands in its slot, /auth opens, the console shows no CSP refusal and no module type error"
echo "==> Rollback: ops/deploy-defxn-site.sh --rollback --go ${HOST}"
echo "    (by hand: ssh ${HOST} 'mv ${BASE} ${BASE}.rolled-back && mv ${BASE}.prev ${BASE}')"

if [ "$GO" -eq 1 ]; then
  echo "==> Live on ${HOST}: cut ${NAME}. The tree before it is ${BASE}.prev."
else
  echo "==> Dry run: nothing was sent and no machine was contacted. Add --go to send this cut."
fi
