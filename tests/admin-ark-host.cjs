'use strict';
/* The editor's tabs, disclosures, segmented groups and the Library's folds are Ark's behaviour
   primitives on Ark's light-DOM host (js/admin/ark-host.js) -- not a local copy.

   Why this exists (docs/ux-audit/components.md §4, cms.md (c); W3-EDITOR 2026-10-19): the editor
   carried its own tabs and disclosure (js/admin/primitives.js) whose classes .ark-tabs /
   .ark-disclosure were ALSO Ark's block classes, so css/admin.css restyled Ark's blocks by accident
   (9 census `ark-overrides`), and the header's lens, the canvas strip's screen size and Edit /
   Preview, the new item's kind and Media's Grid / List each kept their own pressed state with Tab
   through every choice. Each case names the defect it exists to catch.
   Runs the real builders (cut from the editor source, tests/lib/admin-source.cjs) in jsdom with
   the real ArkKit, then without it (the forms' tests boot without the kit). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { arkHostSource, functionSource } = require('./lib/admin-source.cjs');

function boot(withKit) {
  const dom = new JSDOM('<body></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  if (withKit) for (const file of ['js/ark/vendor/engines.js', 'js/ark/vendor/ark-kit.js']) w.eval(fs.readFileSync(file, 'utf8'));
  w.eval(functionSource('h') + '\n' + arkHostSource());
  return w;
}
const key = (w, el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

for (const withKit of [true, false]) {
  const w = boot(withKit), doc = w.document, tag = withKit ? 'with ArkKit' : 'without ArkKit';
  /* ---- tabs ---- */
  {
    const changes = [];
    const content = ['Text', 'Shapes', 'Advanced'].map((t) => { const d = doc.createElement('div'); d.textContent = t + ' form'; return d; });
    const root = w.arkTabs({ label: 'Page sections', items: [{ id: 'content', label: 'Text', content: content[0] }, { id: 'shape', label: 'Shapes', content: content[1] }, { id: 'code', label: 'Advanced', content: content[2] }],
      value: 'shape', onChange: (id) => changes.push(id) });
    doc.body.appendChild(root);
    const tabs = [...root.querySelectorAll('[role="tab"]')], panels = [...root.querySelectorAll('[role="tabpanel"]')];
    assert.equal(tabs.length, 3, 'three tabs'); assert.equal(panels.length, 3, 'three panels');
    assert(root.classList.contains('ark-tabs') && tabs.every((t) => t.classList.contains('ark-tabs__trigger')), "Ark's block classes: css/ark-blocks.css draws them, css/admin.css does not");
    assert.deepEqual(tabs.map((t) => t.getAttribute('aria-selected')), ['false', 'true', 'false'], 'the asked-for tab is selected');
    assert.deepEqual(panels.map((p) => p.hidden), [true, false, true], 'only its panel shows');
    assert.deepEqual(tabs.map((t) => t.tabIndex), [-1, 0, -1], 'one tab stop: the selected tab (APG), not three');
    assert(tabs.every((t, i) => t.getAttribute('aria-controls') === panels[i].id && panels[i].getAttribute('aria-labelledby') === t.id), 'each tab names its panel and the panel its tab');
    assert(panels.every((p) => /^ark-r-/.test(p.id)) && tabs.every((t) => /^ark-r-/.test(t.id)), "generated ids carry Ark's reserved prefix, which layout keys ignore (components.md R4)");
    assert.deepEqual(changes, [], 'drawing the tabs reports no change');
    tabs[2].click();
    assert.deepEqual(changes, ['code'], 'a click reports the new tab once');
    assert.deepEqual(panels.map((p) => p.hidden), [true, true, false]);
    tabs[2].click();
    assert.deepEqual(changes, ['code'], 'clicking the selected tab reports nothing again');
    if (withKit) {
      tabs[2].focus(); key(w, tabs[2], 'ArrowLeft');
      assert.equal(doc.activeElement, tabs[1], 'arrows move focus between the tabs (roving)');
      assert.equal(changes.length, 1, 'manual activation: moving focus does not switch the tab');
    }
    root.remove();
  }
  /* ---- disclosure ---- */
  {
    const toggles = [];
    const content = doc.createElement('dl'); content.innerHTML = '<dt>Key</dt><dd><code>HOME.TITLE</code></dd>';
    const root = w.arkDisclosure({ label: 'Developer details', content, className: 'dev-details', onToggle: (open) => toggles.push(open) });
    doc.body.appendChild(root);
    const trigger = root.querySelector('button'), panel = root.querySelector('[role="region"]');
    assert(trigger && panel, 'a trigger and a named region');
    assert(root.classList.contains('ark-disclosure') && trigger.classList.contains('ark-disclosure__trigger') && panel.classList.contains('ark-disclosure__panel') && trigger.querySelector('.ark-disclosure__icon'), "Ark's disclosure block markup");
    assert.equal(root.getAttribute('data-ark-primitive'), 'disclosure', "the editor's own hook for its drivers");
    assert.equal(trigger.getAttribute('aria-expanded'), 'false', 'closed at first: nothing shouts');
    assert.equal(trigger.getAttribute('aria-controls'), panel.id);
    assert.equal(panel.getAttribute('aria-labelledby'), trigger.id);
    assert(panel.hidden && panel.getAttribute('hidden') === 'until-found', 'the closed panel is hidden="until-found": find-in-page can still reach a key and open it');
    assert.equal(root.getAttribute('data-state'), 'closed', "the root's data-state drives Ark's +/- icon");
    assert(/Developer details/.test(trigger.textContent), 'the trigger says what it opens');
    trigger.click();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert(!panel.hidden, 'open shows the panel');
    assert.equal(root.getAttribute('data-state'), 'open');
    assert.deepEqual(toggles, [true], 'opening is reported once');
    trigger.click();
    assert.deepEqual(toggles, [true, false], 'closing is reported');
    assert(panel.hidden);
    const open = w.arkDisclosure({ label: 'Advanced', content: doc.createElement('div'), defaultOpen: true });
    assert.equal(open.querySelector('button').getAttribute('aria-expanded'), 'true', 'defaultOpen opens it');
    root.remove();
  }
  /* ---- segmented group over existing buttons ---- */
  {
    const root = doc.createElement('div'); root.setAttribute('role', 'group');
    const buttons = ['Desktop', 'Tablet', 'Phone'].map((t) => { const b = doc.createElement('button'); b.type = 'button'; b.textContent = t; root.appendChild(b); return b; });
    doc.body.appendChild(root);
    const picks = [];
    const group = w.arkSegGroup(root, buttons, { selected: 1, onPick: (i, b) => picks.push(i + ':' + b.textContent) });
    assert.deepEqual(buttons.map((b) => b.getAttribute('aria-pressed')), ['false', 'true', 'false'], 'the current choice is pressed');
    assert.equal(root.getAttribute('role'), 'group', 'the group keeps its role and label');
    if (withKit) {
      assert.equal(root.getAttribute('data-ark-part'), 'toggle-group', "Ark's toggle group");
      assert.deepEqual(buttons.map((b) => b.tabIndex), [-1, 0, -1], 'one tab stop (the old groups were three)');
      assert(!buttons.some((b) => b.hasAttribute('aria-selected')), 'a pressed button never carries aria-selected (invalid on role=button)');
    }
    assert.deepEqual(picks, [], 'wiring reports no pick');
    buttons[2].click();
    assert.deepEqual(picks, ['2:Phone'], 'a click reports the new choice once');
    assert.deepEqual(buttons.map((b) => b.getAttribute('aria-pressed')), ['false', 'false', 'true']);
    buttons[2].click();
    assert.deepEqual(picks, ['2:Phone'], 'clicking the pressed choice reports nothing (a device re-pick re-laid the stage for nothing)');
    group.select(0);
    assert.deepEqual(buttons.map((b) => b.getAttribute('aria-pressed')), ['true', 'false', 'false'], 'select() moves the pressed state for a change made by another route');
    assert.deepEqual(picks, ['2:Phone'], 'and reports no pick: the owner already knows');
    if (withKit) {
      assert.deepEqual(buttons.map((b) => b.tabIndex), [0, -1, -1], 'the tab stop follows the pressed choice');
      buttons[0].focus(); key(w, buttons[0], 'ArrowRight');
      assert.equal(doc.activeElement, buttons[1], 'arrows move between the choices');
      key(w, buttons[1], 'Enter');
      assert.deepEqual(picks, ['2:Phone', '1:Tablet'], 'Enter picks the focused choice');
    }
    root.remove();
  }
  /* ---- accordion over sections (the Library's groups) ---- */
  {
    const list = doc.createElement('div');
    const items = ['text', 'media', 'layout'].map((value) => {
      const item = doc.createElement('section'), header = doc.createElement('h4'), trigger = doc.createElement('button'), panel = doc.createElement('div');
      trigger.type = 'button'; trigger.textContent = value; header.appendChild(trigger); panel.textContent = value + ' rows';
      item.append(header, panel); list.appendChild(item);
      return { value, item, header, trigger, panel };
    });
    doc.body.appendChild(list);
    const changes = [];
    const acc = w.arkAccordion(list, items, { label: 'Library groups', open: ['text', 'layout'], onChange: (open) => changes.push(open.join(',')) });
    assert.equal(list.getAttribute('role'), 'group'); assert.equal(list.getAttribute('aria-label'), 'Library groups');
    assert.deepEqual(items.map((it) => it.trigger.getAttribute('aria-expanded')), ['true', 'false', 'true'], 'the asked-for groups are open; several at once');
    assert.deepEqual(items.map((it) => it.panel.hidden), [false, true, false]);
    assert(items.every((it) => it.trigger.getAttribute('aria-controls') === it.panel.id && it.panel.getAttribute('role') === 'region'), 'each trigger names its region');
    assert.deepEqual(changes, [], 'wiring reports nothing');
    items[0].trigger.click();
    assert.deepEqual(changes, ['layout'], 'folding a group reports what is open');
    assert(items[0].panel.hidden);
    acc.open('media');
    assert(!items[1].panel.hidden, 'open(value) opens a group (a search showing a match inside it)');
    assert.deepEqual(changes, ['layout', 'media,layout'], 'and reports it (open values in item order), so the owner guards its own calls');
    acc.close('media'); acc.close('media');
    assert.deepEqual(changes, ['layout', 'media,layout', 'layout'], 'close() of a closed group reports nothing');
    if (withKit) {
      assert.equal(items[0].item.getAttribute('data-state'), 'closed', "Ark writes each item's state");
      items[1].trigger.focus(); key(w, items[1].trigger, 'ArrowDown');
      assert.equal(doc.activeElement, items[2].trigger, 'arrows move between the group heads');
    }
    list.remove();
  }
  console.log('PASS (' + tag + '): tabs, disclosure, segmented group and accordion carry the ARIA, the hidden state and the one tab stop, and report a change once.');
}

