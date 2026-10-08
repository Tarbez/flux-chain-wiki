const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const valid = { measured_at_ms: 1, aggregate_qps: 12, total_entries: 10, longest_ms: 2, errors: 0, nodes: [
  { name: 'bk2', addr: '127.0.0.1:19501', ok: 10, total: 10, elapsed_ms: 2, qps: 12, error: null }
] };
const calls = [];
const context = vm.createContext({
  window: {}, AbortController, setTimeout, clearTimeout,
  fetch: async (url) => { calls.push(url); return { ok: true, json: async () => structuredClone(valid) }; }
});
context.window = context;
vm.runInContext(fs.readFileSync('js/ark/pulse-client.js', 'utf8'), context);

(async () => {
  assert.equal(context.ArkPulse.endpoint, '/api/fleet-pulse');
  assert.equal((await context.ArkPulse.get()).data.nodes[0].name, 'bk2');
  assert.deepEqual(calls, ['/api/fleet-pulse'], 'production uses the same-origin proxy');
  context.ArkPulseEndpoint = 'http://127.0.0.1:19502/pulse.json';
  await context.ArkPulse.get();
  assert.equal(calls.at(-1), context.ArkPulseEndpoint, 'an explicit local operator override is retained');
  assert.throws(() => context.ArkPulse.validate({ ...valid, nodes: [{ ...valid.nodes[0], qps: '12' }] }), /Malformed pulse: nodes\[0\]\.qps/);
  assert.throws(() => context.ArkPulse.validate({ ...valid, nodes: null }), /nodes must be an array/);
  console.log('PASS: pulse client uses the HTTPS same-origin route, validates payloads, and retains an explicit local override.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
