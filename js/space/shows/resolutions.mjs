/* The resolutions page's show: the open job's three steps (Define, Publish, Resolve) in the space. Define looks at the kernel, Publish
   sets a record beside a network, Resolve lights that network. The captions are the job's own step lines, cut to ten words.
   No job names a network in the data, so the job's place in the list picks one (the same job always gets the same network). */
const STEP_NAMES = ['Define', 'Publish', 'Resolve'];
function asked() {
  const q = window.ArkUI && ArkUI.route && ArkUI.route.search ? ArkUI.route.search() : String(location.search).replace(/^\?/, '');
  return new URLSearchParams(q).get('s') || '';
}
/* a step line of more than ten words keeps its first ten, ending on a full stop */
function short(text) { const w = String(text || '').replace(/\.$/, '').split(/\s+/); return w.slice(0, 10).join(' ') + '.'; }

/* the show for one job (an item of ArkResolutions); the page calls this when the visitor opens another job */
export function showFor(space, item) {
  const R = window.ArkResolutions, all = R ? R.all() : [];
  const job = item || (R && R.find(asked())) || all[0];
  const nets = space.targets().filter((t) => t.kind === 'network');
  if (!job || !nets.length) return { id: 'resolutions', steps: [] };
  const net = nets[Math.max(0, all.findIndex((x) => x.slug === job.slug)) % nets.length];
  const say = (k) => (job.steps[k] ? short(job.steps[k]) : STEP_NAMES[k] + '.');
  return { id: 'resolutions:' + job.slug, steps: [
    { at: 0, clear: true, shot: { place: 'kernel', dist: 1.3, elev: 24 }, light: ['kernel'], say: say(0), n: '01' },
    { at: 3, shot: { place: net.id, dist: 1.2, elev: 30 }, spawn: [{ type: 'record', near: net.id, dx: 1.4, dz: 0, s: .5, token: net.token }], light: [], say: say(1), n: '02' },
    { at: 6.5, light: [net.id], say: say(2), n: '03' },
    { at: 10, say: null }
  ] };
}
/* replay for the job the visitor picked: stop what plays, start this job's show */
export function replay(space, item) { if (!space || !space.ready) return; space.stopShow(); space.play(showFor(space, item)); }
export const SHOW = (space) => showFor(space, null);
