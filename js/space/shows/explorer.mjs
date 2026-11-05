/* The explorer show: a slow sweep from the kernel across up to three networks, each lit in turn, ending calm on the kernel.
   Places come from space.targets(), never typed. Two captions only: every record is public, and any network's records can be browsed.
   At most three networks keep the show at five steps and under 12 s. */
export const SHOW = (space) => {
  const nets = space.targets().filter((t) => t.kind === 'network').slice(0, 3);
  const steps = [{ at: 0, shot: { place: 'kernel', dist: 1.5, elev: 28 }, light: ['kernel'], say: 'Every record is public.', n: '01' }];
  nets.forEach((t, i) => steps.push({
    at: 2.4 + i * 2.6,
    shot: { place: t.id, dist: 1.3, elev: 30, turn: -15 },
    light: [t.id],
    say: "Browse any network's records.",
    n: '0' + (i + 2)
  }));
  steps.push({ at: 2.4 + nets.length * 2.6, shot: { place: 'kernel', dist: 1.6, elev: 32 }, light: [], say: null });
  return { id: 'explorer', steps };
};
