/* =====================================================================
   ADMIN EDITOR · SEO PANELS (js/admin/seo.js)
   ---------------------------------------------------------------------
   Owns: every SEO control, derived from ArkSEO's field definitions (seoFieldRows) --
   a page's SEO tab, the canvas page picker's SEO popover, the site-wide SEO and
   AI-crawler section of Theme & defaults -- and saveSeoDraft (called by Save).
   Must not: list an SEO field or crawler by hand (tests/seo-fields.cjs) -- the rows
   come from ArkSEO.OVERRIDE_FIELDS / SITE_FIELDS / AI_BOTS.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, $ = A.$, selectDesign = A.selectDesign, touch = A.touch,
      refreshList = A.refreshList, clone = A.clone, status = A.status, download = A.download,
      ctlSegField = A.ctlSegField, ctlSelectField = A.ctlSelectField, ctlField = A.ctlField, arkDisclosure = A.arkDisclosure;
  /* defined by files loaded after this one: resolved when called */
  var closePop = A.later('closePop'), openPop = A.later('openPop'),
      postCmsPreviewState = A.later('postCmsPreviewState');

  /* This page's SEO, as a popover on the header's page picker: the fields that used to fill the
     right panel's SEO tab, from the same ArkSEO definitions (seoFieldsPanel). Site-wide SEO is
     not here -- it is site config, so it sits in Theme & defaults (buildSiteSeoPanel). */
  function renderPageSeoPop(p) {
    p.classList.add('seo-pop');
    const route = state.cmsRoutes.find((r) => r.path === state.cmsCurrentRoute) || { path: state.cmsCurrentRoute };
    const name = A.siteList ? (A.siteList().rows.find((r) => r.path === route.path) || {}).title : '';
    const head = document.createElement('h4'); head.textContent = 'Search & sharing \u00b7 ' + (name || route.title || route.path); p.appendChild(head);
    if (!window.ArkSEO) { p.appendChild(h('p', { class: 'hint', text: 'SEO editing is unavailable: js/content/seo.js did not load into the editor. Reload; if it persists, check admin-app.html still includes it.' })); return; }
    const map = route.seoArticle ? 'articles' : 'pages', id = route.seoArticle || route.seoId;
    if (id && state.seoDraft[map] && (state.seoDraft[map][id] || ArkSEO[map === 'pages' ? 'pageIds' : 'articleSlugs']().indexOf(id) >= 0)) {
      p.appendChild(h('p', { class: 'hint', text: 'How this page shows up in search results and when its link is shared. Leave a field blank and it is taken from the page itself and the site\u2019s defaults.' }));
      p.appendChild(seoFieldsPanel(ArkSEO.OVERRIDE_FIELDS, () => seoOverrideTarget(map, id), seoEdited));
    } else {
      /* plain words first; the catalog's field names are Developer details (docs/ux-audit/cms.md P1-2) */
      p.appendChild(h('p', { class: 'hint seo-refusal', text: 'This page has no search settings of its own, so it uses the defaults for every page. A developer can give it its own.' }));
      p.appendChild(A.devDetails([['Address', route.path], ['Why', 'this route has no page id or article slug in js/pages/catalog.js, so there is nothing to store an override under'], ['Remedy', 'give its catalog entry a seoId (pages) or seoArticle (articles)']]));
    }
    const site = document.createElement('button'); site.type = 'button'; site.className = 'btn small'; site.textContent = 'Defaults for every page…';
    site.title = 'Site style, Search defaults: what every page falls back to, and which AI assistants may read the site';
    site.addEventListener('click', () => { closePop(); openSiteSeo(); });
    p.appendChild(site);
  }
  /* a repaint (refreshPop, on every preview message) must not pull the caret out of a field */
  renderPageSeoPop.holdWhileEditing = true;
  function openPageSeo() { if (state.popAnchor !== $('btnPageSeo')) openPop($('btnPageSeo'), renderPageSeoPop, 'left'); }
  /* "Search & sharing for this page", in the header's More menu (a panel test has none) */
  if ($('btnPageSeo')) $('btnPageSeo').addEventListener('click', (e) => openPop(e.currentTarget, renderPageSeoPop, 'left'));
  /* Site style, on its Search defaults tab */
  function openSiteSeo() {
    selectDesign();
    if (typeof A.showSiteStyleTab === 'function') A.showSiteStyleTab('search');
    const box = $('siteSeo'); if (box) box.scrollIntoView({ block: 'start' });
  }

  /* =========================================================================
     Search and AI. Edits the real seoDraft (js/content/seo.js, saved to seo-data.js by
     saveEverything() like every other draft), every row derived from ArkSEO's field
     definitions by seoFieldRows() (see there). Two homes, by scope: the current route's own
     override is a popover on the header's page picker (renderPageSeoPop), and the site-wide
     fields plus the AI-crawler policy are a section of Theme & defaults (buildSiteSeoPanel) --
     they used to share a fixed right-hand SEO tab that took the canvas's width full time.
     Each edit is folded into cmsSourceSite and re-sent to the preview, whose router re-emits
     the page's <title>/meta/robots/canonical/JSON-LD (js/ark/page-router.js) from it, so the
     real output can be inspected before Save; the design checks re-run on it too.
     The AI-crawler list is ArkSEO.AI_BOTS -- the same list robots.txt is written from. */
  let seoPreviewT = 0;
  function seoEdited() {
    touch(); refreshList();
    if (!state.cmsSourceSite) return;
    state.cmsSourceSite.seo = clone(state.seoDraft);
    /* one remount for a burst of edits (tabbing through fields commits each on 'change');
       the design checks re-run when the preview reports ready, never mid-remount */
    clearTimeout(seoPreviewT); seoPreviewT = setTimeout(postCmsPreviewState, 250);
  }
  function buildSiteSeoPanel() {
    const wrap = h('div', { class: 'page-law-panel', id: 'siteSeo' });
    if (!window.ArkSEO) { wrap.appendChild(h('p', { class: 'empty-state', text: 'SEO editing is unavailable: js/content/seo.js did not load into the editor. Reload; if it persists, check admin-app.html still includes it.' })); return wrap; }
    const site = h('fieldset', {}, h('legend', { text: 'Search · whole site' }),
      h('p', { class: 'hint', text: 'What every page falls back to. A page’s own Search & sharing (More, or its Page settings) overrides these.' }));
    site.appendChild(seoFieldsPanel(ArkSEO.SITE_FIELDS.filter((f) => f.group === 'site'), () => state.seoDraft.site, seoEdited));
    const ai = h('fieldset', {}, h('legend', { text: 'AI assistants and crawlers' }));
    ai.appendChild(seoFieldsPanel(ArkSEO.SITE_FIELDS.filter((f) => f.group === 'ai'), () => state.seoDraft.site, seoEdited));
    wrap.append(site, ai);
    return wrap;
  }
  /* ---- SEO (js/content/seo.js) --------------------------------------- */
  /* Same shared-draft pattern as theme/mesh: one object (state.seoDraft), edited here, written by Save. No
     live preview message -- a title/meta tag has no visible effect in the iframe to show early. */
  function seoDirty() { return !window.ArkSEO || JSON.stringify(ArkSEO.sanitize(state.seoDraft)) !== state.seoSaved; }
  async function saveSeoDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveSeo(state.cdirs.content, state.seoDraft);
      } else {
        download('seo-data.js', ArkSEO.serialize(state.seoDraft));
      }
    /* Step 5: re-throws now that saveEverything() is this function's only caller -- see
       saveThemeDraft's matching comment above. */
    } catch (error) { throw error; }   /* saveEverything's summary says what failed, once (docs/ux-audit/cms.md P1-16) */
    state.seoDraft = ArkSEO.sanitize(state.seoDraft);
    state.seoSaved = JSON.stringify(state.seoDraft);
    ArkSEO.define(state.seoDraft);
    if (button) button.disabled = true;
    refreshList();
  }
  /* ONE control per ArkSEO field definition (js/content/seo.js's OVERRIDE_FIELDS/SITE_FIELDS),
     built with the shared ctl*Field builders -- no SEO panel lists a field itself. The merge
     (2026-10-17) rebuilt these panels from a hand-written list and quietly lost schemaType,
     aiSummary, canonical, noindex, lang, org, handle, llms and the per-bot crawler policy:
     they stayed in seo-data.js with no control. Deriving the rows from the same list
     sanitize() walks makes that loss unrepresentable (regression: tests/seo-fields.cjs).
     The control comes from the field's kind; the shown value is what ArkSEO.cleanField()
     would store, except free text, which shows exactly what was typed. */
  const SEO_TEXT_KINDS = { text: 'text', url: 'text', origin: 'text', pattern: 'text', longtext: 'textarea' };
  function seoFieldRows(fields, target, onEdited) {
    /* `target` may be a function returning the draft object: Save replaces seoDraft with its
       sanitized copy, and a panel still on screen must write into the new one, not the old. */
    var draft = function () { return typeof target === 'function' ? target() : target; };
    var rows = [];
    fields.forEach(function (f) {
      var ctx = { get: function (key) { return SEO_TEXT_KINDS[f.kind] && typeof draft()[key] === 'string' ? draft()[key] : ArkSEO.cleanField(f, draft()[key]); },
                  set: function (key, value) { draft()[key] = value; onEdited(f); } };
      if (f.kind === 'policy') {
        /* the bot policy is one stored field (a map) but one decision per crawler */
        rows.push(h('p', { class: 'hint', text: 'Answer bots fetch a page for a person asking now; training bots collect it for a model. Blocking one adds it to robots.txt.' }));
        ArkSEO.AI_BOTS.forEach(function (bot) {
          var name = bot[0];
          var botCtx = { get: function () { return ArkSEO.cleanField(f, draft()[f.key])[name] === 'block' ? 'block' : 'allow'; },
                         set: function (_key, value) { var next = Object.assign({}, ArkSEO.cleanField(f, draft()[f.key])); if (value === 'block') next[name] = 'block'; else delete next[name]; draft()[f.key] = next; onEdited(f); } };
          var row = ctlSegField(botCtx, name, name, ArkSEO.BOT_POLICIES);
          row.classList.add('seo-bot'); row.dataset.seoField = f.key; row.dataset.seoBot = name;
          row.title = bot[2] + (bot[1] ? ' (training)' : ' (answers)');
          rows.push(row);
        });
        return;
      }
      var row;
      if (f.kind === 'enum') row = ctlSelectField(ctx, f.label, f.key, (f.fallback ? [] : ['']).concat(f.options), function (o) { return o === '' ? (f.blankLabel || 'None') : o; });
      else if (f.kind === 'flag') row = ctlSegField(ctx, f.label, f.key, [false, true], function (v) { return v ? 'Yes' : 'No'; });
      else if (f.kind === 'onoff') row = ctlSegField(ctx, f.label, f.key, [1, 0], function (v) { return v ? 'Publish' : 'Off'; });
      else row = ctlField(ctx, f.label, f.key, { type: SEO_TEXT_KINDS[f.kind] || 'text', placeholder: f.placeholder, spellcheck: f.kind === 'text' || f.kind === 'longtext', name: 'seo-' + f.key });
      row.dataset.seoField = f.key;
      rows.push(row);
      /* A value that cleans to something else is not stored as typed -- say what it needed
         instead of letting the fallback land silently. */
      var raw = draft()[f.key];
      if (f.needs && typeof raw === 'string' && raw.trim() && ArkSEO.cleanField(f, raw) !== raw.trim().replace(/\/+$/, '')) {
        rows.push(h('p', { class: 'hint seo-refusal', text: 'Not used: ' + f.label.toLowerCase() + ' needs ' + f.needs + '. Until then ' + (ArkSEO.cleanField(f, raw) ? '"' + ArkSEO.cleanField(f, raw) + '"' : 'nothing') + ' is stored.' }));
      }
    });
    return rows;
  }
  /* A self-repainting box of seoFieldRows: segmented/select controls only show their new
     state after a repaint; free-text fields keep the caret (they commit on 'change'). */
  /* The address search engines treat as the page's own and its structured-data type are a
     developer's settings: they wait under "Advanced" (docs/ux-audit/cms.md P1-2), still one click
     away, still derived from the same field list. */
  function seoFieldsPanel(fields, target, onEdited) {
    var SEO_ADVANCED = ['canonical', 'schemaType'];
    var box = h('div', { class: 'seo-controls' }), advancedOpen = false;
    function paint() {
      box.textContent = '';
      var main = fields.filter(function (f) { return SEO_ADVANCED.indexOf(f.key) < 0; }), adv = fields.filter(function (f) { return SEO_ADVANCED.indexOf(f.key) >= 0; });
      var edited = function (f) { onEdited(f); if (!SEO_TEXT_KINDS[f.kind] || f.needs) paint(); };
      seoFieldRows(main, target, edited).forEach(function (row) { box.appendChild(row); });
      if (adv.length) {
        var advBox = h('div', { class: 'seo-controls' });
        seoFieldRows(adv, target, edited).forEach(function (row) { advBox.appendChild(row); });
        box.appendChild(arkDisclosure({ label: 'Advanced', content: advBox, className: 'dev-details', defaultOpen: advancedOpen, onToggle: function (open) { advancedOpen = open; } }));
      }
    }
    paint();
    return box;
  }
  /* The per-route override entry a page/article's SEO is stored under, created on first edit. */
  function seoOverrideTarget(map, id) {
    var entries = state.seoDraft[map] || (state.seoDraft[map] = {});
    return entries[id] || (entries[id] = {});
  }

  /* Content mode: a page's own SEO tab. Every per-page field, from the same definitions
     the Design-mode SEO tab uses. */
  function buildPageSeoPanel(pageId, label) {
    var box = h('fieldset', {}, h('legend', { text: 'SEO' }));
    if (!window.ArkSEO) { box.appendChild(h('p', { class: 'empty-state', text: 'SEO editing is unavailable on this page: js/content/seo.js did not load. Reload the editor; if it persists, check that admin-app.html still includes it.' })); return box; }
    box.appendChild(h('p', { class: 'hint', text: 'These values belong to this page (' + ArkSEO.pageTitle(pageId, label) + '). Blank title and description derive from the page text and site defaults. Site-wide settings (base URL, language, AI crawlers) are in Site style \u2192 Search defaults.' }));
    box.appendChild(seoFieldsPanel(ArkSEO.OVERRIDE_FIELDS, function () { return seoOverrideTarget('pages', pageId); }, function () { touch(); refreshList(); }));
    return box;
  }
  A.provide({ buildPageSeoPanel: buildPageSeoPanel, buildSiteSeoPanel: buildSiteSeoPanel,
      openPageSeo: openPageSeo, openSiteSeo: openSiteSeo, saveSeoDraft: saveSeoDraft, seoDirty: seoDirty });
})();
