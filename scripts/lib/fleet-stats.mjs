/* The live stats feeds (docs/stats/LIVE-DATA-CONTRACT.md sections 1-5), read from ONE chain-server node.

   Who reads this: the engineer who runs scripts/serve-site.mjs or scripts/publish-host.mjs and wants /stats to show
   live readings. Both hosts answer four read-only routes from this module:

     GET /api/fleet-interactions?limit=100   section 1, from the node's STATS_LIVE reply (INT lines)
     GET /api/fleet-capabilities             section 2, STATS_LIVE (CAP lines) + PERF_RUNS (CEIL lines, for the ceiling)
     GET /api/fleet-resolvers                section 3, STATS_LIVE (RES lines)
     GET /api/fleet-runs                     sections 4-5, PERF_RUNS (RUN, FIG and CEIL lines)

   The node is DEFXN_STATS_NODE (a chain-server WebSocket URL, e.g. ws://127.0.0.1:19501/ws or wss://nodes.defxn.com/ws).
   The wire is dense-wire's line protocol: one command per WebSocket message, one reply message whose lines end in END
   (the format is fixed in the stats brief and restated at parseStatsLive / parsePerfRuns below). The HTTP answer is
   JSON because the contract defines that format; nothing here is stored.

   Absent is not 0. A `-` on the wire is null in the answer, a figure the node did not send is missing, and a node that
   cannot be asked answers the error shape `{ ok: false, error, detail }` with a 5xx code, so the page shows
   "No reading" and the reason. Replies are kept for DEFXN_STATS_CACHE_MS (default 3000 ms), and one request to the node
   serves every visitor that asks while it is in flight.

   Importing this module does no work: the wire client is created on the first request. */

const DEFAULT_CACHE_MS = 3000;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_INTERACTIONS = 100;

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

/** A reply the node sent in a shape this module does not read. The whole answer fails (contract: "do not show part of
 *  a malformed answer"). */
export class StatsShapeError extends Error {
  constructor(command, message) { super(`${command}: ${message}`); this.name = 'StatsShapeError'; }
}

/* ---- the wire's field rules ------------------------------------------------------------------------------------- */

const ID = /^[a-z0-9][a-z0-9._-]*$/;
const WHOLE = /^\d+$/;
const DECIMAL = /^\d+(?:\.\d+)?$/;
const HEX = /^(?:[0-9a-fA-F]{2})*$/;

function whole(command, line, field, text) {
  if (!WHOLE.test(text)) throw new StatsShapeError(command, `${field} must be a whole number in: ${line.slice(0, 160)}`);
  return Number(text);
}
/** `-` is absent (null); anything else must be a non-negative decimal. */
function decimalOrNull(command, line, field, text) {
  if (text === '-') return null;
  if (!DECIMAL.test(text)) throw new StatsShapeError(command, `${field} must be a number or - in: ${line.slice(0, 160)}`);
  return Number(text);
}
function wholeOrNull(command, line, field, text) { return text === '-' ? null : whole(command, line, field, text); }
function id(command, line, field, text) {
  if (!ID.test(text)) throw new StatsShapeError(command, `${field} must be an id in: ${line.slice(0, 160)}`);
  return text;
}
function idOrNull(command, line, field, text) { return text === '-' ? null : id(command, line, field, text); }
/** Free text travels as hex of UTF-8 (brief: "Text fields marked hex are hex of UTF-8"). */
function hexText(command, line, field, text) {
  if (!HEX.test(text)) throw new StatsShapeError(command, `${field} must be hex in: ${line.slice(0, 160)}`);
  return Buffer.from(text, 'hex').toString('utf8');
}
function hexTextOrNull(command, line, field, text) { return text === '-' ? null : hexText(command, line, field, text); }

/** Split a reply into its lines, check the head tag and the END line. A node that does not serve the command answers
 *  `ERR\t...` (unknown command), which is a refusal that names the command, not a shape error. */
