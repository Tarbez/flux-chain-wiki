/* The ring page's show: the network the page names (?i=, matched against each place's route), its chains lit one by one, then a card
   standing beside it in the network's own colour. Every caption is a fact the place carries (its name and facts), never typed per network. */
function asked() {
  const q = window.ArkUI && ArkUI.route && ArkUI.route.search ? ArkUI.route.search() : String(location.search).replace(/^\?/, '');
  return new URLSearchParams(q).get('i') || '';
}
function fact(place, label) { const f = (place.facts || []).find((x) => x.label === label); return f ? f.value : ''; }

export const SHOW = (space) => {
  const nets = space.targets().filter((t) => t.kind === 'network');
  const i = asked(), place = nets.find((t) => t.route && t.route.query && t.route.query.i === i) || nets[0];
  if (!place) return { id: 'ring', steps: [] };
  const coin = fact(place, 'Coin'), holds = fact(place, 'Holds'), chains = place.children.slice(0, 4);
  const steps = [{ at: 0, shot: { place: place.id, dist: 1.2, elev: 30 }, light: [place.id], say: place.short + ': a network on the kernel.', n: '01' }];
  /* its chains, one after another, each added to what is already lit */
  chains.forEach((c, k) => steps.push({ at: 2 + k * .8, light: [place.id].concat(chains.slice(0, k + 1)), say: k ? undefined : (holds ? 'It holds ' + holds + '.' : 'Its chains light up.'), n: k ? undefined : '02' }));
  const t = 2 + chains.length * .8 + .6;
  steps.push({ at: t, spawn: [{ type: 'card', near: place.id, dx: 1.5, dz: 0, s: .5, token: place.token }], say: coin ? 'Its coin is ' + coin + '.' : 'It has no coin of its own.', n: '03' });
  steps.push({ at: t + 3, shot: { place: place.id, dist: 1.1, elev: 30 }, light: [place.id], say: null });
  /* a step with no caption field leaves the caption as it was */
  steps.forEach((s) => { if (s.say === undefined) { delete s.say; delete s.n; } });
  return { id: 'ring', steps };
};
