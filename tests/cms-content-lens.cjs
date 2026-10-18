'use strict';
/* The Content lens: which field a piece of text on the canvas is bound to, and the inline edit's
   messages (js/main.js, the "CONTENT LENS" block; the editor's half is js/admin/bridge.js
   applyCmsCopyEdit -> setItemField, driven end to end by tests/browser/inline-content.mjs).

   Why this exists: the canvas could select text but not change it -- the same words were edited
   in a separate form, and nothing on the canvas said which field (if any) held them. The binding
   is DERIVED (an element's text equals a field's value, narrowed by structure: a runtime copy key
   on the element, then the source that owns where it sits), never a hand list of editable
   elements -- so each case below is a way that derivation could plausibly go wrong:
     - two fields with the same words must not silently pick one (nav "Docs" vs a page's "Docs");
     - text inside a component instance is the instance's prop, even when a page field reads the same;
     - unbound text must say what writes it (the page module's file, the shell pattern) -- a
       refusal names what it needs;
     - the value written back is the element's TEXT (textContent, never innerText: text-transform
       would save an eyebrow in capitals), with <br> as a line break, and unchanged words keep the
       field's exact spacing (no spurious dirty draft from a click);
     - Escape posts the original value back; a committed change is one undo entry. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8');
const startMark = main.indexOf('  /* =====================================================================\n     CONTENT LENS');
const endMark = main.indexOf('  /* ===================================================================== end CONTENT LENS */');
assert(startMark > 0 && endMark > startMark, 'js/main.js keeps the Content lens in one delimited block');
const block = main.slice(startMark, endMark);
const bridge = fs.readFileSync('js/admin/bridge.js', 'utf8');
const addrStart = bridge.indexOf('  function cmsCopyAddress(field) {'), addrEnd = bridge.indexOf('  function applyCmsCopyEdit(edit) {');
assert(addrStart > 0 && addrEnd > addrStart, 'js/admin/bridge.js parses copy-edit field addresses in cmsCopyAddress');

const PAGE = `
<header id="shell"><nav><a class="nav-docs" href="/docs" data-ark-layout-key="path:a:1">Docs</a><span data-ark-layout-key="path:span:1">Built by hand</span></nav></header>
<main><section data-ark-page="zero">
  <h1 data-ark-layout-key="copy:home.TITLE">Resolution,  not consensus.</h1>
  <p data-ark-layout-key="page:/p:1">Docs</p>
  <p data-ark-layout-key="page:/p:2">Same words</p>
  <p data-ark-layout-key="page:/p:3">Written in home.js</p>
  <a data-ark-layout-key="page:/a:1" href="/about">Explore DEFXN</a>
  <div data-ark-layout-key="page:/div:1"><h2>One</h2><p>Two</p></div>
  <div data-ark-component-key="i1" data-ark-component-anchor="home-after" data-ark-component-master="m1" data-ark-layout-key="component:i1"><h3 data-ark-layout-key="component:i1/h3">Same words</h3></div>
  <p class="eyebrow" style="text-transform:uppercase" data-ark-layout-key="page:/p:4">quiet eyebrow</p>
  <p data-ark-layout-key="page:/p:5">Resolution, not consensus.</p>
  <div data-ark-layout-key="page:/div:2"><span data-ark-layout-key="page:/span:2"><i data-icon></i>Resolution, not consensus.</span></div>
</section>
<section data-ark-page="article/first-note"><h1 data-ark-layout-key="page:/h1:1">First note</h1><p data-ark-layout-key="page:/p:9">The first paragraph.</p></section>
</main>`;