function linesOf(command, reply) {
  const lines = String(reply ?? '').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 0);
  if (!lines.length) throw new StatsShapeError(command, 'empty reply');
  const head = lines[0].split('\t');
  if (head[0] === 'ERR' || head[0] === `${command}_ERR`) {
    const error = new Error(`the node refused ${command}: ${head.slice(1).join(' ') || 'no reason given'}`);
    error.code = 'FLEET_STATS_NOT_SERVED';
    throw error;
  }
  if (head[0] !== command) throw new StatsShapeError(command, `unrecognised reply head: ${lines[0].slice(0, 160)}`);
  if (lines[lines.length - 1] !== 'END') throw new StatsShapeError(command, 'reply without END');
  return { head, rows: lines.slice(1, -1) };
}
function fieldsOf(command, row, tag, count) {
  const f = row.split('\t');
  if (f[0] !== tag || f.length !== count) throw new StatsShapeError(command, `${tag} line needs ${count} fields, has ${f.length}: ${row.slice(0, 160)}`);
  return f;
}

/* ---- STATS_LIVE -------------------------------------------------------------------------------------------------
   STATS_LIVE <measured_at_ms> <window_ms> <interval_ms> <node name>
   CAP <capability id> <requests> <errors> <p50_ms|-> <p95_ms|->
   RES <resolver id> <batches> <swaps> <batch_ms_mean|-> <send_ms_mean|-> <busy_pct|->
   INT <at_ms> <capability id|-> <resolver id> <latency_ms|-> <ok 1|0>
   END                                                                               (fields tab-separated)       */
export function parseStatsLive(reply) {
  const C = 'STATS_LIVE';
  const { head, rows } = linesOf(C, reply);
  if (head.length !== 5) throw new StatsShapeError(C, `head needs 5 fields, has ${head.length}`);
  const line0 = head.join('\t');
  const out = {
    measured_at_ms: whole(C, line0, 'measured_at_ms', head[1]),
    window_ms: whole(C, line0, 'window_ms', head[2]),
    interval_ms: whole(C, line0, 'interval_ms', head[3]),
    node: head[4],
    capabilities: {}, resolvers: {}, interactions: [],
  };
  if (!out.node) throw new StatsShapeError(C, 'head has no node name');
  for (const row of rows) {
    const tag = row.split('\t', 1)[0];
    if (tag === 'CAP') {
      const f = fieldsOf(C, row, 'CAP', 6), key = id(C, row, 'capability id', f[1]);
      if (out.capabilities[key]) throw new StatsShapeError(C, `capability ${key} listed twice`);
      out.capabilities[key] = { requests: whole(C, row, 'requests', f[2]), errors: whole(C, row, 'errors', f[3]), p50_ms: decimalOrNull(C, row, 'p50_ms', f[4]), p95_ms: decimalOrNull(C, row, 'p95_ms', f[5]) };
    } else if (tag === 'RES') {
      const f = fieldsOf(C, row, 'RES', 7), key = id(C, row, 'resolver id', f[1]);
      if (out.resolvers[key]) throw new StatsShapeError(C, `resolver ${key} listed twice`);
      out.resolvers[key] = { batches: whole(C, row, 'batches', f[2]), swaps: whole(C, row, 'swaps', f[3]), batch_ms_mean: decimalOrNull(C, row, 'batch_ms_mean', f[4]), send_ms_mean: decimalOrNull(C, row, 'send_ms_mean', f[5]), busy_pct: decimalOrNull(C, row, 'busy_pct', f[6]) };
    } else if (tag === 'INT') {
      const f = fieldsOf(C, row, 'INT', 6);
      if (f[5] !== '0' && f[5] !== '1') throw new StatsShapeError(C, `ok must be 1 or 0: ${row.slice(0, 160)}`);
      out.interactions.push({ at_ms: whole(C, row, 'at_ms', f[1]), capability: idOrNull(C, row, 'capability id', f[2]), resolver: id(C, row, 'resolver id', f[3]), latency_ms: decimalOrNull(C, row, 'latency_ms', f[4]), node: out.node, ok: f[5] === '1' });
    }
    // any other line is a later addition to the format: skipped, so an older host still reads a newer node
  }
  if (out.interactions.length > MAX_INTERACTIONS) throw new StatsShapeError(C, `${out.interactions.length} interactions, at most ${MAX_INTERACTIONS}`);
  return out;
}

/* ---- PERF_RUNS --------------------------------------------------------------------------------------------------
   PERF_RUNS <interval_ms|-> <next_run_at_ms|->
   RUN <run id> <kind weekly|stress|ceiling|audit> <started_at_ms> <finished_at_ms> <device hex> <conditions hex>
       <source hex|-> <p95_ms|-> <record cid>
   FIG <run id> <target cap|res|fleet> <target id|-> <name hex> <value> <unit hex>
   CEIL <run id> <target cap|res|fleet> <target id|-> <connections> <per_second>
   ABSENT <run id> <target cap|res|fleet> <target id> <reason hex>      a target the run could not drive (notBuilt)
   END       (any other line tag is skipped, in both replies)                                                                                                             */
