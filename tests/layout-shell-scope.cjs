'use strict';
/* The persistent shell (header, nav, background layers) is one scope shared by every route
   (js/content/layout.js, "scopes"); a routed page's content is its route's own.

   Why this exists -- two defects, both found 2026-10-18 by tests/browser/full-audit.mjs
   ("toolbar / layout group: Frame + Ungroup only"):

   1. Every per-element edit was stored under the route the editor happened to show, so an
      edit to a header link showed on that one route and the header looked different on every
      other page. A group of two header links made on '/' vanished on /chain; a state group of
      header links worked on '/' only; a component placed after a header link was taken back
      out on every other route ("another route's spot in the persistent header").
   2. ArkLayout.apply() unwrapped every group and wrapped it again in a NEW element on every
      pass (each remount, settle and edit). The header is never remounted, so a selected header
      group was an emptied, detached <div> after the next pass; the editor's selection restore
      compared its text ('') with the rebuilt wrapper's and dropped the selection, hiding the
      toolbar under the Ungroup button. Measured in the failing run: ArkLayout.find() DID return
      the new wrapper for 'group:<id>' on '/'; the old one read '' -- so this was not the
      route-scoped key lookup it was first suspected to be.

   Uses jsdom so the DOM (document order, parents, connectedness) is real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const SHELL_HTML = '<div class="layers"><div class="outlet"></div>'
  + '<header><nav><a>Overview</a><a>How it works</a><a>Docs</a></nav></header></div>';
const PAGE = (id, text) => `<section data-ark-page="${id}"><h1>${text}</h1><p>${text} body</p></section>`;

function load(page) {
  const dom = new JSDOM(`<!doctype html><body><div id="scene">${SHELL_HTML}</div></body>`);
  const doc = dom.window.document;
  const context = vm.createContext({ document: doc, window: dom.window, console,
    ArkUI: { pageCatalog: { a: { path: '/a' }, b: { path: '/b' } },
      /* a minimal block builder: one <p> per instance, its heading as text */
      build: (node) => { const el = doc.createElement('p'); el.textContent = node.props.heading || ''; return el; } } });
  for (const file of ['js/content/layout.js', 'js/content/components.js', 'js/content/states.js', 'js/content/element-motion.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  const env = { doc, scene: doc.getElementById('scene'), $: (s) => doc.querySelector(s), run: (code) => vm.runInContext(code, context) };
  env.L = env.run('ArkLayout'); env.S = env.run('ArkStates'); env.C = env.run('ArkComponents'); env.M = env.run('ArkElementMotion');
  env.mount = (id, text) => { env.$('.outlet').innerHTML = PAGE(id, text); };
  if (page) env.mount(page, page.toUpperCase());
  env.link = (n) => env.$(`header nav a:nth-child(${n})`);
  env.key = (el) => { env.L.annotate(env.scene); return el.getAttribute('data-ark-layout-key'); };
  return env;
}

{
  /* 0. one scope name everywhere: each module sanitizes without layout.js loaded, so each
        repeats '*' -- and a draft keyed by it survives every module's sanitize() */
  const env = load('a');
  assert.equal(env.L.SHELL, '*');
  assert.equal(env.S.SHELL, env.L.SHELL, 'states.js uses ArkLayout\'s shell scope');
  assert.equal(env.C.SHELL, env.L.SHELL, 'components.js uses ArkLayout\'s shell scope');
  assert.equal(env.M.SHELL, env.L.SHELL, 'element-motion.js uses ArkLayout\'s shell scope');
  assert.deepEqual(Object.keys(env.L.sanitize({ routes: { '*': { k: { desktop: { pt: 4 } } } }, groups: { '*': { g: { members: ['a', 'b'] } } }, labels: { '*': { k: 'L' } }, alts: { '*': { k: 'A' } } }).routes), ['*']);
  assert(env.S.sanitize({ routes: { '*': { st1: { trigger: 'self', current: 0, states: [{ label: 'D', members: ['k'] }] } } } }).routes['*'], 'states keep a shell group');
  assert(env.M.sanitize({ routes: { '*': { k: { direction: 'left' } } } }).routes['*'], 'element motion keeps a shell entry');
  assert.equal(env.L.isScope('nope'), false, 'anything else that is not a route is still dropped');
}
{
  /* 1. which scope an element belongs to is decided by structure: in a page root or not */
  const env = load('a');
  assert.equal(env.L.scopeOf(env.link(1), '/a'), '*', 'a header link is the shell\'s');
  assert.equal(env.L.scopeOf(env.$('[data-ark-page] h1'), '/a'), '/a', 'page content is its route\'s');
  assert.equal(env.L.scopeOfAll([env.link(1), env.link(2)], '/a'), '*');
  assert.equal(env.L.scopeOfAll([env.link(1), env.$('[data-ark-page] h1')], '/a'), '/a', 'a set naming page content exists on that route alone');
}
{
  /* 2. a header edit stored under the shell applies on every route; page edits stay on theirs */
  const env = load('a');
  const linkKey = env.key(env.link(1)), h1Key = env.key(env.$('[data-ark-page] h1'));
  let layout = env.L.set(env.L.sanitize({}), '*', linkKey, 'desktop', { pt: 12 });
  layout = env.L.set(layout, '/a', h1Key, 'desktop', { pt: 30 });
  env.L.apply(env.scene, '/a', 1280, layout);
  assert.equal(env.link(1).style.paddingTop, '12px', 'on /a');
  assert.equal(env.$('[data-ark-page] h1').style.paddingTop, '30px');
  env.mount('b', 'B');
  env.L.apply(env.scene, '/b', 1280, layout);
  assert.equal(env.link(1).style.paddingTop, '12px', 'and on /b: the header looks the same on every route');
  assert.equal(env.$('[data-ark-page] h1').style.paddingTop, '', '/a\'s heading edit does not reach /b\'s heading (same key, other page)');
}
{
  /* 3. data saved under a route before the shell scope existed is never rewritten and still
        applies where it was saved; where both exist the shell wins field by field */
  const env = load('a');
  const linkKey = env.key(env.link(2));
  const layout = env.L.sanitize({ routes: { '/a': { [linkKey]: { desktop: { pt: 5, pb: 6 } } }, '*': { [linkKey]: { desktop: { pt: 9 } } } } });
  env.L.apply(env.scene, '/a', 1280, layout);
  assert.equal(env.link(2).style.paddingTop, '9px', 'the shell entry wins');
  assert.equal(env.link(2).style.paddingBottom, '6px', 'the route entry\'s other fields still apply on its route');
  env.mount('b', 'B'); env.L.apply(env.scene, '/b', 1280, layout);
  assert.equal(env.link(2).style.paddingBottom, '', 'and only there');
  assert.equal(env.L.entryFor(layout, '/a', linkKey, env.link(2)).desktop.pt, 9);
  /* a shell entry never lands on page content that happens to share its key */
  const pageKey = env.key(env.$('[data-ark-page] h1'));
  env.L.apply(env.scene, '/b', 1280, env.L.sanitize({ routes: { '*': { [pageKey]: { desktop: { pt: 44 } } } } }));
  assert.equal(env.$('[data-ark-page] h1').style.paddingTop, '', 'the shell scope applies to shell elements only');
}
{
  /* 4. a group of header links: stored under the shell, built on every route, and an unchanged
        group KEEPS its wrapper element across apply() passes (defect 2 above) */
  const env = load('a');
  const members = [env.key(env.link(1)), env.key(env.link(2))], docsKey = env.key(env.link(3));
  const layout = env.L.group(env.L.sanitize({}), '*', 'g1', members, 'Group');
  env.L.apply(env.scene, '/a', 1280, layout);
  const wrapper = env.$('[data-ark-layout-group="g1"]');
  assert(wrapper && wrapper.closest('header'), 'the group is built in the header');
  assert.equal(wrapper.textContent, 'OverviewHow it works');
  env.L.apply(env.scene, '/a', 1280, layout);
  assert.equal(env.$('[data-ark-layout-group="g1"]'), wrapper, 'a second pass keeps the same wrapper (it used to build a new one)');
  assert(wrapper.isConnected && wrapper.textContent === 'OverviewHow it works', 'and does not empty it');
  assert.equal(env.L.find(env.scene, 'group:g1', '/a'), wrapper);
  env.mount('b', 'B'); env.L.apply(env.scene, '/b', 1280, layout);
  assert.equal(env.$('[data-ark-layout-group="g1"]'), wrapper, 'arriving on /b keeps the header group as it is');
  assert.deepEqual(Object.keys(env.L.groupsFor(layout, '/b')), ['g1'], 'the shell group is one of /b\'s groups');
  /* a changed group is rebuilt; an ungrouped one is unwrapped, from whichever scope held it */
  const three = env.L.group(layout, '*', 'g1', members.concat(docsKey), 'Group');
  env.L.apply(env.scene, '/b', 1280, three);
  assert.equal(env.$('[data-ark-layout-group="g1"]').children.length, 3, 'a group whose members changed holds its new members');
  env.L.apply(env.scene, '/b', 1280, env.L.ungroup(three, '/b', 'g1'));
  assert.equal(env.$('[data-ark-layout-group]'), null, 'ungroup from the route shown removes a shell group');
  assert.deepEqual([...env.$('header nav').children].map((a) => a.textContent), ['Overview', 'How it works', 'Docs'], 'in the original order');
  /* a header group saved under one route before the shell scope existed stays on that route */
  const legacy = env.L.group(env.L.sanitize({}), '/a', 'old', members, 'Group');
  env.mount('a', 'A'); env.L.apply(env.scene, '/a', 1280, legacy);
  assert(env.$('[data-ark-layout-group="old"]'), 'on its route');
  env.mount('b', 'B'); env.L.apply(env.scene, '/b', 1280, legacy);
  assert.equal(env.$('[data-ark-layout-group="old"]'), null, 'and nowhere else');
}
{
  /* 5. labels and alt text follow the same scopes */
  const env = load('a');
  const linkKey = env.key(env.link(1));
  const layout = env.L.setLabel(env.L.sanitize({}), '*', linkKey, 'Main link');
  assert.equal(env.L.labelFor(layout, '/b', linkKey), 'Main link', 'a shell label shows on any route');
  assert.equal(env.L.labelFor(layout, '/b', linkKey, env.$('[data-ark-page] h1')), '', 'never on page content');
  assert.equal(env.L.altFor(env.L.setAlt(env.L.sanitize({}), '*', linkKey, 'Alt'), '/b', linkKey), 'Alt');
}
{
  /* 6. a state group of header links works on every route: rendered, clickable, advanced */
  const env = load('a');
  const members = [env.key(env.link(1)), env.key(env.link(2))];
  let states = env.S.createStateGroup(env.S.sanitize({}), '*', 'st1', members, 'self');
  states = env.S.addState(states, '/b', 'st1', 'Two');
  assert.equal(env.S.groupFor(states, '/b', 'st1').states.length, 2, 'a mutator given the route shown finds the shell group');
  env.mount('b', 'B');
  assert.deepEqual(Array.from(env.S.renderAll(env.scene, '/b', states)), ['st1'], 'the shell group renders on /b');
  assert.equal(env.link(1).getAttribute('data-ark-state-group'), 'st1');
  assert.equal(env.S.findTriggerMatch(env.scene, '/b', states, env.link(2)), 'st1', 'and a click on it is its trigger on /b');
  const next = env.S.advance(states, '/b', 'st1');
  assert.equal(env.S.groupFor(next, '/b', 'st1').current, 1, 'advance() finds it from the route shown');
  env.S.render(env.scene, '/b', 'st1', next);
  assert.equal(env.link(1).style.display, 'none', 'state 0 hides on /b');
  assert(env.$('[data-ark-insert="state-st1-1"]').closest('header'), 'and state 1\'s anchor goes in the header');
}
{
  /* 7. a component after a header link stays on every route (it used to be taken back out on
        every route but the one it was placed on) */
  const env = load('a');
  const linkKey = env.key(env.link(3));
  let comps = env.C.createMaster(env.C.sanitize({}), 'm1', 'RBLOCK_TEXT_V1', { heading: 'Hi' }, 'Hello');
  comps = env.C.placeInstance(comps, '*', 'spot1', linkKey, [], 'i1', 'm1');
  env.C.renderAll(env.scene, '/a', comps);
  const spot = env.$('[data-ark-spot]');
  assert(spot && spot.closest('header'), 'the spot is placed after the header link');
  assert.equal(env.C.instancesAt(comps, '/a', 'spot1').length, 1, 'the instance is found from the route shown');
  env.mount('b', 'B'); env.C.renderAll(env.scene, '/b', comps);
  assert.equal(env.$('[data-ark-spot]'), spot, 'arriving on /b keeps it');
  assert.equal(spot.textContent, 'Hi');
  comps = env.C.setOverride(comps, '/b', 'spot1', 'i1', 'heading', 'Over');
  assert.equal(env.C.instancesAt(comps, '/b', 'spot1')[0].overrides.heading, 'Over', 'an override from the route shown reaches the shell instance');
  /* a header spot saved under one route still belongs to that route */
  let legacy = env.C.createMaster(env.C.sanitize({}), 'm1', 'RBLOCK_TEXT_V1', { heading: 'Old' }, 'Old');
  legacy = env.C.placeInstance(legacy, '/a', 'spot2', linkKey, [], 'i2', 'm1');
  env.C.renderAll(env.scene, '/b', legacy);
  assert.equal(env.$('[data-ark-insert="spot2"]'), null, 'a route\'s header spot does not show on another route');
}
console.log('shell scope: header edits, groups, labels, states and components apply on every route; groups keep their wrapper across passes');
