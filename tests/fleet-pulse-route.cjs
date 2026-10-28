const assert = require('node:assert/strict');
const fs = require('node:fs');

const caddy = fs.readFileSync('ops/caddy/defxn-site.caddy', 'utf8');
const pulse = caddy.indexOf('@fleetPulse path /api/fleet-pulse');
const admin = caddy.indexOf('@adminProxy path');
assert(pulse > 0 && pulse < admin, 'the pulse handler must precede the broad /api/* admin proxy');
assert(/handle @fleetPulse\s*\{[\s\S]*rewrite \* \/pulse\.json[\s\S]*reverse_proxy 162\.35\.26\.46:19502[\s\S]*\}/.test(caddy), 'the public route proxies only the pulse resource');
for (const file of ['js/pages/stats.js']) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!source.includes('http://162.35.26.46:19502'), file + ' must not fetch the raw HTTP endpoint');
  assert(source.includes('ArkPulse.get()'), file + ' must use the shared pulse client');
}
for (const file of ['scripts/serve-site.mjs', 'scripts/publish-host.mjs']) {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes("'/api/fleet-pulse'"), file + ' must serve the same local pulse route as production');
  assert(source.includes('proxyFleetPulse'), file + ' must use the centralized bounded proxy');
}
/* The home page (the 3D world home since the owner confirmed it on 2026-10-27) reads no live pulse: its rail shows
   one dated benchmark run (js/content/capabilities-data.js), named as one run with its date. The old check here
   ("home renders live capacity without calling it cumulative growth", via ArkPulse) guarded a live tile the world
   home no longer has. What still applies: home never fetches the raw HTTP endpoint, loads no pulse client it does
   not use, and does not present the dated run as live. */
const home = fs.readFileSync('js/pages/home.js', 'utf8') + fs.readFileSync('js/world/rail-capabilities.js', 'utf8');
assert(!home.includes('162.35.26.46') && !/ArkPulse|fleet-pulse/.test(home), 'home reads no live pulse and never the raw HTTP endpoint');
assert(/zero: \{ module: 'zero', scripts: \[(?![^\]]*pulse-client)[^\]]*\] \}/.test(fs.readFileSync('js/pages/catalog.js', 'utf8')), 'home loads no pulse client it does not use');
const railWords = Object.entries(JSON.parse(/ArkManifest\.define\(([\s\S]*)\);\s*$/.exec(fs.readFileSync('js/content/manifests/home.js', 'utf8'))[1]).fields)
  .filter(([key]) => key.startsWith('WORLD.RAIL.')).map(([, field]) => field.value);
assert(/esc\(words\.oneRun\) \+ ' · ' \+ D\.fleet\.nodes/.test(home), 'the rail names its figures as one run, with its size and date');
assert(!/(^|[^-\w])live\b/i.test(home.replace(/\/\*[\s\S]*?\*\//g, '') + railWords.join(' ')), 'nothing on the rail calls the dated run live');
console.log('PASS: /api/fleet-pulse is ordered safely, the stats pages use the shared client, and the world home reads no pulse and shows its run as one dated run.');