const KINDS = new Set(['weekly', 'stress', 'ceiling', 'audit']);
const TARGETS = new Set(['cap', 'res', 'fleet']);
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export function parsePerfRuns(reply) {
  const C = 'PERF_RUNS';
  const { head, rows } = linesOf(C, reply);
  if (head.length !== 3) throw new StatsShapeError(C, `head needs 3 fields, has ${head.length}`);
  const line0 = head.join('\t');
  const out = { interval_ms: wholeOrNull(C, line0, 'interval_ms', head[1]), next_run_at_ms: wholeOrNull(C, line0, 'next_run_at_ms', head[2]), runs: [] };
  const byId = new Map();
  const runOf = (row, text) => {
    const run = byId.get(text);
    if (!run) throw new StatsShapeError(C, `line names a run that has no RUN line before it: ${row.slice(0, 160)}`);
    return run;
  };
  const target = (row, kind, tid) => {
    if (!TARGETS.has(kind)) throw new StatsShapeError(C, `target must be cap, res or fleet: ${row.slice(0, 160)}`);
    const targetId = idOrNull(C, row, 'target id', tid);
    if (kind !== 'fleet' && targetId === null) throw new StatsShapeError(C, `a ${kind} target needs an id: ${row.slice(0, 160)}`);
    return { target: kind, target_id: targetId };
  };
  for (const row of rows) {
    const tag = row.split('\t', 1)[0];
    if (tag === 'RUN') {
      const f = fieldsOf(C, row, 'RUN', 10);
      if (!RUN_ID.test(f[1])) throw new StatsShapeError(C, `run id must be an id: ${row.slice(0, 160)}`);
      if (byId.has(f[1])) throw new StatsShapeError(C, `run ${f[1]} listed twice`);
      if (!KINDS.has(f[2])) throw new StatsShapeError(C, `kind must be weekly, stress, ceiling or audit: ${row.slice(0, 160)}`);
      if (!/^[0-9a-z]+$/i.test(f[9])) throw new StatsShapeError(C, `record cid must be text without spaces: ${row.slice(0, 160)}`);
      const run = {
        id: f[1], kind: f[2],
        started_at_ms: whole(C, row, 'started_at_ms', f[3]), finished_at_ms: whole(C, row, 'finished_at_ms', f[4]),
        device: hexText(C, row, 'device', f[5]), conditions: hexText(C, row, 'conditions', f[6]), source: hexTextOrNull(C, row, 'source', f[7]),
        p95_ms: decimalOrNull(C, row, 'p95_ms', f[8]), record_cid: f[9], figures: [], ceiling: [], absent: [],
      };
      byId.set(run.id, run); out.runs.push(run);
    } else if (tag === 'FIG') {
      const f = fieldsOf(C, row, 'FIG', 7);
      if (!DECIMAL.test(f[5])) throw new StatsShapeError(C, `value must be a number: ${row.slice(0, 160)}`);
      runOf(row, f[1]).figures.push({ ...target(row, f[2], f[3]), name: hexText(C, row, 'name', f[4]), value: Number(f[5]), unit: hexText(C, row, 'unit', f[6]) });
    } else if (tag === 'CEIL') {
      const f = fieldsOf(C, row, 'CEIL', 6);
      if (!DECIMAL.test(f[5])) throw new StatsShapeError(C, `per_second must be a number: ${row.slice(0, 160)}`);
      runOf(row, f[1]).ceiling.push({ ...target(row, f[2], f[3]), connections: whole(C, row, 'connections', f[4]), per_second: Number(f[5]) });
    } else if (tag === 'ABSENT') {
      // a target the run could not drive (notBuilt): it has no FIG or CEIL rows in that run, and the page says why
      const f = fieldsOf(C, row, 'ABSENT', 5), t = target(row, f[2], f[3]);
      runOf(row, f[1]).absent.push({ target: t.target, id: t.target_id, reason: hexText(C, row, 'reason', f[4]) });
    }
    // any other line is a later addition to the format: skipped, so an older host still reads a newer node
  }
  return out;
}

/* ---- the contract's answers, from the parsed replies (pure) -------------------------------------------------- */

