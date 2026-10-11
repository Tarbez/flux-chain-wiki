#!/usr/bin/env node
/* Public, read-only dense-wire chain pulse behind defxn.com /api/chain-pulse
   (see ops/caddy/defxn-site.caddy's @chainPulse block). Sibling to
   fleet-status-api.mjs (the OLDER ark-miner-cli quorum health feed) and
   pulse.json (the ops-pulse throughput feed on flx-bk2:19502) -- this is a
   THIRD, separate mesh: the dense-wire chain-server that serves
   nodes.defxn.com over wss:// and the raw TCP line protocol on :19500.

   Scope is deliberately narrow, same discipline as fleet-status-api.mjs:

     - LIVE and real: the currently-pending segment's signer-vote fraction
       (SEG_LATEST's `have/need`), read by opening a plain TCP connection to
       one chain-server node and sending `SEG_SUB\t\n`. This is one of two
       aggregate numbers the wire protocol exposes today -- committee
       liveness (which of the 10 configured signers are individually live)
       still has no wire command, even though the server holds that data
       internally. Reporting a per-node committee-liveness count would still
       be inventing a capability the backend does not have.

     - LIVE and real, added 2026-10-11: `peerCount` -- how many WebSocket
       connections (browsers, the fxn-browser app, any client) CHAIN_HOST
       has open RIGHT NOW. This is a live connection count, not a chain
       record: it goes up when an app opens and down when it closes, unlike
       a KSUP1/PeerAnnounce supporter record, which is permanent once
       written to the chain. One node's count is NOT the fleet's count --
       nodes.defxn.com (what the fxn-browser app and web bundle actually
       connect to) resolves to ONE node (flx-hel1), not whichever node
       happens to serve this pulse, so peerCount is read from CHAIN_HOST,
       the same node SEG_SUB above already targets -- not from 127.0.0.1.

       PEER_COUNT was originally wired only into the WS listener's dispatch
       (port 19501), which is 127.0.0.1-only on every node -- unreachable
       from here if this script runs on a DIFFERENT node than the one
       nodes.defxn.com resolves to (it does: defxn.com round-robins
       flx-bk2/flx-mk2, nodes.defxn.com is flx-hel1 alone). Fixed the same
       day by also wiring PEER_COUNT into the raw admission port's dispatch
       (handle_connection in chain_server.rs), which IS reachable by IP from
       anywhere -- same door SEG_SUB already uses. Plain `PEER_COUNT\n` over
       that raw connection, no WS handshake needed; see git history for the
       dead hand-rolled WS client this replaced.

     - LIVE and real after Track 23's `ROSTER_STATUS` wire command:
         supporterCount: distinct live supporter records on CHAIN_ID.
         providerCount: distinct live provider records on CHAIN_ID.
       These are heartbeat-scoped roster records, not open sockets, and stay
       null when the serving node has not deployed the command yet.

     - LIVE and real after Track 24's `CHAIN_LIST`/`NATIVE_BALANCE` wire
       commands, added 2026-10-11: `sovereignChains` -- every chain this
       node has activated, each with its real launch supply split and a
       `computeCredited` number derived from two real reads, never stored
       as its own counter: `computeCredited = computeRewardSupply -
       currentReserveBalance`, where `currentReserveBalance` is read live
       from `NATIVE_BALANCE` on that chain's `compute-reserve:<chain-id>`
       holder. The reserve only ever decreases (`native_ledger::
       credit_from_reserve` is the sole function that writes it a
       negative row), so this difference is exactly "how many compute
       units this chain has paid out so far" -- not a guess, not cached,
       read fresh every poll. An empty `sovereignChains: []` is the honest
       answer when no chain has launched on this node (true on production
       as of 2026-10-11), never `null` -- `CHAIN_LIST` itself answered,
       it just listed nothing.

     - NOT built, and reported as such, never as 0 or guessed:
         committeeLiveness: null  -- needs a new wire command exposing
           SegmentVote.signer per pending root; does not exist yet.
       It stays `null` until that work is actually done -- do not backfill it
       with a plausible-looking number.

   "Never report a capability that does not exist as 0": an unreachable
   chain-server is `reachable: false`, not a have/need of 0/0, and a node
   that cannot be reached for PEER_COUNT reports `peerCount: null`, not 0. */
import { createServer } from 'node:http';
import { createConnection } from 'node:net';

const PORT = Number(process.env.PORT || 8770);
const HOST = process.env.HOST || '127.0.0.1';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const CONNECT_TIMEOUT_MS = 4000;

