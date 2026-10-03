// Runs the site tests from the site directory, whatever directory this is called from.
// The tests read site files by relative path, so they fail with ENOENT anywhere else.
//
//   node scripts/run-tests.mjs                    every test, one at a time
//   node scripts/run-tests.mjs operator-states    only tests whose file name starts with a given word
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2);
const files = fs.readdirSync(path.join(SITE, 'tests')).filter((file) => /\.(cjs|mjs)$/.test(file))
  .filter((file) => !only.length || only.some((name) => file.startsWith(name)));

let failed = 0;
for (const file of files) {
  const args = file.endsWith('.test.mjs') ? ['--test', `tests/${file}`] : [`tests/${file}`];
  const run = spawnSync(process.execPath, args, { cwd: SITE, encoding: 'utf8', timeout: 120000 });
  if (run.status === 0) { console.log(`ok   ${file}`); continue; }
  failed += 1;
  console.log(`FAIL ${file}\n${(run.stdout + run.stderr).slice(-1500)}`);
}
console.log(`${files.length - failed} of ${files.length} passed`);
process.exit(failed ? 1 : 0);