/** Section 1. `limit` is clamped to 1..100; the newest `limit` interactions, newest last. */
export function interactionsAnswer(live, limit = MAX_INTERACTIONS) {
  const n = Math.max(1, Math.min(MAX_INTERACTIONS, Number.isFinite(limit) ? Math.floor(limit) : MAX_INTERACTIONS));
  return { measured_at_ms: live.measured_at_ms, interval_ms: live.interval_ms, window_ms: live.window_ms, node: live.node, interactions: live.interactions.slice(-n) };
}

/** The highest rate any ceiling run reached for each capability (contract section 2, `tested_ceiling_per_second`),
 *  with the run that reached it. A capability no ceiling run drove has no entry. */
export function testedCeilings(runs) {
  const best = {};
  for (const run of runs ? runs.runs : []) {
    for (const c of run.ceiling) {
      if (c.target !== 'cap' || !c.target_id) continue;
      if (!best[c.target_id] || c.per_second > best[c.target_id].per_second) best[c.target_id] = { per_second: c.per_second, run: run.id };
    }
  }
  return best;
}

/** Each target of one kind (`cap` or `res`) that the newest run naming it could not drive: { id: { reason, run } }.
 *  A later run that measured the target (a FIG or CEIL row) clears it. */
export function notBuilt(runs, kind) {
  const out = {};
  for (const run of runs ? runs.runs : []) {
    for (const row of run.figures.concat(run.ceiling)) if (row.target === kind && row.target_id) delete out[row.target_id];
    for (const a of run.absent) if (a.target === kind && a.id) out[a.id] = { reason: a.reason, run: run.id };
  }
  return out;
}

const round = (value, places) => { const f = 10 ** places; return Math.round(value * f) / f; };

/** Section 2. `runs` may be null (PERF_RUNS failed): every ceiling and headroom is then null, and `runs_error` says
 *  why. per_second = requests / (window_ms / 1000); headroom_pct = 100 x (1 - per_second / tested_ceiling). */
export function capabilitiesAnswer(live, runs, runsError = null) {
  const ceilings = testedCeilings(runs);
  const seconds = live.window_ms / 1000;
  const capabilities = {};
  for (const [key, c] of Object.entries(live.capabilities)) {
    const perSecond = seconds > 0 ? round(c.requests / seconds, 3) : null;
    const ceiling = ceilings[key] ? ceilings[key].per_second : null;
    capabilities[key] = {
      requests: c.requests, errors: c.errors, per_second: perSecond, p50_ms: c.p50_ms, p95_ms: c.p95_ms,
      tested_ceiling_per_second: ceiling, tested_ceiling_run: ceilings[key] ? ceilings[key].run : null,
      headroom_pct: ceiling && perSecond !== null ? round(100 * (1 - perSecond / ceiling), 1) : null,
    };
  }
  return { measured_at_ms: live.measured_at_ms, window_ms: live.window_ms, interval_ms: live.interval_ms, node: live.node, runs_error: runs ? null : (runsError || 'PERF_RUNS was not read'), not_built: notBuilt(runs, 'cap'), capabilities };
}

/** Section 3. */
export function resolversAnswer(live, runs = null) {
  return { measured_at_ms: live.measured_at_ms, window_ms: live.window_ms, interval_ms: live.interval_ms, node: live.node, not_built: notBuilt(runs, 'res'), resolvers: live.resolvers };
}

/** Sections 4 and 5. `measured_at_ms` is when this host read the list. */
export function runsAnswer(runs, node, readAt) {
  return { measured_at_ms: readAt, interval_ms: runs.interval_ms, next_run_at_ms: runs.next_run_at_ms, node, runs: runs.runs };
}

/* ---- asking the node ------------------------------------------------------------------------------------------ */

let wireModule = null;
/** The site's own copy of dense-wire's WebSocket line client (js/dense-wire/flx-wire.mjs, vendored from
 *  dense-wire/web). Loaded on the first request. */
function loadWire() {
  if (!wireModule) wireModule = import(new URL('../../js/dense-wire/flx-wire.mjs', import.meta.url).href).catch((error) => { wireModule = null; throw error; });
  return wireModule;
}

/** One question to the node: a fresh connection, one command, one reply, closed. A stats read is rare (one per cache
 *  period for every visitor together), so it holds no connection open. */
