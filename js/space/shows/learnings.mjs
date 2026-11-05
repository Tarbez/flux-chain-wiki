/* Notes' show: kept quiet on purpose (a reading page). One slow orbit of the kernel, then the wide grid, two captions. */
export const SHOW = () => ({
  id: 'learnings',
  steps: [
    { at: 0, shot: { place: 'kernel', dist: 1.3, elev: 22, turn: -30 }, light: ['kernel'], say: 'Notes from the work.', n: '01' },
    { at: 3.5, shot: { place: 'kernel', dist: 1.4, elev: 26, turn: 30 } },
    { at: 7, shot: null, light: [], say: 'Read how DEFXN was built.', n: '02' },
    { at: 10.5, say: null }
  ]
});
