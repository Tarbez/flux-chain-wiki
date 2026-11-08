// "I run computers" trip, 22 s, 120 BPM (beat 0.5 s, bar 2 s). Shot list: docs/design/space/SPACE.md, "Cinematic journeys: style guide and shot list".
// `at` is when a camera pose is reached. A beat with no `shot` changes light, spares or words only. `out` is when a caption leaves.
const K = { kind: 'kernel' }, N0 = { kind: 'network', index: 0 };
const chain = (i) => ({ kind: 'chain', index: i, parentOf: 'network' });
export default {
  id: 'operator',
  title: 'I run computers',
  seconds: 22,
  beats: [
    /* 1 hook: the map sinks toward the word as the networks light */
    { at: 0, pick: K, shot: { place: 'hero' }, title: { text: 'OPERATOR', near: 'pick', side: 'right', size: 0.34 } },
    { at: 0.5, pick: { kind: 'network', index: 0 }, light: ['pick'], keep: true },
    { at: 1, pick: { kind: 'network', index: 1 }, light: ['pick'], keep: true },
    { at: 1.5, pick: { kind: 'network', index: 2 }, light: ['pick'], keep: true },
    { at: 2, pick: K, shot: { place: 'pick', dist: 2.6, elev: 58, turn: 0 } },
    /* 2 dive to a network, two nodes land */
    { at: 2, pick: N0, light: ['pick'], spawn: [{ type: 'node', near: 'pick', dx: -1.4, dz: 0, s: 0.4, delay: 0.5 }, { type: 'node', near: 'pick', dx: 1.6, dz: 0, s: 0.4, delay: 1 }] },
    { at: 2.5, pick: N0, say: 'Computers like yours run each network.', n: '01 / 03', out: 5.5 },
    { at: 6, pick: N0, shot: { place: 'pick', dist: 1.2, elev: 20, turn: 150 } },
    /* 3 floor level past the cube */
    { at: 8, pick: N0, shot: { place: 'pick', dist: 0.85, elev: 10, turn: 60 }, light: ['pick'] },
    /* 4 the chains light in sequence round the node */
    { at: 8, pick: chain(0), light: ['pick'], keep: true },
    { at: 8.5, pick: chain(1), light: ['pick'], keep: true, say: 'Each node keeps every chain of its network.', n: '02 / 03', out: 11.5 },
    { at: 9, pick: chain(2), light: ['pick'], keep: true, count: { fact: 'Chains here', key: 'chains', label: 'chains', to: 10 } },
    { at: 9.5, pick: chain(3), light: ['pick'], keep: true },
    { at: 12, pick: N0, shot: { place: 'pick', dist: 0.9, elev: 18, turn: 100 } },
    /* 5 back along the trace to the kernel */
    { at: 12, pick: N0, run: [{ from: 'pick', to: 'kernel' }] },
    { at: 14, pick: K, shot: { place: 'pick', dist: 1.4, elev: 26, turn: -10 }, light: ['pick'] },
    /* 6 every trace runs out from the kernel at once, on the downbeat */
    { at: 14.5, pick: K, say: 'Your node joins this grid.', n: '03 / 03', out: 17.5 },
    { at: 16, pick: K, run: [{ from: 'kernel', to: '*' }] },
    { at: 18, pick: K, shot: { place: 'pick', dist: 3.0, elev: 48, turn: 10 } },
    { at: 19, pick: K, pulse: ['pick'] },
    /* 7 the end */
    { at: 20, clear: true },
    { at: 22, shot: { place: 'hero' } }
  ],
  end: { say: 'Run a node.', page: 'download' }
};
