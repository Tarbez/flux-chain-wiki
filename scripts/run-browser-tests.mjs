// Runs the real-browser drivers in tests/browser/, one at a time.
//
//   node scripts/run-browser-tests.mjs                 every driver, sequentially
//   node scripts/run-browser-tests.mjs --only a,b      only these (names without .mjs)
//   node scripts/run-browser-tests.mjs --list          list the drivers and exit
//   node scripts/run-browser-tests.mjs --verbose       stream each driver's output as it runs
//   npm run test:browser [-- --only studio-flows]
//
// Why one at a time: every driver launches its own Chromium (several pages, a preview iframe
// each). Two at once on the 8 GB machine is the OOM pattern, and on a shared machine at load
// average 19-40 parallel drivers measure each other, not the app. So this is sequential, and it
// records the load average when each driver starts and ends: a failure at load 35 is read
// differently from one at load 3 (measurement discipline: state the load with every result).
//
// What is a driver is derived, not listed: a .mjs file in tests/browser/ that imports
// ./harness.mjs (it serves a scratch site through the harness and drives it). harness.mjs and
// site-drafts-fixture.mjs are helpers and are not run.
//
// Ports: nothing is passed. Each driver's harness startHost() asks the OS for a free port, so no
// two drivers -- and no driver and the owner's live server on 3437 -- can collide. PORT is
// removed from the drivers' environment so a PORT exported in the shell cannot pin them all to
// one port.
//
// Each driver's whole output goes to <logs>/<driver>.log (printed at the end); on failure the
// last lines are printed here too. scripts/run-tests.mjs (the unit suite) reads only tests/*
// at the top level and never runs these.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(SITE, 'tests', 'browser');
const CPUS = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 1;

/* a hang guard, not a speed budget: the longest driver (full-audit) takes minutes on an idle
   machine. Multiplied by the same load factor the harness uses, measured when the driver starts. */
const GUARD_MS = 30 * 60 * 1000;
const loadFactor = () => Math.min(6, Math.max(1, os.loadavg()[0] / CPUS));

export function drivers() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.mjs')).sort()
    .filter((f) => /from\s+['"]\.\/harness\.mjs['"]/.test(fs.readFileSync(path.join(DIR, f), 'utf8')))
    .map((f) => f.replace(/\.mjs$/, ''));
}

function runOne(name, logFile, verbose) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    delete env.PORT;
    const started = Date.now(), loadStart = os.loadavg()[0], guard = Math.round(GUARD_MS * loadFactor());
    const log = fs.createWriteStream(logFile);
    const child = spawn(process.execPath, [path.join('tests', 'browser', name + '.mjs')], { cwd: SITE, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '', factor = null, killed = null;
    const take = (chunk) => {
      const text = chunk.toString();
      log.write(text);
      if (verbose) process.stdout.write(text.replace(/^/gm, `  [${name}] `));
      tail = (tail + text).slice(-4000);
      const m = /\[harness\] load factor ([\d.]+)/.exec(text);
      if (m && factor === null) factor = Number(m[1]);
    };
    child.stdout.on('data', take); child.stderr.on('data', take);
    const timer = setTimeout(() => { killed = `killed after the ${Math.round(guard / 1000)} s hang guard`; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 10000).unref(); }, guard);
    child.on('close', (code, signal) => {
      clearTimeout(timer); log.end();
      resolve({ name, ok: code === 0 && !killed, code, signal, killed, ms: Date.now() - started, loadStart, loadEnd: os.loadavg()[0], factor, tail });
    });
  });
}

const pad = (s, n) => String(s).padEnd(n);
const secs = (ms) => (ms / 1000).toFixed(1) + ' s';

async function main() {
  const args = process.argv.slice(2);
  const all = drivers();
  if (args.includes('--list')) { console.log(all.join('\n')); return; }
  let picked = all;
  if (args.includes('--only')) {
    const only = (args[args.indexOf('--only') + 1] || '').split(',').map((s) => s.trim().replace(/\.mjs$/, '')).filter(Boolean);
    const unknown = only.filter((n) => !all.includes(n));
    if (!only.length || unknown.length) {
      console.error(`--only needs driver names from this list (got ${unknown.length ? unknown.join(', ') : 'none'}):\n  ${all.join('\n  ')}`);
      process.exit(2);
    }
    picked = all.filter((n) => only.includes(n));
  }
  const logs = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-browser-tests-'));
  const memGb = (os.totalmem() / 2 ** 30).toFixed(0);
  console.log(`${picked.length} browser driver(s), one at a time, on ${os.hostname()} (${CPUS} CPUs, ${memGb} GB); logs in ${logs}`);
  const results = [];
  for (const name of picked) {
    process.stdout.write(`run  ${name} (load ${os.loadavg()[0].toFixed(1)}) ... `);
    const r = await runOne(name, path.join(logs, name + '.log'), args.includes('--verbose'));
    results.push(r);
    console.log(`${r.ok ? 'ok' : 'FAIL'} in ${secs(r.ms)}`);
    if (!r.ok) console.log(`---- last output of ${name}${r.killed ? ' (' + r.killed + ': the driver did not finish, it did not fail an assertion)' : ''}\n${r.tail.split('\n').slice(-40).join('\n')}\n----`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + [pad('driver', 22), pad('result', 7), pad('time', 9), pad('load start', 11), pad('load end', 9), 'factor'].join(' '));
  for (const r of results) {
    const verdict = r.ok ? 'pass' : r.killed ? 'HUNG' : 'FAIL';
    console.log([pad(r.name, 22), pad(verdict, 7), pad(secs(r.ms), 9), pad(r.loadStart.toFixed(1), 11), pad(r.loadEnd.toFixed(1), 9), r.factor === null ? '-' : r.factor].join(' '));
  }
  console.log(`\n${results.length - failed.length} of ${results.length} passed; 1-min load averages on ${CPUS} CPUs; factor = the load multiplier the driver's harness applied to its waits. Logs: ${logs}`);
  process.exit(failed.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
