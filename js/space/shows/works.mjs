/* How it works' show (route `works`): you ask, a signed rulebook answers, anyone can check it. 10.5 s, four steps and a calm end.
   Every place comes from space.targets(): the first network that has chains stands for the visitor's side. No place is typed
   except 'kernel', which the space contract fixes as the kernel's id. */
export const SHOW = (space) => {
  const all = space.targets();
  const nets = all.filter((t) => t.kind === 'network');
  const net = nets.find((t) => t.children && t.children.length) || nets[0];
  const kernel = all.find((t) => t.kind === 'kernel');
  if (!net || !kernel) return { id: 'works', steps: [] };          /* nothing to stand on yet: an empty show plays nothing */
  const chains = (net.children || []).filter((id) => space.target(id));
  const chain = chains[0] || null;
  /* the link spare starts at the network's rim and points at the kernel: the unit direction, in the network's radii */
  const vx = kernel.at[0] - net.at[0], vz = kernel.at[2] - net.at[2], len = Math.hypot(vx, vz) || 1;
  const reach = 1.4;                                                 /* just past the network's own radius */
  const dx = (vx / len) * reach, dz = (vz / len) * reach;
  const yaw = Math.atan2(vx, -vz) * 180 / Math.PI;                   /* yaw 0 faces -z, growing toward +x (SPACE.md, camera axes) */
  const steps = [
    { at: 0, shot: { place: net.id, dist: 1.2, elev: 30 }, light: [net.id],
      spawn: [{ type: 'link', near: net.id, dx, dz, s: .6, yaw, delay: .6, token: net.token }], say: 'You ask a network.', n: '01' },
    { at: 2.6, shot: { place: kernel.id, dist: 1.3, elev: 26 }, light: [kernel.id], say: 'The kernel finds the rulebook.', n: '02' }
  ];
  if (chain) steps.push({ at: 5.2, shot: { place: chain, dist: 1.2, elev: 30, turn: -20, lift: .2 }, light: [chain],
    spawn: [{ type: 'record', near: chain, dx: 1.4, dz: 0, s: .5, token: net.token }], say: 'The answer is signed into a record.', n: '03' });
  steps.push({ at: 7.8, shot: { place: net.id, dist: 1.6, elev: 38 }, light: chains.length ? chains : [net.id],
    say: 'Anyone can check the signature.', n: chain ? '04' : '03' });
  steps.push({ at: 10.5, light: [], say: null });
  return { id: 'works', steps };
};