// The real, currently-serving dense-wire node this pulse reads from -- for
// both the segment have/need (segment_coord.rs is shared chain state, not
// per-node, so any node would do) AND peerCount (which IS per-node, but
// this is deliberately the SAME node nodes.defxn.com resolves to, since
// that is where the fxn-browser app and the web bundle actually connect).
const CHAIN_HOST = process.env.CHAIN_PULSE_HOST || '37.27.158.180';
const CHAIN_PORT = Number(process.env.CHAIN_PULSE_PORT || 19500);
const CHAIN_ID = process.env.CHAIN_PULSE_CHAIN_ID || 'defxn';

let snapshot = { generatedAt: null, reachable: false, segment: null, committeeLiveness: null, supporterCount: null, providerCount: null, rosterChainId: CHAIN_ID, peerCount: null, peerCountMax: null, peerCountNode: CHAIN_HOST, pollErrors: 0, sovereignChains: null };

function readPeerCount() {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host: CHAIN_HOST, port: CHAIN_PORT });
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('timeout')); }, CONNECT_TIMEOUT_MS);
    let buf = '';
    sock.on('connect', () => sock.write('PEER_COUNT\n'));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const line = buf.split('\n')[0];
      const parts = line.split('\t');
      if (parts[0] === 'PEER_COUNT' && parts.length >= 3) {
        clearTimeout(timer);
        sock.destroy();
        resolve({ count: Number(parts[1]), max: Number(parts[2]) });
      }
    });
    sock.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function readOneSegLatest() {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host: CHAIN_HOST, port: CHAIN_PORT });
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('timeout')); }, CONNECT_TIMEOUT_MS);
    let buf = '';
    sock.on('connect', () => sock.write('SEG_SUB\t\n'));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      for (const line of lines) {
        if (!line) continue;
        const parts = line.split('\t');
        if (parts[0] === 'SEG_LATEST' && parts.length >= 5) {
          clearTimeout(timer);
          sock.destroy();
          const [root, seq, linesCount, fraction] = [parts[1], parts[2], parts[3], parts[4]];
          const [have, need] = fraction.split('/').map(Number);
          resolve({ root, seq: Number(seq), linesCount: Number(linesCount), have, need });
          return;
        }
        if (parts[0] === 'SEG_IDLE') {
          clearTimeout(timer);
          sock.destroy();
          resolve(null); // real state: nothing pending right now, not an error
          return;
        }
      }
    });
    sock.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function readRosterStatus() {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host: CHAIN_HOST, port: CHAIN_PORT });
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('timeout')); }, CONNECT_TIMEOUT_MS);
    let buf = '';
    sock.on('connect', () => sock.write(`ROSTER_STATUS\t${CHAIN_ID}\n`));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const line = buf.split('\n')[0];
      const parts = line.split('\t');
      if (parts[0] === 'ROSTER_STATUS' && parts[1] === CHAIN_ID && parts.length >= 4) {
        const providers = Number(parts[2]);
        const supporters = Number(parts[3]);
        if (!Number.isSafeInteger(providers) || providers < 0 || !Number.isSafeInteger(supporters) || supporters < 0) {
          clearTimeout(timer);
          sock.destroy();
          reject(new Error(`malformed roster counts: ${line}`));
          return;
        }
        clearTimeout(timer);
        sock.destroy();
        resolve({ providers, supporters });
      } else if (parts[0] === 'ROSTER_ERR' || parts[0] === 'ERR') {
        clearTimeout(timer);
        sock.destroy();
        reject(new Error(line));
      }
    });
    sock.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function readLine(write, matchHead) {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host: CHAIN_HOST, port: CHAIN_PORT });
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('timeout')); }, CONNECT_TIMEOUT_MS);
    let buf = '';
    sock.on('connect', () => sock.write(write));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const line = buf.split('\n')[0];
      const parts = line.split('\t');
      if (parts[0] === matchHead) {
        clearTimeout(timer);
        sock.destroy();
        resolve(parts);
      } else if (parts[0] && parts[0].endsWith('_UNKNOWN')) {
        clearTimeout(timer);
        sock.destroy();
        resolve(null); // a real, honest "not minted here" -- not an error
      }
    });
    sock.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/** `NATIVE_BALANCE\t<chainId>\t<holder>` -> the held amount, or `null` if
 *  this node never minted that chain's supply (a real answer, not a
 *  failure -- see `native_ledger::balance`'s own `None` contract). */
