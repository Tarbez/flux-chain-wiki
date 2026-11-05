/* The resolvers page's show: a close, low look at the kernel (the armoured tower), then the whole grid with every network lit, because
   any network can use a resolver. Places come from targets(); the three captions are the page's one idea. */
export const SHOW = (space) => {
  const nets = space.targets().filter((t) => t.kind === 'network').map((t) => t.id);
  return { id: 'resolvers', steps: [
    { at: 0, shot: { place: 'kernel', dist: .9, elev: 8, lift: .4 }, light: ['kernel'], say: 'A resolver is a rulebook.', n: '01' },
    { at: 3, say: 'It runs as its own chain.', n: '02' },
    { at: 6, shot: null, light: ['kernel'].concat(nets), say: 'Every network can use it.', n: '03' },
    { at: 10, light: [], say: null }
  ] };
};
