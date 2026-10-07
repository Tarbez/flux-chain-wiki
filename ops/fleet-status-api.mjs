#!/usr/bin/env node
/* Public, read-only fleet health API behind public.defxn.com /api/fleet-status (or
   wherever ops/caddy routes it -- see public-explorer.caddy for the sibling pattern
   this follows: CORS comes from the service itself, Caddy just proxies one path).

   Scope is deliberately narrow: HEALTH AND MEMBERSHIP ONLY, not live throughput.
   Polling each quorum's own "members" command is cheap and safe -- it touches no
   write path and adds no load beyond what /monitor's dashboard already implies.
   Measuring real tx/s live would mean running synthetic transfer bursts against
   production-adjacent quorums on a schedule; that's a different, heavier decision
   (own load profile, own risk of repeating this project's earlier production
   incidents) and was deliberately left out of this service's scope.

   Every number this emits is either true right now (reachable, latencyMs,
   memberCount) or explicitly absent -- never a guessed or carried-over value.
   "Never report a capability that does not exist as 0": an unreachable member
   is `reachable: false`, not a rate of 0.

     node ops/fleet-status-api.mjs              # http://127.0.0.1:8767
     PORT=8767 node ops/fleet-status-api.mjs
*/
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8767);
const HOST = process.env.HOST || '127.0.0.1';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 7000);
const REQUEST_TIMEOUT_MS = 3000;

// The real, currently-running quorums (bench-003 §4/§8/§9's "Current live
// configuration"), kept here as the one place this list is authored -- update
// here, not in monitor.js, if a quorum's membership or port ever changes.
const QUORUMS = [
  { id: 'A', port: 18994, members: [
    { id: 'validator-mk2', host: '162.35.27.39' },
    { id: 'validator-bk1', host: '153.75.247.152' },
  ] },
  { id: 'B', port: 18995, members: [
    { id: 'validator-mk1', host: '162.35.101.72' },
    { id: 'validator-ms1', host: '162.35.98.203' },
  ] },
  { id: 'C', port: 18996, members: [
    { id: 'validator-mist1', host: '162.35.188.138' },
    { id: 'validator-ms3', host: '162.35.110.98' },
  ] },
  { id: 'F', port: 19200, members: [
    { id: 'validator-bk2', host: '162.35.26.46' },
    { id: 'validator-mk2', host: '162.35.27.39' },
  ] },
  // Added 2026-10-07: a new provider, not InterServer -- real measured
  // RTT to the rest of the fleet (~75-80ms to bk2, ~19ms between the pair
  // themselves), the first non-InterServer quorum. ~195-196/s standalone,
  // 5 audit runs, zero failures (bench-003 §10).
  { id: 'G', port: 18994, members: [
    { id: 'validator-eug2c', host: '187.7.68.137' },
    { id: 'validator-eul4c', host: '191.215.44.220' },
  ] },
];

let snapshot = { generatedAt: null, quorums: [], summary: null, pollErrors: 0 };

async function pingMember(member, port) {
  const url = `http://${member.host}:${port}/command`;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'members', payload: {} }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { id: member.id, reachable: false, latencyMs, error: `HTTP ${res.status}` };
    const data = await res.json();
    const memberCount = Array.isArray(data.members) ? data.members.length : null;
    return { id: member.id, reachable: true, latencyMs, memberCount };
  } catch (err) {
    return { id: member.id, reachable: false, latencyMs: Date.now() - started, error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

async function poll() {
  try {
    const quorums = await Promise.all(QUORUMS.map(async (q) => {
      const members = await Promise.all(q.members.map((m) => pingMember(m, q.port)));
      const onlineCount = members.filter((m) => m.reachable).length;
      return { id: q.id, members, onlineCount, totalCount: members.length, online: onlineCount === members.length };
    }));
    const allMembers = quorums.flatMap((q) => q.members);
    const uniqueMachines = new Map();
    for (const m of allMembers) if (!uniqueMachines.has(m.id)) uniqueMachines.set(m.id, m.reachable);
    const machinesUp = [...uniqueMachines.values()].filter(Boolean).length;
    snapshot = {
      generatedAt: new Date().toISOString(),
      quorums,
      summary: {
        quorumsOnline: quorums.filter((q) => q.online).length,
        quorumsTotal: quorums.length,
        machinesUp,
        machinesTotal: uniqueMachines.size,
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
    if (req.url === '/fleet-status' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(snapshot));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  server.listen(PORT, HOST, () => {
    console.log(`[fleet-status-api] listening on ${HOST}:${PORT}, polling every ${POLL_INTERVAL_MS}ms`);
  });
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
