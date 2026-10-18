// Runs the site tests from the site directory, whatever directory this is called from.
// The tests read site files by relative path, so they fail with ENOENT anywhere else.
//
//   node scripts/run-tests.mjs                    every test, one at a time
//   node scripts/run-tests.mjs operator-states    only tests whose file name starts with a given word
//
// Only files directly in tests/ run here: tests/browser/ (Chromium drivers, minutes each) is
// deliberately not read -- scripts/run-browser-tests.mjs (npm run test:browser) runs those.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2);
const files = fs.readdirSync(path.join(SITE, 'tests')).filter((file) => /\.(cjs|mjs)$/.test(file))
  .filter((file) => !only.length || only.some((name) => file.startsWith(name)));

/* 120 s per file is a hang guard, not a speed budget. A file whose honest cost is larger
   declares its own guard in its first 4 KB as `run-tests-timeout-ms: <n>`, next to the
   measurement that justifies it -- tests/ssr-render.cjs boots the whole site through jsdom
   ~38 times (about a minute of CPU on an idle M2), so a fixed 120 s killed it whenever the
   machine was shared, and the kill read as a render failure. */
function guardMs(file) {
  const head = fs.readFileSync(path.join(SITE, 'tests', file), 'utf8').slice(0, 4096);
  const declared = /run-tests-timeout-ms:\s*(\d+)/.exec(head);
  return declared ? Number(declared[1]) : 120000;
}

let failed = 0;
for (const file of files) {
  const args = file.endsWith('.test.mjs') ? ['--test', `tests/${file}`] : [`tests/${file}`];
  const run = spawnSync(process.execPath, args, { cwd: SITE, encoding: 'utf8', timeout: guardMs(file) });
  if (run.status === 0) { console.log(`ok   ${file}`); continue; }
  failed += 1;
  // a guard kill is not the test's own verdict: say so, or it reads as whatever the output last said
  const killed = run.signal ? `\n(killed by ${run.signal} after the ${guardMs(file)} ms run-tests guard -- the test did not finish, it did not fail an assertion)` : '';
  console.log(`FAIL ${file}\n${(run.stdout + run.stderr).slice(-1500)}${killed}`);
}
console.log(`${files.length - failed} of ${files.length} passed`);
process.exit(failed ? 1 : 0);
