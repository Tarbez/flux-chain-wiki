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

/* spawnSync's default maxBuffer is 1 MB, and on overflow it kills the child with SIGTERM. Found 2026-10-27:
   tests/ssr-render.cjs and tests/page-styles-routes.cjs write 1.35 and 1.49 MB of jsdom "Not implemented:
   getComputedStyle ... pseudo-elements" notices to stderr, so both were killed long before their guards (ssr-render
   at 51 s) and reported as 20- and 30-minute guard kills -- a test that finishes read as a hang. The buffer is sized well past any test's output. */
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

let failed = 0;
for (const file of files) {
  const args = file.endsWith('.test.mjs') ? ['--test', `tests/${file}`] : [`tests/${file}`];
  const started = Date.now();
  const run = spawnSync(process.execPath, args, { cwd: SITE, encoding: 'utf8', timeout: guardMs(file), maxBuffer: MAX_OUTPUT_BYTES });
  if (run.status === 0) { console.log(`ok   ${file}`); continue; }
  failed += 1;
  // a guard kill is not the test's own verdict: say so, or it reads as whatever the output last said
  const overflow = run.error && run.error.code === 'ENOBUFS';
  const killed = overflow ? `\n(killed by ${run.signal} after ${Date.now() - started} ms: its output passed the ${MAX_OUTPUT_BYTES}-byte run-tests buffer -- the test did not finish, it did not fail an assertion)`
    : run.signal ? `\n(killed by ${run.signal} after the ${guardMs(file)} ms run-tests guard -- the test did not finish, it did not fail an assertion)` : '';
  console.log(`FAIL ${file}\n${(run.stdout + run.stderr).slice(-1500)}${killed}`);
}
console.log(`${files.length - failed} of ${files.length} passed`);
process.exit(failed ? 1 : 0);
