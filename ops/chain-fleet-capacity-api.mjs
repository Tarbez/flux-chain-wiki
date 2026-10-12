#!/usr/bin/env node
/* Public, read-only per-node capacity feed for the dense-wire chain-server
   mesh, behind defxn.com /api/chain-fleet-capacity. Sibling to
   chain-pulse-api.mjs (which reads ONE node -- whichever nodes.defxn.com
   resolves to) and fleet-status-api.mjs (the OLDER, UNRELATED ark-miner-cli
   quorum mesh on ports 18994-19200 -- never conflate the two; see
   docs/deadark_flux_naming_collision in project memory).

   This is the THIRD thing a "fleet" number could mean here: not quorum
   membership, not one node's live segment state, but the dense-wire
   chain-server roster itself -- every node that currently runs
   chain-server, each probed directly by its own IP on :19500 with a plain
   `PEER_COUNT\n` (the same door chain-pulse-api.mjs already uses). A node
   either answers right now or it does not; there is no cached or
   carried-over "it was up an hour ago".

   Roster authored here, in one place -- update here, not duplicated
   elsewhere, if the fleet's membership or role changes. 10 committee
   nodes (quorum-bearing: configured as a CHAIN_SERVER_SEGMENT_SIGNER,
   6-of-10 required to finalize a segment) + 4 peers (bootstrap-only:
   admit and serve, never sign or propose, no outbound replication --
   owner call 2026-10-11, see "Peers only" in session history). Role is
   informational, read from this list, NOT derived from a live probe --
   there is no wire command yet that reports a node's own signer
   membership (same gap chain-pulse-api.mjs's `committeeLiveness: null`
   already documents).

   "Never report a capability that does not exist as 0": a node that
   does not answer is `reachable: false`, not a peerCount of 0.

   MUST run on one of the 10 committee nodes: the 4 peer nodes' ufw
   allows inbound :19500 only from those 10 committee IPs (verified live
   2026-10-12 via `ufw status` on flx-fsn1), not from an arbitrary
   machine. Run this from any other machine and every peer reports
   `reachable: false, error: "timeout"` even though the node is actually
   up -- a real probe failure from that vantage point, not a bug, but
   the wrong vantage point to answer "is the fleet up" with. Deployed on
   flx-bk2 and flx-mk2 (the same two nodes defxn.com round-robins for
   chain-pulse-api.mjs), confirmed both reach all 4 peers correctly.

     node ops/chain-fleet-capacity-api.mjs              # http://127.0.0.1:8780
     PORT=8780 node ops/chain-fleet-capacity-api.mjs
*/
import { createServer } from 'node:http';
import { createConnection } from 'node:net';

const PORT = Number(process.env.PORT || 8780);
const HOST = process.env.HOST || '127.0.0.1';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);
const CONNECT_TIMEOUT_MS = 4000;
const CHAIN_PORT = Number(process.env.CHAIN_FLEET_PORT || 19500);

// The real, currently-deployed chain-server roster as of 2026-10-11 (the
// CHAIN_LEADERBOARD rollout). Committee nodes span 3 providers and two
// architectures (x86_64 everywhere except hel1/hel2, aarch64); peers were
// admitted as bootstrap-only, never signers -- see this file's header.
const NODES = [
  { id: 'bk1', host: '153.75.247.152', role: 'committee' },
  { id: 'bk2', host: '162.35.26.46', role: 'committee' },
  { id: 'mk2', host: '162.35.27.39', role: 'committee' },
  { id: 'mist1', host: '162.35.188.138', role: 'committee' },
  { id: 'eug-2c', host: '187.7.68.137', role: 'committee' },
  { id: 'eul-4c', host: '191.215.44.220', role: 'committee' },
  { id: 'sg1', host: '5.223.71.106', role: 'committee' },
  { id: 'ash1', host: '5.161.161.166', role: 'committee' },
  { id: 'hel1', host: '37.27.158.180', role: 'committee' },
  { id: 'hel2', host: '37.27.158.105', role: 'committee' },
  { id: 'fsn1', host: '2.31.19.91', role: 'peer' },
  { id: 'kvm560', host: '162.35.104.183', role: 'peer' },
  { id: 'hstgr1', host: '185.224.139.18', role: 'peer' },
  { id: 'hstgr2', host: '187.126.123.90', role: 'peer' },
];
const COMMITTEE_QUORUM = 6; // of 10 -- segment finality requirement, unrelated to the ark-miner-cli quorums

let snapshot = { generatedAt: null, nodes: [], summary: null, pollErrors: 0 };

function probeNode(node) {
  return new Promise((resolve) => {
    const started = Date.now();
    const sock = createConnection({ host: node.host, port: CHAIN_PORT });
    const timer = setTimeout(() => {
      sock.destroy();
      resolve({ id: node.id, role: node.role, reachable: false, latencyMs: Date.now() - started, error: 'timeout' });
    }, CONNECT_TIMEOUT_MS);
    let buf = '';
    sock.on('connect', () => sock.write('PEER_COUNT\n'));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const line = buf.split('\n')[0];
      const parts = line.split('\t');
      if (parts[0] === 'PEER_COUNT' && parts.length >= 3) {
        clearTimeout(timer);
        sock.destroy();
        resolve({ id: node.id, role: node.role, reachable: true, latencyMs: Date.now() - started, peerCount: Number(parts[1]), peerCountMax: Number(parts[2]) });
      }
    });
    sock.on('error', (err) => {
      clearTimeout(timer);
      resolve({ id: node.id, role: node.role, reachable: false, latencyMs: Date.now() - started, error: err.code || String(err.message || err) });
    });
  });
}

async function poll() {
  try {
    const nodes = await Promise.all(NODES.map(probeNode));
    const committee = nodes.filter((n) => n.role === 'committee');
    const peers = nodes.filter((n) => n.role === 'peer');
    const committeeUp = committee.filter((n) => n.reachable).length;
    snapshot = {
      generatedAt: new Date().toISOString(),
      nodes,
      summary: {
        committeeUp,
        committeeTotal: committee.length,
        committeeQuorum: COMMITTEE_QUORUM,
        committeeHasQuorum: committeeUp >= COMMITTEE_QUORUM,
        peersUp: peers.filter((n) => n.reachable).length,
        peersTotal: peers.length,
      },
      pollErrors: snapshot.pollErrors,
    };
  } catch (err) {
    snapshot = { ...snapshot, pollErrors: snapshot.pollErrors + 1, lastPollError: String(err.message || err) };
  }
}

function main() {
  poll();
  setInterval(poll, POLL_INTERVAL_MS);

  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.url === '/chain-fleet-capacity' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(snapshot));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  server.listen(PORT, HOST, () => {
    console.log(`[chain-fleet-capacity-api] listening on ${HOST}:${PORT}, polling ${NODES.length} nodes every ${POLL_INTERVAL_MS}ms`);
  });
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
