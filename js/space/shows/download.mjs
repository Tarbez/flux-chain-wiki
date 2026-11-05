/* Download's show, "run your own node": open grid beside a network, a node spare drops in and builds (the visitor's node
   joining), the network it joins lights in its own token, then the page's one action. The network is the first one the
   places list (targets), so nothing here names it. With no network the show stands on the kernel. */
export const SHOW = (space) => {
  const net = space.targets().find((t) => t.kind === 'network');
  const at = net ? net.id : 'kernel';
  const spare = { type: 'node', near: at, dx: 1.6, dz: .4, s: .35, yaw: -20 };
  if (net && net.token) spare.token = net.token;
  return {
    id: 'download',
    steps: [
      { at: 0, shot: { place: at, dist: 2.2, elev: 30, turn: 40 }, light: [], say: null },
      { at: 1.2, spawn: [spare], say: 'Your node joins the grid.', n: '01' },
      { at: 4.5, shot: { place: at, dist: 1.4, elev: 30, turn: 20 }, light: [at] },
      { at: 7, say: 'Get FXN Browser to run it.', n: '02' },
      { at: 11, say: null }
    ]
  };
};
