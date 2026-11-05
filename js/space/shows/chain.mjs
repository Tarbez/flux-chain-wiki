/* The chain page's show (docs/design/space/SPACE.md "Shows"): the identity chain, then records dropping beside it one
   after another into a short stack, each caption one fact about the chain. The chain is found in the places: the one
   whose line names identities, else the first chain (the same place js/space/routes.mjs gives the chain pages). */
function identityChain(space) {
  const chains = space.targets().filter((t) => t.kind === 'chain');
  return chains.find((t) => /identit/i.test(t.line || '')) || chains[0] || null;
}

export const SHOW = (space) => {
  const c = identityChain(space);
  if (!c) return null;   // no chain stands in the world yet: nothing true to show
  const rec = (dy, delay) => ({ type: 'record', near: c.id, dx: 1.5, dz: 0, dy, s: 0.42, delay, token: c.token });
  return { id: 'chain', steps: [
    { at: 0, shot: { place: c.id, dist: 1.25, elev: 26, turn: -18, lift: 0.3 }, light: [c.id], say: 'Every identity keeps its own chain.', n: '01' },
    { at: 2.6, spawn: [rec(0, 0), rec(0.55, 0.7), rec(1.1, 1.4)], say: 'Each record links to the one before.', n: '02' },
    { at: 6.2, spawn: [rec(1.65, 0)], say: 'Every record is signed by your key.', n: '03' },
    { at: 9, shot: { place: c.id, dist: 1.1, elev: 30 }, say: 'Pick a record on the left to open it.', n: '04' },
    { at: 11.6, say: null }
  ] };
};
