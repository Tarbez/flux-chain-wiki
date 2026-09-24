/* Finding the miner: hermetic (fake miners on random ports, temp home folders); nothing here touches a real miner. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { PublishRefusal, createPublisher, discoverMiner, knownMiners, readMinerKey } from '../scripts/lib/publisher.mjs';

// The built-in ports and folders are the PRODUCTS' defaults. Derive them from the products' source so a change there fails here
// instead of silently sending this tool to a port nothing listens on.
const root = path.resolve(import.meta.dirname, '..', '..');
const desktop = fs.readFileSync(path.join(root, 'ark-miner-desktop/src/main/main.js'), 'utf8');
const cli = fs.readFileSync(path.join(root, 'ark-miner-cli/config/defaults.js'), 'utf8');
const num = (text, re) => Number(text.match(re)[1]);
const expected = {
  desktop: { statusPort: num(desktop, /STATUS_PORT: process\.env\.STATUS_PORT \|\| '(\d+)'/), ipfsPort: num(desktop, /IPFS_PORT: process\.env\.IPFS_PORT \|\| '(\d+)'/) },
  cli: { statusPort: num(cli, /statusPort: env\.STATUS_PORT \? Number\(env\.STATUS_PORT\) : (\d+)/), ipfsPort: num(cli, /ipfsPort: env\.IPFS_PORT \? Number\(env\.IPFS_PORT\) : (\d+)/) },
};
const known = knownMiners('/home/x');
assert.deepEqual([known[0].statusPort, known[0].pinPort], [expected.desktop.statusPort, expected.desktop.ipfsPort + 1000], 'Desktop defaults match ark-miner-desktop');
assert.deepEqual([known[1].statusPort, known[1].pinPort], [expected.cli.statusPort, expected.cli.ipfsPort + 1000], 'CLI defaults match ark-miner-cli (pin API = IPFS port + 1000)');
assert(/ark-miner-runtime/.test(known[0].storage[0]) && /\.ark-miner$/.test(known[1].storage[1]));

const servers = [];
async function fakeMiner(networkId, { ok = true } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/status') { res.writeHead(ok ? 200 : 500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok, network_id: networkId })); }
    else if (req.url.startsWith('/debug/name-record')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, record: null })); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return server.address().port;
}
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'flux-chain-disc-'));
const withKey = (dir, key) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'pin-api-credential.txt'), key + '\n'); return dir; };
const deadPort = await fakeMiner('x'); await new Promise((r) => servers.pop().close(r));

try {
  // Nothing answering names what to start, not a bare connection error.
  await assert.rejects(discoverMiner({ candidates: [{ label: 'A', statusPort: deadPort, pinPort: 1, storage: [home] }], env: {} }),
    (e) => e instanceof PublishRefusal && /No miner is running/.test(e.message) && /Ark Miner Desktop, or run npm start/.test(e.remedy));

  // A miner that answers with an error status is not a miner to publish through.
  const sick = await fakeMiner('sick', { ok: false });
  await assert.rejects(discoverMiner({ candidates: [{ label: 'Sick', statusPort: sick, pinPort: 1, storage: [home] }], env: {} }), /No miner is running/);

  // A live miner with its credential: found, labelled, with the network it belongs to.
  const desktopPort = await fakeMiner('deark-mainnet'), cliPort = await fakeMiner('flux-chain-local-test');
  const desktopStorage = withKey(path.join(home, 'desktop'), 'desktop-key'), cliStorage = withKey(path.join(home, 'cli'), 'cli-key');
  const candidates = [
    { label: 'Desktop', statusPort: desktopPort, pinPort: desktopPort + 1, storage: [path.join(home, 'nope'), desktopStorage] },
    { label: 'CLI', statusPort: cliPort, pinPort: cliPort + 1, storage: [cliStorage] },
  ];
  const found = await discoverMiner({ candidates, env: {} });
  assert.deepEqual([found.label, found.networkId, found.key, found.pinBase], ['Desktop', 'deark-mainnet', 'desktop-key', `http://127.0.0.1:${desktopPort + 1}`], 'first candidate wins; its second storage folder is tried');
  // Only the second is running: the first is skipped, not an error.
  const second = await discoverMiner({ candidates: [{ ...candidates[0], statusPort: deadPort }, candidates[1]], env: {} });
  assert.deepEqual([second.label, second.networkId], ['CLI', 'flux-chain-local-test']);
  // The operator's explicit key wins over a file.
  assert.equal((await discoverMiner({ candidates, env: { FLUX_CHAIN_MINER_KEY: 'from-env' } })).key, 'from-env');

  // Reason this case exists: a miner that answers but whose credential we cannot read must NOT look like "no miner".
  await assert.rejects(discoverMiner({ candidates: [{ label: 'Locked', statusPort: cliPort, pinPort: 1, storage: [path.join(home, 'empty')] }], env: {} }),
    (e) => /is running but cannot be used/.test(e.message) && /pin-api-credential\.txt/.test(e.message) && /FLUX_CHAIN_MINER_KEY/.test(e.remedy) && !/No miner is running/.test(e.message));

  // Reason this case exists: a NAMED folder without a credential once fell back to ~/.ark-miner, i.e. another miner's key.
  const fakeHome = path.join(home, 'fake-home'); withKey(path.join(fakeHome, '.ark-miner'), 'the-cli-key');
  assert.equal(readMinerKey({ home: fakeHome, env: {} }), 'the-cli-key', 'with no folder named, the usual places are tried');
  assert.throws(() => readMinerKey({ storagePath: path.join(home, 'empty'), home: fakeHome, env: {} }), (e) => e instanceof PublishRefusal && /--storage/.test(e.missing), 'a named folder is the only place looked');
  assert.equal(readMinerKey({ storagePath: cliStorage, home: fakeHome, env: {} }), 'cli-key');

  // A publisher whose miner starts LATER: the first status says so, the next one connects, with no restart of the host.
  let live = null;
  const publisher = createPublisher({ name: 'later.ark', miner: async () => { if (!live) throw new PublishRefusal('No miner is running.', 'a miner.', 'start one.', 502); return live; }, root });
  const before = await publisher.status();
  assert.equal(before.reachable, false); assert.match(before.detail, /No miner is running/); assert.equal(before.miner, null);
  live = { label: 'CLI', networkId: 'flux-chain-local-test', statusBase: `http://127.0.0.1:${cliPort}`, pinBase: `http://127.0.0.1:${cliPort + 1}`, key: 'k' };
  const after = await publisher.status();
  assert.equal(after.reachable, true); assert.deepEqual([after.miner.label, after.miner.networkId], ['CLI', 'flux-chain-local-test']); assert.equal(after.current, null);
  console.log('miner discovery ok: defaults match the products; refusals name what to start or supply; a late miner is picked up');
} finally {
  for (const server of servers) await new Promise((r) => server.close(r));
  fs.rmSync(home, { recursive: true, force: true });
}
