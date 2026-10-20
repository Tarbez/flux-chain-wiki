/* =====================================================================
   POPULATED DRAFTS for the publish round-trip tests
   ---------------------------------------------------------------------
   The project's saved settings-defaults/components/states/canvas-transitions/
   element-motion files are near-empty or default today, and an empty or default
   draft that is dropped on the way through the archive reads back as the very
   same default -- a round trip of defaults cannot see the defect it exists for
   (publish once carried 8 of the 13 drafts and nobody saw it). So every one of
   the five is built non-default here, through each module's OWN mutators, so
   the shapes tested are the shapes the editor writes. Strings carry curly
   quotes and dashes on purpose: a codec that folded them would still "look right".

   Used by tests/site-drafts.test.mjs (Node) and tests/browser/publish-flows.mjs
   (Chromium). Importing this file runs nothing.
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const GROUP = 'pubgroup';
export const BLOCK_TEXT = 'Published state “two” — survives the mesh';
export const STATE_LABEL = 'Second — published';

function load(root, file, global, needs = []) {
  const context = vm.createContext({});
  for (const f of [...needs, `js/content/${file}.js`, `js/content/${file}-data.js`]) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context, { filename: f });
  return { api: vm.runInContext(global, context), value: vm.runInContext(`${global}.get()`, context) };
}
/* out of the vm realm, the same way the editor's drafts pass through JSON */
const here = (v) => JSON.parse(JSON.stringify(v));

/* -> the five drafts, every one different from its module's defaults.
   `memberKey` is a real data-ark-layout-key on `route` when the result must render
   (the browser test discovers one); any key is fine for a pure round trip. */
export function populatedDrafts(root, { route = '/', memberKey = 'copy:home.TITLE' } = {}) {
  const defaults = load(root, 'settings-defaults', 'ArkSiteDefaults');
  const components = load(root, 'components', 'ArkComponents');
  const states = load(root, 'states', 'ArkStates');
  const transitions = load(root, 'canvas-transitions', 'ArkCanvasTransitions');
  const motion = load(root, 'element-motion', 'ArkElementMotion');

  const settingsDefaults = defaults.api.sanitize({ theme: 'defxn-tide', motif: 'traces', patternConfig: { traces: { structure: 33, visibility: 44, delay: 2.5, animated: false } } });

  /* a state group on a real element, a second state, and that state shown first: its
     content is a component instance in the state's anchor (js/content/states.js) */
  let s = states.api.createStateGroup(states.value, route, GROUP, [memberKey], 'self');
  s = states.api.addState(s, route, GROUP, STATE_LABEL);
  s = states.api.setCurrent(s, route, GROUP, 1);
  let c = components.api.createMaster(components.value, 'pubblock', 'RBLOCK_TEXT_V1', { heading: BLOCK_TEXT }, 'Published block');
  c = components.api.insertInstance(c, route, states.api.anchorId(GROUP, 1), 'pubkey', 'pubblock');

  const canvasTransitions = transitions.api.sanitize({ effect: 'fade-scale', outDuration: 640, inDuration: 410, easing: 'ease-in-out' });
  const elementMotion = motion.api.set(motion.value, route, memberKey, { direction: 'left', distance: 24, duration: 480, delay: 60 });

  const out = here({ settingsDefaults, components: c, states: s, canvasTransitions, elementMotion });
  // Each must really differ from its module's defaults, or the round trip proves nothing.
  const blank = here({ settingsDefaults: defaults.api.defaults(), components: components.api.sanitize({}), states: states.api.sanitize({}), canvasTransitions: transitions.api.defaults(), elementMotion: motion.api.defaults() });
  for (const key of Object.keys(out)) if (JSON.stringify(out[key]) === JSON.stringify(blank[key])) throw new Error(`fixture ${key} came out equal to its defaults (a mutator refused its input), so it would not detect a dropped draft`);
  if (!out.states.routes[route] || !out.states.routes[route][GROUP] || out.states.routes[route][GROUP].current !== 1) throw new Error('fixture state group was not created on ' + route);
  return out;
}