function setup(route) {
  const dom = new JSDOM('<!doctype html><body>' + PAGE + '</body>', { url: 'https://defxn.test/' });
  const { window } = dom, document = window.document;
  const manifests = [
    { id: 'home', route: '/', group: 'page', fields: {
      TITLE: { label: 'Heading', kind: 'line', value: 'Resolution, not consensus.' },
      SHARED: { label: 'Shared words', kind: 'text', value: 'Same words' },
      'CLOSING.LABEL': { label: 'Closing link', kind: 'line', value: 'Explore DEFXN' },
      'CLOSING.HREF': { label: 'Closing link target', kind: 'link', value: 'route:about' },
      'OTHER.HREF': { label: 'Another link to about', kind: 'link', value: 'route:about' },
      EYEBROW: { label: 'Eyebrow', kind: 'line', value: 'quiet eyebrow' },
      DOCS: { label: 'A page word', kind: 'line', value: 'Docs' } } },
    { id: 'about', route: '/about', group: 'page', fields: { SHARED: { label: 'Same, elsewhere', kind: 'line', value: 'Same words' } } },
    { id: 'nav', route: '/', group: 'site', fields: { DOCS: { label: 'Header link: docs', kind: 'line', value: 'Docs' },
      OVERVIEW: { label: 'Header link: overview', kind: 'line', value: 'Built by hand' }, ABOUT: { label: 'Pattern link: about', kind: 'line', value: 'Built by hand' } } },
  ];
  const posted = [];
  const ctx = {
    window, document, location: window.location, URL: window.URL, Node: window.Node,
    host: document.body, ArkUI: {
      pageCatalog: { zero: { path: '/', module: 'zero', scripts: ['js/ark/dash-kit.js', 'js/pages/home-flow.js', 'js/pages/home.js'] },
        'article/first-note': { path: '/learnings/first-note', module: 'article', scripts: ['js/pages/article.js'] } },
      dash: { resolveLinkField: (value) => ({ href: value.replace(/^route:/, '/') }) } },
    ArkManifest: { all: () => manifests, get: (id) => manifests.find((m) => m.id === id) },
    LearningContent: { articles: [{ slug: 'first-note', title: 'First note', summary: 'A summary.', relatedPage: 'route:about', sections: [['Heading one', 'The first paragraph.']] }],
      find(slug) { return this.articles.find((a) => a.slug === slug); } },
    ArkComponents: { instancesAt: () => [{ key: 'i1', masterId: 'm1', overrides: { heading: 'Same words' } }] },
    ArkLayout: { SHELL: '*' },
    cmsComponentsDraft: { masters: { m1: { label: 'Text block', props: { heading: 'Definition heading', body: 'Body' } } } },
    previewCopyText: (v) => String(v == null ? '' : v).replace(/\s+/g, '').trim(),
    cmsRoutePath: () => route,
    cmsScopeOf: (el) => (el.closest('[data-ark-page]') ? route : '*'),
    cmsComponentRootOf: (el) => el.closest('[data-ark-component-key]'),
    cmsRectOf: () => ({ left: 0, top: 0, width: 10, height: 10 }),
    cmsPreviewEdit: true, cmsPreviewSelections: [], cmsLayoutUndo: [], cmsLayoutRedo: [],
    cmsReportLayoutHistory: () => {}, placeCmsLayoutUi: () => {}, emitCmsLayoutSelection: () => {},
    cmsComponentsCommand: (data) => posted.push(Object.assign({ via: 'components' }, data)),
    cmsOnMessage: () => posted.push({ via: 'replayed-state' }),
    requestAnimationFrame: (f) => f(), getComputedStyle: (el) => window.getComputedStyle(el),
  };
  /* the preview reads its registries as window globals, as on the real page */
  ['ArkManifest', 'LearningContent', 'ArkComponents', 'ArkLayout'].forEach((name) => { window[name] = ctx[name]; });
  ctx.window.parent = { postMessage: (message) => posted.push(message) };
  vm.createContext(ctx);
  vm.runInContext(block + '\n' + bridge.slice(addrStart, addrEnd), ctx);
  const $ = (sel) => document.querySelector(sel);
  return { ctx, $, posted, run: (code) => vm.runInContext(code, ctx), info: (el) => { ctx.__el = el; return vm.runInContext('cmsContentInfo(__el)', ctx); } };
}

