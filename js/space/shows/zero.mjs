/* The home's show, cut as a game intro: the camera starts low on the kernel tower and rises, each network is lit in turn with
   its name and coin read from its facts (world2-space factsFrom, from js/content/network-data.js), then the whole grid with
   the one move the visitor has. Built from the places (targets), never typed. Fits 12 s for up to three networks. */
const coinOf = (t) => ((t.facts || []).find((f) => f.label === 'Coin') || {}).value;
export const SHOW = (space) => {
  const nets = space.targets().filter((t) => t.kind === 'network').slice(0, 3);
  const steps = [
    { at: 0, shot: { place: 'kernel', dist: .8, elev: 4, lift: .1 }, light: ['kernel'], say: 'One kernel holds the grid.', n: '01' },
    { at: 1.6, shot: { place: 'kernel', dist: 1.5, elev: 34 } }
  ];
  nets.forEach((t, i) => {
    const coin = coinOf(t);
    steps.push({ at: 3 + i * 2.2, shot: { place: t.id, dist: 1.1, elev: 28, turn: i % 2 ? 18 : -18 }, light: [t.id],
      say: coin ? t.short + ' runs on ' + coin + '.' : t.short + ' is a network.', n: '0' + (i + 2) });
  });
  const end = 3 + nets.length * 2.2;
  steps.push({ at: end, shot: null, light: nets.map((t) => t.id), say: 'Click any network to fly in.', n: '0' + (nets.length + 2) });
  steps.push({ at: end + 2.6, light: [], say: null });
  return { id: 'zero', steps };
};
