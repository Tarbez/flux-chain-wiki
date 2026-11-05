/* The account page's show (docs/design/space/SPACE.md "Shows"): the kernel, then the visitor's chain with a card
   standing beside it for their account. The site has no place per visitor, so the chain is the identity chain (the
   one whose line names identities, else the first chain), the same place the chain page shows. */
function identityChain(space) {
  const chains = space.targets().filter((t) => t.kind === 'chain');
  return chains.find((t) => /identit/i.test(t.line || '')) || chains[0] || null;
}

export const SHOW = (space) => {
  const c = identityChain(space);
  const steps = [{ at: 0, shot: { place: 'kernel', dist: 1.4, elev: 24 }, light: ['kernel'], say: 'One kernel runs every network.', n: '01' }];
  if (!c) { steps.push({ at: 3.2, say: null }); return { id: 'account', steps }; }
  steps.push(
    { at: 3, shot: { place: c.id, dist: 1.3, elev: 28, turn: 20, lift: 0.3 }, light: [c.id], say: 'Your identity keeps its own chain.', n: '02' },
    { at: 5.6, spawn: [{ type: 'card', near: c.id, dx: -1.6, dz: 0.2, dy: 0.4, s: 0.7, yaw: 18, token: c.token }], say: 'This card is your account.', n: '03' },
    { at: 8.4, light: ['kernel', c.id], say: 'Your key opens every network.', n: '04' },
    { at: 11.4, say: null }
  );
  return { id: 'account', steps };
};
