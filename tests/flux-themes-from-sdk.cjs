'use strict';
/* css/flux-themes.css is the Dead Ark SDK's role-ladder palette, written by
   scripts/build-flux-themes.cjs and never edited by hand. Named regression
   (docs/ux-audit/brand.md section 5): the palette was generated here AND read by the
   product kit AND hand-copied into Flux Launch, so one colour had three owners and
   Launch drifted to an old Ember. Since 2026-10-19 the SDK owns it; this fails the day
   the file and the SDK disagree, in either direction. */
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const run = spawnSync(process.execPath, ['scripts/build-flux-themes.cjs', '--check'], { encoding: 'utf8' });
if (run.status === 2) {
  /* no SDK with the role-ladder module is reachable: say so, do not pass silently */
  console.log(`NOT BUILT: ${run.stderr.trim()}`);
  process.exit(1);
}
assert.equal(run.status, 0, run.stderr || run.stdout);
console.log(`PASS: ${run.stdout.trim()}`);