{
  /* a page field: the copy key is the address; whitespace differences do not break the match */
  const t = setup('/');
  const info = t.info(t.$('h1'));
  assert.equal(info.bound, true);
  assert.equal(info.field, 'HOME.TITLE');
  assert.equal(info.kind, 'page'); assert.equal(info.fieldKey, 'TITLE');
  assert.equal(info.multiline, false, 'a line field edits on one line');
  assert.equal(info.file, 'js/content/manifests/home.js');
}
{
  /* the same words in the shell's Site chrome and on a page: the runtime copy key wins, else the
     owner of where the element sits (the shell -> Site chrome; the page -> its own manifest) */
  const t = setup('/');
  assert.equal(t.info(t.$('.nav-docs')).field, 'NAV.DOCS', 'a header link is Site chrome');
  assert.equal(t.info(t.$('[data-ark-layout-key="page:/p:1"]')).field, 'HOME.DOCS', 'the same word on the home page is the home page\'s');
  t.$('[data-ark-layout-key="page:/p:1"]').setAttribute('data-ark-copy-keys', 'NAV.DOCS');
  assert.equal(t.info(t.$('[data-ark-layout-key="page:/p:1"]')).field, 'NAV.DOCS', 'a runtime copy key on the element is authoritative');
  t.$('[data-ark-layout-key="page:/p:1"]').setAttribute('data-ark-copy-preview', '');
  assert.equal(t.info(t.$('[data-ark-layout-key="page:/p:1"]')).field, 'HOME.DOCS', 'a key the editor annotation added is not a runtime key');
}
{
  /* still ambiguous: refused, naming every candidate -- never a silent pick */
  const t = setup('/elsewhere');
  const info = t.info(t.$('[data-ark-layout-key="page:/p:2"]'));
  assert.equal(info.bound, false);
  assert.match(info.reason, /2 fields \(HOME\.SHARED, ABOUT\.SHARED\)/);
  assert.match(info.remedy, /Page fields/);
  const owned = setup('/');
  assert.equal(owned.info(owned.$('[data-ark-layout-key="page:/p:2"]')).field, 'HOME.SHARED', 'on its own route the page owns it');
  assert.equal(owned.info(owned.$('[data-ark-layout-key="page:/p:2"]')).multiline, true, 'a text field edits as a paragraph');
}
{
  /* text inside a component instance is that instance's prop (override), not the page field with the same words */
  const t = setup('/');
  const info = t.info(t.$('h3'));
  assert.equal(info.kind, 'component');
  assert.equal(info.field, 'component:home-after/i1/heading');
  assert.equal(info.override, 'Same words', 'the instance\'s own override is what an undo restores');
}
{
  /* an article's fields, addressed by their place in the article's shape */
  const t = setup('/learnings/first-note');
  assert.equal(t.info(t.$('[data-ark-page="article/first-note"] h1')).field, 'article:first-note/title');
  const para = t.info(t.$('[data-ark-layout-key="page:/p:9"]'));
  assert.equal(para.field, 'article:first-note/sections.0.1');
  assert.equal(para.multiline, true, 'a paragraph element edits as a paragraph');
  assert.match(para.label, /Section 1, paragraph 1/);
}
{
  /* unbound text names what writes it, and how to make it editable */
  const t = setup('/');
  const page = t.info(t.$('[data-ark-layout-key="page:/p:3"]'));
  assert.equal(page.bound, false);
  assert.match(page.reason, /page module "zero" \(js\/pages\/home\.js\)/, 'the page module\'s own file, from the catalog');
  assert.match(page.remedy, /ArkCopy\.text/);
  const span = t.$('[data-ark-layout-key="path:span:1"]');
  /* two Site chrome fields with the same words (the real NAV.OVERVIEW / NAV.ABOUT): refused ... */
  assert.match(t.info(span).reason, /2 fields \(NAV\.OVERVIEW, NAV\.ABOUT\)/);
  /* ... until the render shows which one code read by name (ArkCopy.text, recorded in the preview) */
  t.run('cmsCopyRead["NAV.OVERVIEW"] = true');
  assert.equal(t.info(span).field, 'NAV.OVERVIEW');
  span.textContent = 'Typed in js';
  const shell = t.info(span);
  assert.match(shell.reason, /F_SCENE_RZERO_V0/);
  const box = t.info(t.$('[data-ark-layout-key="page:/div:1"]'));
  assert.match(box.reason, /holds 2 separate pieces of text/);
}
{
  /* a link's target is the link field in the same manifest that resolves to its href; two
     resolve there, so the one sharing the label's prefix (CLOSING.) */
  const t = setup('/');
  const info = t.info(t.$('[data-ark-layout-key="page:/a:1"]'));
  assert.equal(info.field, 'HOME.CLOSING.LABEL');
  assert.equal(info.link.field, 'HOME.CLOSING.HREF');
  assert.equal(info.link.value, 'route:about');
  const nav = t.info(t.$('.nav-docs'));
  assert.match(nav.link.refusal, /no link field holds/, 'a link target written in code is refused with its source');
}
{
  /* the click picks the innermost keyed element that binds, climbing past what does not */
  const t = setup('/');
  t.ctx.__el = t.$('h1').firstChild;
  const picked = t.run('cmsContentPick(__el)');
  assert.equal(picked.element, t.$('h1'));
}
{
  /* the words written back: textContent with <br> as a line break (never innerText, which would
     apply text-transform), and unchanged words keep the field's exact value */
  const t = setup('/');
  const eyebrow = t.$('[data-ark-layout-key="page:/p:4"]');
  t.ctx.__el = eyebrow;
  assert.equal(t.run('cmsEditableText(__el)'), 'quiet eyebrow');
  eyebrow.innerHTML = 'line one<br>line two';
  assert.equal(t.run('cmsEditableText(__el)'), 'line one\nline two');
  /* the home heading draws each line of its value as a block span: those are line breaks too
     (decided by layout -- a tag list would break on the next page that does the same with a div) */
  eyebrow.innerHTML = '<span style="display:block">Not one chain.</span><span style="display:block">A world</span><span style="display:inline">of </span>them.';
  assert.equal(t.run('cmsEditableText(__el)'), 'Not one chain.\nA world\nof them.');
  t.ctx.__c = { element: t.$('h1'), info: t.info(t.$('h1')) };
  t.$('h1').textContent = 'Resolution, not   consensus.';
  assert.equal(t.run('cmsInlineValue(__c)'), 'Resolution, not consensus.', 'a click that changes no words changes no draft');
  t.ctx.__c.info.multiline = false; t.$('h1').innerHTML = 'Two<br>lines';
  assert.equal(t.run('cmsInlineValue(__c)'), 'Two lines', 'a line field never stores a line break');
}
{
  /* the edit itself: every input posts the value; blur commits once (final) and leaves one undo entry */
  const t = setup('/');
  const h1 = t.$('h1'), info = t.info(h1);
  t.ctx.__el = h1; t.ctx.__info = info;
  t.run('cmsBeginInline(__el, __info, null)');
  assert.equal(h1.hasAttribute('data-ark-inline-editing'), true);
  h1.textContent = 'Resolution, by construction.';
  t.run('cmsInlineInput()');
  const live = t.posted.filter((m) => m.type === 'defxn-cms-preview-copy-edit');
  assert.deepEqual(live.map((m) => [m.field, m.value, m.final, m.route]), [['HOME.TITLE', 'Resolution, by construction.', false, '/']]);
  t.run('cmsEndInline(true)');
  const all = t.posted.filter((m) => m.type === 'defxn-cms-preview-copy-edit');
  assert.equal(all.length, 2); assert.equal(all[1].final, true); assert.equal(all[1].value, 'Resolution, by construction.');
  assert.equal(h1.hasAttribute('contenteditable'), false, 'the element is plain page markup again');
  const undo = t.run('cmsLayoutUndo');
  assert.equal(undo.length, 1);
  assert.deepEqual([undo[0].cmsCopy.before, undo[0].cmsCopy.after], ['Resolution, not consensus.', 'Resolution, by construction.']);
  /* every other copy of the field on the page shows the committed words at once, no re-render:
     a plain copy, and one drawn beside an icon (its one text node; the icon stays); the wrapper
     that holds it is not rewritten (innermost only) */
  assert.equal(t.$('[data-ark-layout-key="page:/p:5"]').textContent, 'Resolution, by construction.');
  const span = t.$('[data-ark-layout-key="page:/span:2"]');
  assert.equal(span.textContent, 'Resolution, by construction.');
  assert(span.querySelector('[data-icon]'), 'the icon beside the copied words survives');
  assert(t.$('[data-ark-layout-key="page:/div:2"]').contains(span), 'the wrapper still holds its span');
  assert.equal(t.$('[data-ark-layout-key="page:/p:2"]').textContent, 'Same words', 'a different field is untouched');
  /* the commit is not re-sent as a whole site (that rebuilt the page and flashed it blank): this
     document's own copy of the field takes the words, so the same element still binds next click */
  assert.equal(t.ctx.ArkManifest.get('home').fields.TITLE.value, 'Resolution, by construction.');
  assert.equal(t.info(h1).field, 'HOME.TITLE', 'the edited heading is still bound to its field');
  /* Escape: the text goes back and the original value is posted as final */
  const again = setup('/');
  const h = again.$('h1'); again.ctx.__el = h; again.ctx.__info = again.info(h);
  again.run('cmsBeginInline(__el, __info, null)');
  h.textContent = 'Something else'; again.run('cmsInlineInput()');
  h.dispatchEvent(new again.ctx.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(h.textContent, 'Resolution,  not consensus.', 'Escape restores the words as they were rendered');
  const last = again.posted.filter((m) => m.type === 'defxn-cms-preview-copy-edit').pop();
  assert.deepEqual([last.value, last.final, last.history], ['Resolution, not consensus.', true, 'revert']);
  assert.equal(again.run('cmsLayoutUndo').length, 0, 'a reverted edit leaves nothing to undo');
  /* a site the editor sent while the words were typed is held, and never applied once anything was
     typed: it carries half-typed words. The final edit says so (stale) and the editor re-sends. */
  const held = setup('/');
  const hh = held.$('h1'); held.ctx.__el = hh; held.ctx.__info = held.info(hh);
  held.run('cmsBeginInline(__el, __info, null)');
  hh.textContent = 'Half'; held.run('cmsInlineInput()');
  held.run('cmsInline.pending = { data: "held site" }');
  hh.textContent = 'Half typed, then done'; held.run('cmsInlineInput()');
  held.run('cmsEndInline(true)');
  const fin = held.posted.filter((m) => m.type === 'defxn-cms-preview-copy-edit' && m.final).pop();
  assert.deepEqual([fin.value, fin.stale], ['Half typed, then done', true]);
  assert.equal(held.posted.some((m) => m.via === 'replayed-state'), false, 'the held site was not applied');
  /* untouched words: the held site is applied as it is */
  const idle = setup('/');
  const ih = idle.$('h1'); idle.ctx.__el = ih; idle.ctx.__info = idle.info(ih);
  idle.run('cmsBeginInline(__el, __info, null)'); idle.run('cmsInline.pending = { data: "held site" }'); idle.run('cmsEndInline(true)');
  assert.equal(idle.posted.some((m) => m.via === 'replayed-state'), true, 'nothing typed: the held site is applied');
  /* a component's edit is its override, written inside the preview */
  const comp = setup('/');
  const h3 = comp.$('h3'); comp.ctx.__el = h3; comp.ctx.__info = comp.info(h3);
  comp.run('cmsBeginInline(__el, __info, null)'); h3.textContent = 'New heading'; comp.run('cmsEndInline(true)');
  const cmd = comp.posted.find((m) => m.via === 'components');
  assert.deepEqual([cmd.action, cmd.anchorId, cmd.key, cmd.propPath, cmd.value], ['set-override', 'home-after', 'i1', 'heading', 'New heading']);
}
{
  /* the editor's parse of the same addresses (js/admin/bridge.js cmsCopyAddress) */
  const t = setup('/');
  assert.deepEqual(JSON.parse(JSON.stringify(t.run('cmsCopyAddress("HOME.CLOSING.LABEL")'))), { kind: 'page', id: 'home', key: 'CLOSING.LABEL' });
  assert.deepEqual(JSON.parse(JSON.stringify(t.run('cmsCopyAddress("article:first-note/sections.0.1")'))), { kind: 'article', id: 'first-note', key: 'sections.0.1' });
  assert.deepEqual(JSON.parse(JSON.stringify(t.run('cmsCopyAddress("component:home-after/i1/heading")'))), { kind: 'component', anchorId: 'home-after', instanceKey: 'i1', key: 'heading' });
  assert.equal(t.run('cmsCopyAddress("a sentence")'), null);
}
console.log('PASS: the Content lens derives each text\'s field, refuses with its source, and posts the edit');
