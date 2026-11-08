// "I build apps" trip, 26 s, 120 BPM (beat 0.5 s, bar 2 s). Shot list: docs/design/space/SPACE.md, "Cinematic journeys: style guide and shot list".
// `at` is when a camera pose is reached. A beat with no `shot` changes light, spares or words only. `out` is when a caption leaves.
const K = { kind: 'kernel' }, N0 = { kind: 'network', index: 0 };
const CH = { kind: 'chain', index: 0, parentOf: 'network', prefer: 'resolver' };
export default {
  id: 'builder',
  title: 'I build apps',
  seconds: 26,
  beats: [
    /* 1 hook: low fly-in past the word */
    { at: 0, pick: N0, shot: { place: 'hero' }, light: ['pick'], title: { text: 'BUILDER', near: 'pick', side: 'front', size: 0.22 } },
    { at: 2, pick: N0, shot: { place: 'pick', dist: 1.2, elev: 12, turn: 30 }, spawn: [{ type: 'card', near: 'pick', dx: 1.3, dz: 0, s: 0.6, delay: 0 }] },
    /* 2 the app's network */
    { at: 2.5, pick: N0, say: 'Your app runs on a network.', n: '01 / 04', out: 5 },
    { at: 6, pick: N0, shot: { place: 'pick', dist: 0.9, elev: 18, turn: 0 }, run: [{ from: 'pick', to: 'kernel' }] },
    /* 3 pull back along the trace to the kernel */
    { at: 8, pick: K, shot: { place: 'pick', dist: 1.3, elev: 22, turn: 20 }, light: ['pick'] },
    /* 4 the kernel */
    { at: 8.5, pick: K, say: 'Every network shares one kernel.', n: '02 / 04', out: 11 },
    { at: 9, pick: K, count: { fact: 'Networks', key: 'networks', label: 'networks', to: 10 } },
    { at: 12, pick: K, shot: { place: 'pick', dist: 1.0, elev: 16, turn: -20 } },
    /* 5 the one whip, then settle (hold) */
    { at: 12.5, pick: CH, shot: { place: 'pick', dist: 1.0, elev: 34, turn: 10 }, light: ['pick'] },
    { at: 14, pick: CH, shot: { place: 'pick', dist: 1.0, elev: 34, turn: 10 } },
    /* 6 two records land */
    { at: 14, pick: CH, spawn: [{ type: 'record', near: 'pick', dx: 1.4, dz: 0, s: 0.8, delay: 0.5 }, { type: 'record', near: 'pick', dx: 1.9, dz: 0, s: 0.8, delay: 1 }] },
    { at: 14.5, pick: CH, say: 'You ask. A signed rule answers.', n: '03 / 04', out: 17 },
    { at: 18, pick: CH, shot: { place: 'pick', dist: 0.9, elev: 18, turn: -20 }, spawn: [{ type: 'link', near: 'pick', dx: 1.65, dz: 0, s: 0.5, delay: 0 }] },
    /* 7 the link joins the records on the beat */
    { at: 18.5, pick: CH, say: 'Each record links to the one before it.', n: '04 / 04', out: 21.5 },
    { at: 22, pick: CH, shot: { place: 'pick', dist: 0.9, elev: 14, turn: -35 } },
    { at: 24, pick: CH, pulse: ['pick'] },
    /* 8 the end */
    { at: 25, clear: true },
    { at: 26, shot: { place: 'hero' } }
  ],
  end: { say: 'Get FXN Browser.', page: 'download' }
};
