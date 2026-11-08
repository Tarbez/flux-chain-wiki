// "Just curious" trip, 28 s, 120 BPM (beat 0.5 s, bar 2 s). Shot list: docs/design/space/SPACE.md, "Cinematic journeys: style guide and shot list".
// `at` is when a camera pose is reached. A beat with no `shot` changes light, spares or words only. `out` is when a caption leaves.
const K = { kind: 'kernel' }, N0 = { kind: 'network', index: 0 };
const C0 = { kind: 'chain', index: 0, parentOf: 'network' };
export default {
  id: 'curious',
  title: 'Just curious',
  seconds: 28,
  beats: [
    /* 1 hook: fly in past the word */
    { at: 0, pick: K, shot: { place: 'hero' }, light: ['pick'], title: { text: 'CURIOUS', near: 'pick', side: 'left', size: 0.34 } },
    { at: 2, pick: K, shot: { place: 'pick', dist: 1.5, elev: 14, turn: -35 } },
    /* 2 the kernel */
    { at: 2.5, pick: K, say: 'One kernel runs every network.', n: '01 / 04', out: 5.5 },
    { at: 4, pick: K, pulse: ['pick'] },
    { at: 6, pick: K, shot: { place: 'pick', dist: 1.0, elev: 20, turn: 0 } },
    /* 3 along the trace to a network */
    { at: 6, pick: N0, run: [{ from: 'kernel', to: 'pick' }] },
    { at: 8, pick: N0, shot: { place: 'pick', dist: 1.3, elev: 30, turn: -15 }, light: ['pick'],
      spawn: [{ type: 'record', near: 'pick', dx: 1.5, dz: 0, s: 0.5, delay: 0 }, { type: 'record', near: 'pick', dx: -1.3, dz: 0, s: 0.5, delay: 1 }] },
    /* 4 the network */
    { at: 8.5, pick: N0, say: 'A network is a group of chains.', n: '02 / 04', out: 11.5 },
    { at: 9, pick: N0, count: { fact: 'Chains here', key: 'chains', label: 'chains', to: 10 } },
    { at: 12, pick: N0, shot: { place: 'pick', dist: 1.05, elev: 24, turn: 20 } },
    /* 5 down the trace to a chain */
    { at: 12, pick: C0, run: [{ from: 'prev', to: 'pick' }] },
    { at: 14, pick: C0, shot: { place: 'pick', dist: 1.0, elev: 36, turn: 20 }, light: ['pick'] },
    /* 6 records land in a row */
    { at: 14, pick: C0, spawn: [{ type: 'record', near: 'pick', dx: 1.4, dz: 0, s: 0.8, delay: 0.5 }, { type: 'record', near: 'pick', dx: 1.9, dz: 0, s: 0.8, delay: 1 }, { type: 'record', near: 'pick', dx: 2.4, dz: 0, s: 0.8, delay: 1.5 }] },
    { at: 14.5, pick: C0, say: 'Each record is signed by its writer.', n: '03 / 04', out: 18.5 },
    { at: 18, pick: C0, shot: { place: 'pick', dist: 0.85, elev: 12, turn: -30 } },
    /* 7 the networks light one per beat, up to the map */
    { at: 18, pick: { kind: 'network', index: 0 }, light: ['pick'], keep: true },
    { at: 18.5, pick: { kind: 'network', index: 1 }, light: ['pick'], keep: true },
    { at: 19, pick: { kind: 'network', index: 2 }, light: ['pick'], keep: true, say: 'Anyone can check any record.', n: '04 / 04', out: 21.5 },
    { at: 22, pick: K, shot: { place: 'pick', dist: 3.4, elev: 50, turn: 0 } },
    /* 8 the end */
    { at: 23, pick: K, pulse: ['pick'] },
    { at: 25, clear: true },
    { at: 28, shot: { place: 'hero' } }
  ],
  end: { say: 'Get FXN Browser.', page: 'download' }
};