async function ask(node, command, timeoutMs) {
  const { WireClient } = await loadWire();
  const client = new WireClient(node);
  let timer;
  try {
    return await Promise.race([
      client.send(`${command}\t`),
      new Promise((_, reject) => { timer = setTimeout(() => { const e = new Error(`no reply to ${command} within ${timeoutMs} ms`); e.code = 'FLEET_STATS_TIMEOUT'; reject(e); }, timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
    client.close();
    // a socket still opening when the answer timed out is closed once it opens
    Promise.resolve(client.ready).then(() => client.close(), () => {});
  }
}

function describe(error) {
  if (error && typeof error.message === 'string' && error.message) return error.message;
  if (error && typeof error.type === 'string') return `WebSocket ${error.type}: the node did not accept the connection`;
  return String(error);
}

/** A reader for one node. `options.ask(command)` replaces the wire (for a caller that already holds a client). */
export function createFleetStats({
  node = process.env.DEFXN_STATS_NODE || '',
  cacheMs = Number(process.env.DEFXN_STATS_CACHE_MS || DEFAULT_CACHE_MS),
  timeoutMs = Number(process.env.DEFXN_STATS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  now = () => Date.now(),
  ask: askNode = null,
} = {}) {
  const cache = new Map(); // command -> { at, promise }
  function read(command, parse) {
    const hit = cache.get(command);
    if (hit && now() - hit.at < cacheMs) return hit.promise;
    const at = now();
    const promise = (askNode ? askNode(command) : ask(node, command, timeoutMs)).then((reply) => ({ value: parse(reply), readAt: at }));
    cache.set(command, { at, promise });
    promise.catch(() => {}); // a failure is cached for the same period: a node that is down is not asked once per visitor
    return promise;
  }
  const live = () => read('STATS_LIVE', parseStatsLive);
  const runs = () => read('PERF_RUNS', parsePerfRuns);

  return {
    node,
    /** -> { status, body } for one of the four routes (`kind`: interactions | capabilities | resolvers | runs). */
    async answer(kind, searchParams = new URLSearchParams()) {
      if (!node && !askNode) {
        return { status: 503, body: { ok: false, error: 'FLEET_STATS_NOT_CONFIGURED', detail: 'This host has no stats node. Set DEFXN_STATS_NODE to a chain-server WebSocket URL (for example ws://127.0.0.1:19501/ws) and restart it.' } };
      }
      try {
        if (kind === 'interactions') return { status: 200, body: interactionsAnswer((await live()).value, Number(searchParams.get('limit') || MAX_INTERACTIONS)) };
        if (kind === 'resolvers') {
          const [l, r] = await Promise.allSettled([live(), runs()]);
          if (l.status === 'rejected') throw l.reason;
          return { status: 200, body: resolversAnswer(l.value.value, r.status === 'fulfilled' ? r.value.value : null) };
        }
        if (kind === 'runs') { const r = await runs(); return { status: 200, body: runsAnswer(r.value, node || null, r.readAt) }; }
        if (kind === 'capabilities') {
          const [l, r] = await Promise.allSettled([live(), runs()]);
          if (l.status === 'rejected') throw l.reason;
          return { status: 200, body: capabilitiesAnswer(l.value.value, r.status === 'fulfilled' ? r.value.value : null, r.status === 'rejected' ? describe(r.reason) : null) };
        }
        return { status: 404, body: { ok: false, error: 'FLEET_STATS_UNKNOWN', detail: `no stats route named ${kind}` } };
      } catch (error) {
        const code = error instanceof StatsShapeError ? 'FLEET_STATS_MALFORMED' : error.code || 'FLEET_STATS_UNREACHABLE';
        return { status: code === 'FLEET_STATS_TIMEOUT' ? 504 : 502, body: { ok: false, error: code, detail: `${node || 'the stats node'}: ${describe(error)}` } };
      }
    },
  };
}

/* ---- the HTTP side, shared by serve-site.mjs and publish-host.mjs -------------------------------------------- */

export const FLEET_STATS_ROUTES = Object.freeze({
  '/api/fleet-interactions': 'interactions',
  '/api/fleet-capabilities': 'capabilities',
  '/api/fleet-resolvers': 'resolvers',
  '/api/fleet-runs': 'runs',
});

let shared = null;
/** Answer one of the four routes on `res`. The reader for DEFXN_STATS_NODE is made on the first call. */
export async function proxyFleetStats(res, kind, searchParams) {
  if (!shared) shared = createFleetStats();
  const { status, body } = await shared.answer(kind, searchParams);
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}
