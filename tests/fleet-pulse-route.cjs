const assert = require('node:assert/strict');
const fs = require('node:fs');

const caddy = fs.readFileSync('ops/caddy/defxn-site.caddy', 'utf8');
const pulse = caddy.indexOf('@fleetPulse path /api/fleet-pulse');
const admin = caddy.indexOf('@adminProxy path');
assert(pulse > 0 && pulse < admin, 'the pulse handler must precede the broad /api/* admin proxy');
assert(/handle @fleetPulse\s*\{[\s\S]*rewrite \* \/pulse\.json[\s\S]*reverse_proxy 162\.35\.26\.46:19502[\s\S]*\}/.test(caddy), 'the public route proxies only the pulse resource');
for (const file of ['js/pages/monitor.js', 'js/pages/stats.js']) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!source.includes('http://162.35.26.46:19502'), file + ' must not fetch the raw HTTP endpoint');
  assert(source.includes('ArkPulse.get()'), file + ' must use the shared pulse client');
}
for (const file of ['scripts/serve-site.mjs', 'scripts/publish-host.mjs']) {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes("'/api/fleet-pulse'"), file + ' must serve the same local pulse route as production');
  assert(source.includes('proxyFleetPulse'), file + ' must use the centralized bounded proxy');
}
const home = fs.readFileSync('js/pages/home.js', 'utf8');
assert(home.includes('ArkPulse.get()') && home.includes('not cumulative ledger growth'), 'home renders live capacity without calling it cumulative growth');
assert(fs.readFileSync('js/pages/catalog.js', 'utf8').includes("'js/ark/pulse-client.js', 'js/pages/home.js'"), 'home loads the shared pulse client');
console.log('PASS: /api/fleet-pulse is ordered safely and both browser surfaces use the shared client.');