function readNativeBalance(chainId, holder) {
  return readLine(`NATIVE_BALANCE\t${chainId}\t${holder}\n`, 'BALANCE').then(
    (parts) => (parts ? Number(parts[3]) : null),
  );
}

/** `CHAIN_LIST\t` -> every sovereign chain this node has activated, each
 *  with the real supply split its own launch descriptor committed to --
 *  see `chain_server.rs::chain_list_reply` for the exact wire shape. */
function readChainList() {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host: CHAIN_HOST, port: CHAIN_PORT });
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('timeout')); }, CONNECT_TIMEOUT_MS);
    let buf = '';
    sock.on('connect', () => sock.write('CHAIN_LIST\t\n'));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      if (!buf.includes('CHAIN_LIST_END\n')) return;
      clearTimeout(timer);
      sock.destroy();
      const lines = buf.split('\n').filter(Boolean);
      const header = lines[0].split('\t');
      if (header[0] !== 'CHAIN_LIST') { reject(new Error(`unexpected CHAIN_LIST reply: ${lines[0]}`)); return; }
      const count = Number(header[1]);
      const chains = lines.slice(1, 1 + count).map((line) => {
        const [, chainId, tokenSymbol, totalSupply, distributedSupply, computeRewardSupply, treasuryKey] = line.split('\t');
        return {
          chainId, tokenSymbol,
          totalSupply: Number(totalSupply),
          distributedSupply: Number(distributedSupply),
          computeRewardSupply: Number(computeRewardSupply),
          treasuryKey,
        };
      });
      resolve(chains);
    });
    sock.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/** Every launched chain, each with a live `computeCredited` number
 *  derived from two real reads (never a stored/cached counter) -- see
 *  the file header's "LIVE and real after Track 24" note. One chain's
 *  balance read failing (e.g. this node never minted it, despite
 *  CHAIN_LIST listing it from a different replica's view) reports that
 *  one chain's `computeCredited: null` rather than failing the whole
 *  response. */
async function readSovereignChains() {
  const chains = await readChainList();
  return Promise.all(chains.map(async (chain) => {
    const [treasuryBalance, reserveBalance] = await Promise.all([
      readNativeBalance(chain.chainId, chain.treasuryKey).catch(() => null),
      readNativeBalance(chain.chainId, `compute-reserve:${chain.chainId}`).catch(() => null),
    ]);
    return {
      ...chain,
      treasuryBalance,
      computeReserveRemaining: reserveBalance,
      computeCredited: reserveBalance === null ? null : chain.computeRewardSupply - reserveBalance,
    };
  }));
}

async function poll() {
  const [segmentResult, peerCountResult, rosterResult, chainsResult] = await Promise.allSettled([
    readOneSegLatest(), readPeerCount(), readRosterStatus(), readSovereignChains(),
  ]);
  const reachable = segmentResult.status === 'fulfilled' || peerCountResult.status === 'fulfilled' || rosterResult.status === 'fulfilled' || chainsResult.status === 'fulfilled';
  snapshot = {
    generatedAt: new Date().toISOString(),
    reachable,
    segment: segmentResult.status === 'fulfilled' ? segmentResult.value : null,
    committeeLiveness: null, // not built -- see file header
    supporterCount: rosterResult.status === 'fulfilled' ? rosterResult.value.supporters : null,
    providerCount: rosterResult.status === 'fulfilled' ? rosterResult.value.providers : null,
    rosterChainId: CHAIN_ID,
    peerCount: peerCountResult.status === 'fulfilled' ? peerCountResult.value.count : null,
    peerCountMax: peerCountResult.status === 'fulfilled' ? peerCountResult.value.max : null,
    peerCountNode: CHAIN_HOST,
    pollErrors: snapshot.pollErrors + (reachable ? 0 : 1),
    sovereignChains: chainsResult.status === 'fulfilled' ? chainsResult.value : null,
    lastError: reachable ? undefined : String((segmentResult.reason || peerCountResult.reason || rosterResult.reason || chainsResult.reason || '')?.message || segmentResult.reason || peerCountResult.reason || rosterResult.reason || chainsResult.reason),
  };
}

function main() {
  poll();
  setInterval(poll, POLL_INTERVAL_MS);

  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.url === '/chain-pulse' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(snapshot));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  server.listen(PORT, HOST, () => {
    console.log(`[chain-pulse-api] listening on ${HOST}:${PORT}, polling ${CHAIN_HOST}:${CHAIN_PORT} every ${POLL_INTERVAL_MS}ms`);
  });
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
