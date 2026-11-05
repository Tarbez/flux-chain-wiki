/* The stats/now show, "is it up?": a high wide shot of the grid, then up to three networks lit in turn, each with a node spare
   dropping beside it (a node joining), then the wide grid again. Places come from space.targets(), never typed. The caption names the
   network and says what the visitor sees; it quotes no count, because the show has no reading of the nodes (the page has it).
   At most three networks keep the show at five steps and under 12 s. */
export const SHOW = (space) => {
  const nets = space.targets().filter((t) => t.kind === 'network').slice(0, 3);
  const steps = [{ at: 0, shot: { place: null, dist: 1.6, elev: 58 }, light: [], say: 'The grid, from above.', n: '01' }];
  nets.forEach((t, i) => steps.push({
    at: 2 + i * 2.6,
    shot: { place: t.id, dist: 1.2, elev: 34 },
    light: [t.id],
    spawn: [{ type: 'node', near: t.id, dx: 1.3, dz: 0.4, s: 0.45, delay: 0.4, token: t.token }],
    say: t.short + ': nodes answer here.',
    n: '0' + (i + 2)
  }));
  steps.push({ at: 2 + nets.length * 2.6, shot: { place: null, dist: 1.6, elev: 58 }, light: [], clear: true, say: null });
  return { id: 'stats-now', steps };
};