/* ---- the collision is gone: no editor sheet restyles an Ark block class, and the local copy is deleted ---- */
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const arkClasses = new Set([...strip(fs.readFileSync('css/ark-blocks.css', 'utf8')).matchAll(/\.(ark-[a-zA-Z0-9_-]*)/g)].map((m) => m[1]));
  for (const file of ['css/admin.css', 'css/studio-embed.css']) {
    const css = strip(fs.readFileSync(file, 'utf8')).replace(/@media[^{]*\{/g, '');
    const overrides = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter((sel) => [...sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].some((c) => arkClasses.has(c[1])));
    assert.deepEqual(overrides, [], `${file} restyles an Ark block class (the census's ark-overrides): ${overrides.join(' | ')}`);
  }
  assert(!fs.existsSync('js/admin/primitives.js'), 'js/admin/primitives.js (the local tabs/disclosure) is deleted');
  const app = fs.readFileSync('admin-app.html', 'utf8');
  assert(!/primitives\.js/.test(app) && /js\/admin\/ark-host\.js/.test(app), 'admin-app.html loads ark-host.js, not primitives.js');
  const tag = (rel) => app.indexOf(`<script src="${rel}" defer>`);
  assert(tag('js/admin/ark-host.js') > tag('js/admin/overlay.js') && tag('js/admin/ark-host.js') < tag('js/admin/controls.js'), 'ark-host.js loads before the first module that draws with it (controls.js)');
  for (const [file, uses] of [['js/admin/editor.js', /A\.arkTabs\(/], ['js/admin/design.js', /A\.arkTabs\(/], ['js/admin/controls.js', /A\.arkDisclosure\(/], ['js/admin/seo.js', /arkDisclosure\(/],
    ['js/admin/nav.js', /A\.arkSegGroup\(\$\('lensSwitch'\)/], ['js/admin/header.js', /A\.arkSegGroup\(\$\('devices'\)[\s\S]*A\.arkSegGroup\(\$\('mode'\)/], ['js/admin/rail.js', /A\.arkSegGroup\(/], ['js/admin/assets.js', /A\.arkSegGroup\(/], ['js/admin/library.js', /A\.arkAccordion\(/]]) {
    assert(uses.test(fs.readFileSync(file, 'utf8')), `${file} uses the Ark primitive (${uses})`);
  }
  const admin = require('./lib/admin-source.cjs').ADMIN;
  assert(!/ArkAdminPrimitives/.test(admin) && !/<details/.test(fs.readFileSync('js/admin/library.js', 'utf8')), 'no editor module reaches for the deleted primitives');
  console.log('PASS: no editor sheet restyles an Ark class; the local primitives are gone and every surface uses the Ark one.');
}
