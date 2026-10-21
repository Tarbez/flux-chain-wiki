/* =====================================================================
   BOOT
   ---------------------------------------------------------------------
   The only file that does anything when it loads; every other script
   just defines. Applies the tokens, renders the pattern, and tells the
   page it is live so the semantic fallback can step aside.

   If rendering throws, the fallback stays visible: the page degrades to
   readable text instead of a blank poster.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var host = document.getElementById('scene');
  if (!host) return;
  // The router owns per-page reading positions. Native fragment restoration can
  // run after the first paint and clip a newly entered page's heading.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* A fixed, full-viewport layer behind everything else, for an optional admin-picked
     background style (js/ark/vendor/backgrounds.js -- @deadark/ark-ui's generators, see
     scripts/build-ark-vendor.cjs). Created once; style 'none' just leaves it empty,
     which is the site's original flat-canvas look, so this never runs when unused. */
  var backgroundHost = null, backgroundHandle = null;
  function backgroundElement() {
    if (backgroundHost) return backgroundHost;
    backgroundHost = document.createElement('div');
    backgroundHost.id = 'ark-background';
    backgroundHost.setAttribute('aria-hidden', 'true');
    backgroundHost.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
    document.body.insertBefore(backgroundHost, document.body.firstChild);
    return backgroundHost;
  }
  /* Exactly one background shows at a time: an admin-picked ArkBackgrounds
     style, when set, replaces the site's own flat .hero-atmosphere layer
     instead of stacking on top of it and the lattice grid. */
  function applyBackground(background) {
    if (!window.ArkBackgrounds || !background) return;
    var style = background.style;
    if (backgroundHandle) { backgroundHandle.destroy(); backgroundHandle = null; }
    if (!style || style === 'none' || !ArkBackgrounds[style]) {
      if (backgroundHost) backgroundHost.replaceChildren();
      root.classList.remove('has-ark-background');
      return;
    }
    backgroundHandle = ArkBackgrounds[style].mount(backgroundElement());
    root.classList.add('has-ark-background');
  }

  try {
    ArkUI.base(Tokens.css());
    /* A later :root rule wins by source order, so this never touches tokens.js or the
       atomizer: it just appends the saved colour overrides (js/content/theme.js), if any. */
    var theme = window.ArkTheme ? (ArkTheme.get() || ArkTheme.defaults()) : null;
    if (theme) {
      /* No data-theme here. theme.activeTheme is the Theme panel's "Editing theme" -- which
         theme's colours the editor is changing -- not the visitor's palette; that is decided by
         ONE owner, js/settings/panel.js (the visitor's choice, else the "Theme & defaults" site
         default). This line used to set data-theme from activeTheme for a visitor with no choice,
         so a new visitor's palette went activeTheme -> site default during boot (regression:
         tests/browser/theme-owner.mjs). The editor's preview messages below still show the
         theme being edited -- that is the editor's view, not the public page's. */
      ArkUI.base(ArkTheme.css());
      /* Never mount a saved ArkBackgrounds preset on the public site: it read
         as an unwanted soft atmospheric glow. The grid (css/lattice.css) is
         the one background. */
    }
    /* Editor preview only: which copy keys code reads BY NAME (ArkCopy.text) while it renders --
       the Content lens's evidence for which of two fields with the same words a piece of text
       shows (cmsPickBinding). The public page never wraps it. */
    if (/[?&](cms-)?preview(=|&|$)/.test(location.search) && window.ArkCopy && ArkCopy.text) {
      var arkCopyText = ArkCopy.text;
      ArkCopy.text = function (key) { (cmsCopyRead || (cmsCopyRead = Object.create(null)))[key] = true; return arkCopyText(key); };
    }
    var scene = ArkUI.render(F_SCENE_RZERO_V0, host);
    ArkUI.pageRouter = ArkUI.createPageRouter({ scene: scene, state: ArkUI.sceneState });
    /* Reusable content blocks (js/content/components.js) fill every [data-ark-insert]
       anchor a page module declares, on every mount -- one central call here instead of
       a repeated ArkComponents.render(...) line in each of the ~30 page modules, the same
       "centralize, don't duplicate" reasoning ArkLayout.apply below already follows for
       responsive positioning. Registered first so a freshly inserted block already has its
       data-ark-layout-key by the time ArkLayout's own (rAF-deferred) pass below runs. */
    if (window.ArkComponents) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
      ArkComponents.renderAll(host, entry && entry.path || ArkUI.route.path());
    });
    /* Saved alt text for plain images (ArkLayout.alts), applied synchronously -- unlike the
       rAF layout pass below -- so it is already in the DOM when the router fires
       ark:route-ready, which is when the server render (api/lib/render-core.mjs) serializes. */
    if (window.ArkLayout && ArkLayout.applyAlts) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
      ArkLayout.applyAlts(host, entry && entry.path || ArkUI.route.path());
    });
    if (window.ArkLayout) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      requestAnimationFrame(function () {
        var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
        ArkLayout.apply(host, entry && entry.path || ArkUI.route.path(), window.innerWidth);
      });
    });
    /* Layered states (Part E): a real, end-user-facing behavior, not a Studio-only
       convenience, so it is wired the same way ArkComponents is above -- a sibling
       ArkUI.pageRouter.onMount callback, unconditional, never gated behind the
       cmsPreview-only checks further down this file. Registered AFTER ArkLayout's own
       onMount (both above) and deferred through its own requestAnimationFrame: rAF
       callbacks queued in the same tick run in queue order, so this always runs right
       after ArkLayout.apply() has finished its reset-then-reapply pass for the new
       page -- running before it, a member with a stored display override would have its
       state-0 display:none overwritten when ArkLayout re-applies that frame. (resetElement()
       itself now undoes only what ArkLayout wrote; it used to blank every element's inline
       styles, the continuity host's geometry included -- see js/content/layout.js.) */
    if (window.ArkStates) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      requestAnimationFrame(function () {
        var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
        var statesRoute = entry && entry.path || ArkUI.route.path();
        ArkStates.renderAll(host, statesRoute, cmsStatesView(statesRoute), cmsComponentsDraft);
      });
    });
    /* The mount-time passes above run against the DOM as it is one frame after mount: the page
       it replaces may still be leaving, and a page module may still be building (/stats replaces
       its loading sections right after mount -- 29 of its keys named different elements at
       ArkLayout.apply() time than once settled, measured 2026-10-18 by tests/browser/
       layout-key-stability.mjs). Once the router has landed, the same passes run again on the
       final DOM. Each is idempotent: ArkLayout undoes only what it wrote before re-applying,
       ArkComponents re-renders an anchor's instance list, ArkStates re-shows the same state. */
    ArkUI.pageRouter.onSettle(function (_pageElement, page) {
      var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page], route = entry && entry.path || ArkUI.route.path();
      if (window.ArkComponents) ArkComponents.renderAll(host, route, cmsComponentsDraft);
      if (window.ArkLayout) ArkLayout.apply(host, route, window.innerWidth, cmsLayoutDraft);
      if (window.ArkStates) ArkStates.renderAll(host, route, cmsStatesView(route), cmsComponentsDraft);
    });
    root.classList.add('ark-live');
    /* The fallback is visually clipped once the scene is up. aria-hidden alone left its links
       focusable: Tab landed on invisible "Read the source / What is a resolver?" links on every
       route (docs/ux-audit/pages-ux-a.md cross-page 7). inert takes them out of the tab order
       too (regression: tests/a11y-chrome.cjs, tests/browser/site-fixes.mjs). */
    var fallback = document.getElementById('fallback');
    if (fallback) { fallback.setAttribute('aria-hidden', 'true'); fallback.inert = true; }
  } catch (err) {
    root.classList.remove('js');                  /* reveal the fallback */
    if (window.console) console.error('[ark] scene failed to render', err);
  }

  /* The admin preview iframe posts an unsaved theme edit here so it shows its effect
     before Save writes anything -- same origin only (preview and admin are always the
     same host). Appending another colour override sheet keeps that half additive and
     reversible: each edit just wins over the last by source order, same as the saved
     one above. The background style is swapped outright, since only one can show. */
  var cmsPreviewQuery = new URLSearchParams(location.search).has('preview') || new URLSearchParams(location.search).has('cms-preview');
  var cmsPreviewEdit = true, cmsPreviewSelected = null, cmsPreviewSelections = [], cmsLayoutDraft = window.ArkLayout ? ArkLayout.get() : { version: 2, routes: {}, groups: {} };
  var cmsComponentsDraft = window.ArkComponents ? ArkComponents.get() : { version: 1, masters: {}, routes: {} };
  /* Layered states (Part E): seeded from the baked states-data.js, exactly like
     cmsLayoutDraft/cmsComponentsDraft above. A visitor's click never changes it: it moves
     cmsStatesShowing (below), in memory only -- there is no write-back channel on this
     static site, and the two hand-coded precedents this generalizes (home.js's case-picker,
     about.js's layer tabs) both reset on reload the same way. Studio's own edits flow
     through the normal draft-replace pipeline below (cmsStatesCommand), the same as
     cmsComponentsDraft. */
  var cmsStatesDraft = window.ArkStates ? ArkStates.get() : { version: 1, routes: {} };
  /* Which state each group is SHOWING right now, keyed route + '\n' + groupId -- transient,
     never saved, never relayed as part of the draft. The draft's own `current` is the
     group's DEFAULT state: what a visitor sees first, and the only thing Save writes.
     Before this split, previewing state 2 from the toolbar (or clicking through states in
     Live mode) wrote current=2 into the very draft Save persists, so whatever the editor
     happened to be showing became the public default (regression:
     tests/cms-states-preview-default.cjs). A visitor's click advances this too, so the
     public site still cycles exactly as before. */
  var cmsStatesShowing = {};
  /* a group id is unique across every scope, so what a group shows is keyed by its id alone */
  function cmsStatesShowKey(_route, groupId) { return groupId; }
  /* the draft as it should be DRAWN: every group's current replaced by what it is showing */
  function cmsStatesView(route) {
    var view = window.ArkStates ? ArkStates.sanitize(cmsStatesDraft) : { version: 1, routes: {} };
    if (!window.ArkStates) return view;
    ArkStates.groupIdsOn(view, route).forEach(function (groupId) {
      var group = ArkStates.groupFor(view, route, groupId), at = cmsStatesShowing[cmsStatesShowKey(route, groupId)];
      /* groupFor() returns a copy: write through the scope that holds it */
      var scope = ArkStates.groupScope(view, route, groupId);
      if (typeof at === 'number' && at >= 0 && at < group.states.length) view.routes[scope][groupId].current = at;
    });
    return view;
  }
  /* { groupId: showing index } for one route, for the editor's "Showing" label */
  function cmsStatesShowingFor(route) {
    var view = cmsStatesView(route), out = {};
    if (window.ArkStates) ArkStates.groupIdsOn(view, route).forEach(function (groupId) { out[groupId] = ArkStates.groupFor(view, route, groupId).current; });
    return out;
  }
  /* Canvas-only mode (Part G, follow-up plan): the site-wide background in/out
     transition, seeded from the baked canvas-transitions-data.js exactly like
     cmsStatesDraft/cmsComponentsDraft above. Unlike those, this never drives any
     DOM content here -- it only governs the one persistent-layer opacity transition
     js/ark/page-router.js's navigate() already applies on every real navigation --
     so it is read, not rendered, by anything in this file; Studio's own edits (field
     commands) and its one-shot "Preview this transition" round trip both flow
     through cmsCanvasTransitionsCommand below. */
  var cmsCanvasTransitionsDraft = window.ArkCanvasTransitions ? ArkCanvasTransitions.get() : { version: 1, effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' };
  /* Animation-only mode (Part H, follow-up plan): per-element in/out stagger overrides,
     seeded from the baked element-motion-data.js exactly like cmsCanvasTransitionsDraft
     above. Unlike that single site-wide object, this is addressed per route+key the
     same way cmsLayoutDraft already is -- ArkUI.createPresence (js/ark/scene-state.js)
     reads the SAVED module state directly (window.ArkElementMotion.get()), never this
     unsaved draft, so a field edit here has no visible effect until either "Preview"
     (a one-shot animation built from this exact draft) or a real Save. */
  var cmsElementMotionDraft = window.ArkElementMotion ? ArkElementMotion.get() : { version: 1, routes: {} };
  var cmsLayoutFrame = null, cmsLayoutAction = null, cmsLayoutBox = null, cmsLayoutLabel = null, cmsLayoutHandles = [], cmsMultiBoxes = [], cmsContextMenu = null, cmsContextTarget = null;
  /* Undo/redo for every layout/style edit (frame, spacing, typography, fill, effects,
     group, ungroup, align, distribute). These never went through the admin page's own
     dense-node undo stack -- they post straight to this iframe -- so Studio's Ctrl+Z did
     nothing for any of them. cmsLayoutDraft is the one place all of those operations already
     converge, so a snapshot stack here covers every operation type uniformly instead of
     reimplementing an inverse for each one. */
  var cmsLayoutUndo = [], cmsLayoutRedo = [];
  function previewCopyText(value) { return String(value == null ? '' : value).replace(/\s+/g, '').trim(); }
  /* Page modules sometimes shape one manifest value into several spans instead of
     using ArkRuntime's copy resolver. In preview only, bind those exact rendered
     strings back to their source field as well. This keeps the production markup
     untouched while making hand-authored hero/card DOM click-to-edit. */
  function annotateCmsPreviewCopy(manifests) {
    if (!cmsPreviewQuery || !host || !Array.isArray(manifests)) return;
    var byText = new Map();
    manifests.forEach(function (manifest) {
      Object.keys((manifest && manifest.fields) || {}).forEach(function (role) {
        var value = previewCopyText(manifest.fields[role] && manifest.fields[role].value);
        if (!value || value.length < 2) return;
        var list = byText.get(value) || [];
        list.push(String(manifest.id).toLowerCase() + '.' + role); byText.set(value, list);
      });
    });
    host.querySelectorAll('h1,h2,h3,h4,p,a,button,label,li,dt,dd,strong,span,small').forEach(function (element) {
      var keys = byText.get(previewCopyText(element.textContent));
      if (!keys) return;
      var current = String(element.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean);
      /* Editor-only: the public page never binds text this way, so a layout key taken from it
         (copy:...) would name nothing there -- every edit saved on such an element was lost on
         the public page. ArkLayout ignores copy keys an element has only from here. */
      if (!current.length) element.setAttribute('data-ark-copy-preview', '');
      element.setAttribute('data-ark-copy-keys', Array.from(new Set(current.concat(keys))).join(' '));
    });
  }
  /* =====================================================================
     CONTENT LENS -- edit the site's text in place (preview side)
     ---------------------------------------------------------------------
     The editor's lens ('content' | 'design', message 'defxn-cms-preview-lens') decides what a
     click on the canvas does. Design: select and style (everything below this block). Content:
     the clicked text, when it is the value of exactly one source field, becomes editable where
     it stands, and every keystroke posts 'defxn-cms-preview-copy-edit' { route, key, field,
     value, final } to the editor, which writes the draft through the same setter its forms use.

     Which field a piece of text is bound to is DERIVED, never listed: an element is bound to a
     field when its rendered text equals that field's value (whitespace ignored, the same rule
     annotateCmsPreviewCopy above uses), searched over every source the preview holds --
       - inside a component instance (a block, or a state >= 1): that instance's props
         (definition + overrides), edited as the instance's override (cmsComponentsCommand);
       - a manifest field (ArkManifest: pages and Site chrome), addressed by its copy key
         AREA.ROLE (HOME.TITLE, NAV.HOW);
       - an article field (LearningContent), addressed article:<slug>/<path> where <path> is
         the field's place in the article's own shape (title, summary, sections.0.1, questions.2).
     Several equal values are narrowed by structure: a runtime copy key on the element itself
     (js/ark/runtime.js wrote it from the pattern, so it is authoritative), then the source
     that owns where the element sits (Site chrome for the shell, the page's own manifest or
     article for page content). Still more than one is refused, naming every candidate.
     Text no field holds is refused with the code that writes it (cmsTextSource): a refusal
     names what it needs. Regression: tests/cms-content-lens.cjs (derivation) and
     tests/browser/inline-content.mjs (the round trip to the public page). */
  var cmsPreviewLens = 'design', cmsInline = null, cmsHoverBox = null, cmsHoverFrame = 0;
  /* copy keys code read by name (ArkCopy.text, wrapped at boot in the preview); declared with var,
     so the wrapper at the top of this file can write it before this line runs */
  var cmsCopyRead = cmsCopyRead || Object.create(null);
  /* what js/main.js renders the persistent shell from (the ArkUI.render call at the top) */
  var CMS_SHELL_SOURCE = 'the site shell: the pattern F_SCENE_RZERO_V0 (js/scene.flux.js) and the resolvers it renders (js/resolvers/)';
  var CMS_LINK_VALUE = /^(route|doc|url):\S+/;
  var CMS_PARAGRAPH_TAGS = /^(p|blockquote|li|dd|figcaption|pre)$/;
  /* every [path, value] string an article holds, from its own shape: strings, arrays of strings
     (questions.i) and arrays of arrays of strings (sections.i.j); link values are targets, not text */
  function cmsArticleStrings(article) {
    var out = [];
    Object.keys(article || {}).forEach(function (prop) {
      var value = article[prop];
      if (prop === 'slug') return;
      if (typeof value === 'string') { if (!CMS_LINK_VALUE.test(value)) out.push([prop, value]); return; }
      if (!Array.isArray(value)) return;
      value.forEach(function (item, i) {
        if (typeof item === 'string') out.push([prop + '.' + i, item]);
        else if (Array.isArray(item)) item.forEach(function (part, j) { if (typeof part === 'string') out.push([prop + '.' + i + '.' + j, part]); });
      });
    });
    return out;
  }
  function cmsArticleFieldLabel(path) {
    var parts = path.split('.');
    if (parts[0] === 'sections') return 'Section ' + (Number(parts[1]) + 1) + (parts[2] === '0' ? ' heading' : ', paragraph ' + parts[2]);
    if (parts[0] === 'questions') return 'Question ' + (Number(parts[1]) + 1);
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/([A-Z])/g, ' $1').toLowerCase();
  }
  function cmsArticleRoute(slug) {
    var entry = ArkUI.pageCatalog && ArkUI.pageCatalog['article/' + slug];
    return entry ? entry.path : '/learnings/' + slug;
  }
  /* every field whose value is exactly this element's text */
  function cmsCopyCandidates(element) {
    var text = previewCopyText(element && element.textContent);
    if (!text || text.length < 2) return [];
    var out = [], comp = cmsComponentRootOf(element);
    if (comp) {
      var anchorId = comp.getAttribute('data-ark-component-anchor'), instanceKey = comp.getAttribute('data-ark-component-key');
      var instance = window.ArkComponents ? ArkComponents.instancesAt(cmsComponentsDraft, cmsRoutePath(), anchorId).filter(function (item) { return item.key === instanceKey; })[0] : null;
      var master = instance && cmsComponentsDraft.masters && cmsComponentsDraft.masters[instance.masterId];
      if (!master) return out;
      var props = Object.assign({}, master.props, instance.overrides);
      Object.keys(props).forEach(function (prop) {
        if (typeof props[prop] !== 'string' || previewCopyText(props[prop]) !== text) return;
        out.push({ kind: 'component', id: anchorId + '/' + instanceKey, field: prop, address: 'component:' + anchorId + '/' + instanceKey + '/' + prop,
          label: (master.label || instance.masterId) + ': ' + prop, value: props[prop], anchorId: anchorId, instanceKey: instanceKey,
          override: Object.prototype.hasOwnProperty.call(instance.overrides || {}, prop) ? instance.overrides[prop] : null,
          file: 'js/content/components-data.js' });
      });
      return out;   /* an instance's text comes from the instance, never from a page field that happens to read the same */
    }
    var runtimeKeys = element.hasAttribute('data-ark-copy-preview') ? [] : String(element.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean);
    (cmsCopyIndex().get(text) || []).forEach(function (c) { out.push(Object.assign({ runtime: runtimeKeys.indexOf(c.address) >= 0 }, c)); });
    return out;
  }
  /* every manifest and article field by its normalized words, built once per site the editor
     sends (cmsOnMessage marks it stale) -- the hover affordance asks on every pointer frame */
  var cmsCopyIndexCache = null;
  function cmsCopyIndex() {
    if (cmsCopyIndexCache) return cmsCopyIndexCache;
    var index = new Map();
    function add(text, c) { if (!text || text.length < 2) return; var list = index.get(text) || []; list.push(c); index.set(text, list); }
    if (window.ArkManifest) ArkManifest.all().forEach(function (manifest) {
      Object.keys(manifest.fields || {}).forEach(function (role) {
        var field = manifest.fields[role];
        if (!field || field.kind === 'link') return;
        add(previewCopyText(field.value), { kind: 'page', id: manifest.id, field: role, address: manifest.id.toUpperCase() + '.' + role, label: field.label, value: field.value, fieldKind: field.kind,
          owner: manifest.group === 'site' ? 'shell' : manifest.route, file: 'js/content/manifests/' + manifest.id + '.js' });
      });
    });
    if (window.LearningContent) LearningContent.articles.forEach(function (article) {
      cmsArticleStrings(article).forEach(function (pair) {
        add(previewCopyText(pair[1]), { kind: 'article', id: article.slug, field: pair[0], address: 'article:' + article.slug + '/' + pair[0], label: (article.title || article.slug) + ': ' + cmsArticleFieldLabel(pair[0]),
          value: pair[1], owner: cmsArticleRoute(article.slug), file: 'js/content/articles/' + article.slug + '.js' });
      });
    });
    return (cmsCopyIndexCache = index);
  }
  /* one binding, or none and the candidates that made it ambiguous */
  function cmsPickBinding(element, list) {
    var runtime = list.some(function (c) { return c.runtime; });
    if (list.length > 1 && runtime) list = list.filter(function (c) { return c.runtime; });
    if (list.length > 1) {
      var owner = window.ArkLayout && ArkLayout.SHELL && cmsScopeOf(element) === ArkLayout.SHELL ? 'shell' : cmsRoutePath();
      var here = list.filter(function (c) { return c.owner === owner; });
      if (here.length) list = here;
    }
    /* text with no runtime key was written by code: of two equal fields, the one code read by name
       (the header's links read NAV.OVERVIEW; the equal NAV.ABOUT is the pattern's, on another element) */
    if (list.length > 1 && !runtime) {
      var read = list.filter(function (c) { return cmsCopyRead[c.address]; });
      if (read.length) list = read;
    }
    return list.length === 1 ? { binding: list[0], among: list } : { binding: null, among: list };
  }
  /* the code that writes this element, for a refusal: a component, the shell, or a page module */
  function cmsTextSource(element) {
    var comp = cmsComponentRootOf(element);
    if (comp) {
      var master = cmsComponentsDraft.masters && cmsComponentsDraft.masters[comp.getAttribute('data-ark-component-master')];
      return 'the component "' + (master ? master.label : comp.getAttribute('data-ark-component-master')) + '" (js/content/components-data.js)';
    }
    if (window.ArkLayout && ArkLayout.SHELL && cmsScopeOf(element) === ArkLayout.SHELL) return CMS_SHELL_SOURCE;
    var page = element.closest && element.closest('[data-ark-page]'), id = page && page.getAttribute('data-ark-page');
    var entry = id && ArkUI.pageCatalog && ArkUI.pageCatalog[id];
    if (!entry) return 'the page shown at ' + cmsRoutePath();
    var file = (entry.scripts || []).filter(function (src) { return /^js\/pages\//.test(src); }).pop();
    return 'the page module "' + (entry.module || id) + '"' + (file ? ' (' + file + ')' : '');
  }
  function cmsSameHref(a, b) {
    try { return new URL(a, location.href).href === new URL(b, location.href).href; } catch (e) { return a === b; }
  }
  /* A link's TARGET is a separate 'link' field in the same source: the one whose resolved href is
     this link's href; two of them, the one sharing the label's prefix (CLOSING.LABEL -> CLOSING.HREF). */
  function cmsLinkInfo(link, binding) {
    var href = link.getAttribute('href') || '', resolve = ArkUI.dash && ArkUI.dash.resolveLinkField;
    var hits = [];
    if (resolve && binding.kind === 'page' && window.ArkManifest && ArkManifest.get(binding.id)) {
      var manifest = ArkManifest.get(binding.id);
      Object.keys(manifest.fields).forEach(function (role) {
        var field = manifest.fields[role];
        if (field.kind !== 'link') return;
        var r = null; try { r = resolve(field.value, cmsRoutePath()); } catch (e) { r = null; }
        if (r && r.href && cmsSameHref(r.href, href)) hits.push({ field: manifest.id.toUpperCase() + '.' + role, fieldKey: role, label: field.label, value: field.value });
      });
    } else if (resolve && binding.kind === 'article' && window.LearningContent) {
      var article = LearningContent.find(binding.id) || {};
      Object.keys(article).forEach(function (prop) {
        if (typeof article[prop] !== 'string' || !CMS_LINK_VALUE.test(article[prop])) return;
        var r = null; try { r = resolve(article[prop], cmsRoutePath()); } catch (e) { r = null; }
        if (r && r.href && cmsSameHref(r.href, href)) hits.push({ field: 'article:' + binding.id + '/' + prop, fieldKey: prop, label: cmsArticleFieldLabel(prop), value: article[prop] });
      });
    }
    if (hits.length > 1) {
      var prefix = String(binding.field).replace(/\.[^.]*$/, '');
      var same = hits.filter(function (hit) { return hit.fieldKey.replace(/\.[^.]*$/, '') === prefix; });
      if (same.length) hits = same;
    }
    if (hits.length === 1) return Object.assign({ href: href }, hits[0]);
    /* Plain words first, as cmsContentInfo's refusals (docs/ux-audit/cms.md P1-2: the pattern name and the
       route:/doc: grammar reached the person here); the field addresses and the source are `detail`. */
    if (hits.length) return { href: href, refusal: 'Where this link goes is set by ' + hits.length + ' link fields at once, so a change here could not say which one it means.',
      remedy: 'Change the one you mean in Page settings (All fields).',
      detail: 'Opens ' + href + '. Link fields with this target: ' + hits.map(function (hit) { return hit.field; }).join(', ') + '.' };
    return { href: href, refusal: 'Where this link goes is written in the site template; no link field holds it, so it cannot be changed here.',
      remedy: 'A developer can make it editable: see Developer details.',
      detail: 'Opens ' + href + ', written by ' + cmsTextSource(link) + '. To edit it here, move it into a link field (route:<page>, doc:<path> or url:<address>) of the page\'s manifest.' };
  }
  /* What the Content lens knows about an element: its binding, or why it has none. Reported to
     the editor with every selection (`content`) for the toolbar's Content section. */
  function cmsContentInfo(element) {
    if (!element || element.nodeType !== 1) return null;
    var key = element.getAttribute('data-ark-layout-key') || '', tag = element.tagName.toLowerCase();
    var pick = cmsPickBinding(element, cmsCopyCandidates(element)), b = pick.binding;
    if (b) {
      var multiline = b.kind === 'page' ? b.fieldKind === 'text' : (/\n/.test(b.value) || CMS_PARAGRAPH_TAGS.test(tag));
      var info = { key: key, bound: true, kind: b.kind, id: b.id, field: b.address, fieldKey: b.field, label: b.label, value: b.value, file: b.file,
        multiline: multiline, enterBreaks: cmsEnterBreaks(element, multiline, b.value) };
      if (b.kind === 'component') { info.anchorId = b.anchorId; info.instanceKey = b.instanceKey; info.override = b.override; }
      var link = element.closest('a');
      if (link && host.contains(link)) info.link = cmsLinkInfo(link, b);
      return info;
    }
    var text = String(element.textContent || '').trim(), own = Array.prototype.filter.call(element.children || [], function (child) { return String(child.textContent || '').trim(); });
    var source = cmsTextSource(element), refusal = { key: key, bound: false, source: source };
    /* Said in plain words (docs/ux-audit/cms.md P1-2: "F_SCENE_RZERO_V0 (js/scene.flux.js) ...
       route:<page>, doc:<path>" reached the person); what a developer needs -- the field addresses,
       the file that writes the words, how to make them editable -- is `detail`, the editor's
       Developer details. Every refusal still names what failed, what is missing and the remedy. */
    if (pick.among.length > 1) {
      refusal.reason = 'These words are used by ' + pick.among.length + ' fields at once, so a change here could not say which one it means.';
      refusal.remedy = 'Change the one you mean in Page settings (All fields).';
      refusal.detail = 'Fields with these words: ' + pick.among.map(function (c) { return c.address; }).join(', ') + '.';
    } else if (!text) {
      refusal.reason = 'This ' + tag + ' has no words of its own.';
      refusal.remedy = 'Click a heading, paragraph, link or label to change its words; switch to Edit style to change how this looks.';
    } else if (own.length > 1) {
      refusal.reason = 'This ' + tag + ' holds ' + own.length + ' separate pieces of text.';
      refusal.remedy = 'Click the piece of text you want to change.';
    } else if (cmsComponentRootOf(element)) {
      refusal.reason = 'These words are part of a block\'s design, not one of its fields.';
      refusal.remedy = 'Change them in the block\'s definition (Component instance, then Edit definition).';
      refusal.detail = 'Not one of the fields of ' + source + ': it is part of the block\'s markup.';
    } else {
      refusal.reason = 'These words come from the site template, so they cannot be changed here.';
      refusal.remedy = 'A developer can make them editable: see Developer details.';
      refusal.detail = 'Not read from any field: written by ' + source + '. To edit it here, give it a field in the page\'s manifest (js/content/manifests/) and have the code read it with ArkCopy.text(\'AREA.ROLE\').';
    }
    return refusal;
  }
  /* The element a content-lens click means: the innermost layout-keyed element under the
     pointer whose text binds, climbing while nothing binds; else the innermost one (to explain). */
  function cmsContentPick(target) {
    var first = null;
    for (var node = target && target.nodeType === 1 ? target : target && target.parentElement; node && node !== host && node.nodeType === 1; node = node.parentElement) {
      if (node.closest('[data-ark-studio-ui]')) return null;
      if (!node.hasAttribute('data-ark-layout-key') || node.hasAttribute('data-ark-layout-group')) continue;
      if (String(node.textContent || '').length > 4000) break;
      var info = cmsContentInfo(node);
      if (!first) first = { element: node, info: info };
      if (info.bound) return { element: node, info: info };
    }
    return first;
  }
  /* the element's words as the field stores them: text as written, a <br> or a child laid out as
     its own line (a block: the home heading draws each line of its value as a block span; a <div>
     the browser inserts on Enter) as a line break -- decided by layout, not by tag; never
     innerText, which applies text-transform */
  function cmsEditableText(element) {
    var out = '', after = false;   /* after: a block just ended, so what follows starts a line */
    function lineBreak() { if (out && !/\n$/.test(out)) out += '\n'; after = false; }
    (function walk(node) {
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) { if (after && !child.data.trim()) return; if (after) lineBreak(); out += child.data; }
        else if (child.nodeName === 'BR') { out += '\n'; after = false; }
        else if (child.nodeType === 1) {
          var display = getComputedStyle(child).display || '', block = display !== 'contents' && display.indexOf('inline') !== 0;
          if (display === 'none') return;
          if (block || after) lineBreak();
          walk(child);
          if (block) after = true;
        }
      });
    })(element);
    return out;
  }
  function cmsInlineValue(c) {
    var text = cmsEditableText(c.element);
    if (!c.info.multiline) text = text.replace(/\s*\n\s*/g, ' ');
    /* unchanged words keep the field's exact value (its own spacing and line breaks) */
    return previewCopyText(text) === previewCopyText(c.info.value) ? c.info.value : text;
  }
  /* Does Enter start a new line here, or finish the edit? It finishes, unless the field is a
     paragraph whose line breaks the page SHOWS: a paragraph-like element (CMS_PARAGRAPH_TAGS)
     whose value already holds a break or whose white-space keeps one. A heading, a label, a link
     or a paragraph that would collapse the break into a space: Enter is "done". Pressing Enter
     to finish the home heading put a blank line inside it and slid it under the toolbar
     (docs/ux-audit/cms.md P0-2). Shift+Enter still breaks a line wherever the field stores one. */
  function cmsEnterBreaks(element, multiline, value) {
    if (!multiline || !CMS_PARAGRAPH_TAGS.test(element.tagName.toLowerCase())) return false;
    if (/\n/.test(String(value || ''))) return true;
    var ws = ''; try { ws = getComputedStyle(element).whiteSpace || ''; } catch (e) { ws = ''; }
    return /^(pre|pre-wrap|pre-line|break-spaces)$/.test(ws);
  }
  /* stale: a site the editor sent while the words were being typed was held here and is out of
     date (it carries half-typed words), so the editor must send the current one */
  function cmsPostCopyEdit(info, value, final, history, stale) {
    window.parent.postMessage({ type: 'defxn-cms-preview-copy-edit', route: cmsRoutePath(), key: info.key, field: info.field, value: value, final: !!final, history: history || '', stale: !!stale }, location.origin);
  }
  function cmsInlineInput() {
    var c = cmsInline; if (!c) return;
    var value = cmsInlineValue(c);
    if (value === c.last) return;
    c.last = value; c.sent = true;
    placeCmsLayoutUi();   /* the outline follows the text as it grows or wraps */
    /* every keystroke, like a form field's input event: Save pressed right after typing must see it */
    cmsPostCopyEdit(c.info, value, false);
  }
  /* The keys that end an edit KEEP the words. Escape used to put them back with no message and
     no undo -- most people press Escape to mean "done", and their typing was gone
     (docs/ux-audit/cms.md P0-2). Now Escape finishes like a click elsewhere; a committed edit is
     one entry in the canvas's undo history (Ctrl/Cmd+Z, the header's Undo), and the toolbar's
     Content section offers "Revert to saved". Enter finishes too, unless the field is a paragraph
     whose breaks the page shows (cmsEnterBreaks); Ctrl/Cmd+Enter always finishes; Shift+Enter
     breaks a line only in a field that stores breaks. Regression: tests/cms-content-lens.cjs. */
  function cmsFinishInline() {
    var c = cmsInline; if (!c) return;
    cmsEndInline(true);
    try { c.element.blur(); } catch (e) { /* already gone */ }
  }
  function cmsInlineKey(event) {
    var c = cmsInline; if (!c) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cmsFinishInline(); return; }
    if (event.key !== 'Enter') return;
    var finish = event.metaKey || event.ctrlKey || (event.shiftKey ? !c.info.multiline : !c.info.enterBreaks);
    if (finish) { event.preventDefault(); cmsFinishInline(); }
  }
  function cmsInlineBlur() { cmsEndInline(true); }
  function cmsBeginInline(element, info, event) {
    if (cmsInline && cmsInline.element === element) return;
    cmsEndInline(true);
    var c = cmsInline = { element: element, info: info, beforeText: element.textContent, last: info.value, sent: false, pending: null };
    if (!document.querySelector('style[data-ark-inline-style]')) {
      var style = document.createElement('style'); style.setAttribute('data-ark-inline-style', ''); style.setAttribute('data-ark-studio-ui', '');
      style.textContent = '[data-ark-inline-editing]{outline:2px solid #5d8df6!important;outline-offset:3px;cursor:text;caret-color:#5d8df6}';
      document.head.appendChild(style);
    }
    element.setAttribute('data-ark-inline-editing', '');
    try { element.contentEditable = 'plaintext-only'; } catch (e) { /* not supported: below */ }
    if (element.contentEditable !== 'plaintext-only') element.contentEditable = 'true';
    element.spellcheck = true;
    element.addEventListener('input', cmsInlineInput);
    element.addEventListener('keydown', cmsInlineKey);
    element.addEventListener('blur', cmsInlineBlur);
    element.focus({ preventScroll: true });
    /* the caret where the click landed, else at the end */
    var range = null, sel = window.getSelection && window.getSelection();
    if (event && document.caretRangeFromPoint) range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (!range || !element.contains(range.startContainer)) { range = document.createRange(); range.selectNodeContents(element); range.collapse(false); }
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    return c;
  }
  /* commit: the final value (once), an undo entry beside the layout history, then any preview
     state that arrived while typing (it would have rebuilt the element under the caret) */
  function cmsEndInline(commit) {
    var c = cmsInline; if (!c) return;
    cmsInline = null;
    c.element.removeEventListener('input', cmsInlineInput);
    c.element.removeEventListener('keydown', cmsInlineKey);
    c.element.removeEventListener('blur', cmsInlineBlur);
    c.element.removeAttribute('contenteditable'); c.element.removeAttribute('data-ark-inline-editing');
    if (!commit) return;
    var value = cmsInlineValue(c), changed = value !== c.info.value;
    /* A site the editor sent while the words were typed was held (c.pending). It carries
       half-typed words, so it is never applied once anything was typed: the final edit says it
       is stale and the editor sends the current site -- with every other edit made meanwhile (a
       Page fields keystroke) -- re-rendered in place. Untouched words: it is applied as it is. */
    var stale = !!c.pending && (c.sent || changed);
    if (changed) {
      var entry = { kind: c.info.kind, id: c.info.id, key: c.info.key, field: c.info.field, before: c.info.kind === 'component' ? c.info.override : c.info.value, after: value, anchorId: c.info.anchorId, instanceKey: c.info.instanceKey, fieldKey: c.info.fieldKey };
      cmsLayoutUndo.push({ cmsCopy: entry }); if (cmsLayoutUndo.length > 100) cmsLayoutUndo.shift();
      cmsLayoutRedo.length = 0; cmsReportLayoutHistory('push', 'the text edit');
      /* the canvas already shows these words: the editor takes them without re-sending the site
         (no rebuild, no flash). Every other element on the page showing the same field takes them
         now too (cmsSyncCopies, decided against the source as it was), then this document's own
         copy of the source holds them, or the next click would not find the field they came from. */
      if (entry.kind !== 'component') { cmsSyncCopies(entry, c.info.value, value, c.element); cmsAdoptCopyValue(entry, value); }
      cmsApplyCopyEntry(entry, 'after', '', stale);
    } else if (c.sent) cmsPostCopyEdit(c.info, c.info.value, true, '', stale);
    else if (c.pending) cmsOnMessage(c.pending);
  }
  /* Every element on the page bound to the same field as the one just edited -- found the way a
     click finds a binding (same words, cmsContentInfo names the same field), innermost only --
     shows the committed words at once, without a re-render. Returns how many it changed. */
  function cmsSyncCopies(entry, before, after, edited) {
    var text = previewCopyText(before);
    if (!text || !host) return 0;
    var matches = Array.prototype.filter.call(host.querySelectorAll('[data-ark-layout-key]'), function (el) {
      if (el === edited || el.contains(edited) || edited.contains(el) || el.closest('[data-ark-studio-ui]')) return false;
      if (previewCopyText(el.textContent) !== text) return false;
      var info = cmsContentInfo(el);
      return !!info && info.bound && info.field === entry.field;
    });
    matches = matches.filter(function (el) { return !matches.some(function (other) { return other !== el && el.contains(other); }); });
    matches.forEach(function (el) { cmsWriteText(el, after); });
    return matches.length;
  }
  /* the words into an element as the page drew them: one line per block child when it draws its
     lines that way (the home heading), into its one text node when it has other children (an
     icon beside a label), else as its whole text */
  function cmsWriteText(el, value) {
    var kids = Array.prototype.slice.call(el.children || []), lines = String(value).split('\n');
    var texts = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.data.trim(); });
    /* its words are all in its children, one line each */
    if (kids.length && !texts.length && kids.length === lines.length && kids.every(function (k) { return !k.children.length && k.textContent.trim(); })) { kids.forEach(function (k, i) { k.textContent = lines[i]; }); return; }
    if (kids.length && texts.length === 1) { texts[0].data = value; return; }
    el.textContent = value;
  }
  function cmsAdoptCopyValue(entry, value) {
    if (entry.kind === 'page' && window.ArkManifest) {
      var manifest = ArkManifest.get(entry.id);
      if (manifest && manifest.fields[entry.fieldKey]) manifest.fields[entry.fieldKey].value = value;
    } else if (entry.kind === 'article' && window.LearningContent) {
      var article = LearningContent.find(entry.id), path = String(entry.fieldKey).split('.');
      if (!article) return;
      /* the first question written fills the rest from the section headings (setItemField does the same) */
      if (path[0] === 'questions' && !article.questions && article.sections) article.questions = article.sections.map(function (section) { return section[0]; });
      var at = article;
      for (var i = 0; i < path.length - 1 && at; i++) at = at[path[i]];
      if (at) at[path[path.length - 1]] = value;
    }
    cmsCopyIndexCache = null;
  }
  /* one side of an inline edit, re-applied: a component's override inside this preview (its
     draft lives here), any other field through the editor's draft */
  function cmsApplyCopyEntry(entry, side, history, stale) {
    var value = entry[side];
    if (entry.kind === 'component') {
      cmsComponentsCommand({ action: 'set-override', route: cmsRoutePath(), anchorId: entry.anchorId, key: entry.instanceKey, propPath: entry.fieldKey, value: value == null ? null : value });
      if (stale) cmsPostCopyEdit(entry, value == null ? '' : value, true, history || '', true);
    } else cmsPostCopyEdit(entry, value, true, history || '', stale);
  }
  function cmsSetLens(lens) {
    var next = lens === 'content' ? 'content' : 'design';
    if (next === cmsPreviewLens) return;
    cmsEndInline(true); cmsPreviewLens = next; cmsHover(null);
    document.documentElement.setAttribute('data-ark-lens', next);
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  /* the quiet affordance: dashed where a click edits, dotted grey where it explains why not */
  function cmsHover(target) {
    if (!cmsHoverBox) {
      if (!target) return;
      cmsHoverBox = document.createElement('div'); cmsHoverBox.setAttribute('data-ark-studio-ui', ''); cmsHoverBox.className = 'ark-studio-hover';
      cmsHoverBox.style.cssText = 'position:fixed;z-index:2147483644;pointer-events:none;box-sizing:border-box;border-radius:3px';
      document.body.appendChild(cmsHoverBox);
    }
    var picked = target && cmsPreviewLens === 'content' && cmsPreviewEdit && !cmsInline ? cmsContentPick(target) : null;
    if (!picked || cmsPreviewSelections.indexOf(picked.element) >= 0) { cmsHoverBox.hidden = true; return; }
    var r = cmsRectOf(picked.element);
    cmsHoverBox.hidden = false;
    cmsHoverBox.dataset.bound = picked.info.bound ? 'yes' : 'no';
    cmsHoverBox.title = '';
    Object.assign(cmsHoverBox.style, { left: (r.left - 2) + 'px', top: (r.top - 2) + 'px', width: (r.width + 4) + 'px', height: (r.height + 4) + 'px',
      border: picked.info.bound ? '1px dashed #5d8df6' : '1px dotted rgba(140,146,160,.7)', background: picked.info.bound ? 'rgba(93,141,246,.06)' : 'transparent' });
  }
  /* Content lens: a click inside the text being edited moves the caret (and never follows a
     link); a click elsewhere picks the text it lands on (cmsContentPick) and, when that text is
     bound to a field, makes it editable right there. Returns false to fall back to the design pick. */
  function cmsContentClick(event) {
    if (cmsInline && cmsInline.element.contains(event.target)) { event.preventDefault(); event.stopPropagation(); return true; }
    var picked = cmsContentPick(event.target);
    if (!picked) return false;
    event.preventDefault(); event.stopPropagation();
    cmsHover(null);
    cmsPreviewSelected = picked.element; cmsPreviewSelections = [picked.element];
    placeCmsLayoutUi(); emitCmsLayoutSelection(picked.info);
    if (picked.info.bound) cmsBeginInline(picked.element, picked.info, event);
    return true;
  }
  /* the hover affordance's listeners; installed once, beside the preview's message listener */
  function cmsInstallContentLens() {
    if (!cmsPreviewQuery || window.parent === window) return;
    document.addEventListener('mousemove', function (event) {
      if (cmsPreviewLens !== 'content') return;
      var target = event.target;
      if (cmsHoverFrame) return;
      cmsHoverFrame = requestAnimationFrame(function () { cmsHoverFrame = 0; cmsHover(target); });
    }, true);
    document.addEventListener('mouseleave', function () { cmsHover(null); });
    /* the words being typed are part of what Ctrl/Cmd+S saves: commit them before the save is
       forwarded (on the window, capture phase: before the document's keydown listener that forwards
       it, cmsForwardSaveShortcut; the two messages reach the editor in order) */
    window.addEventListener('keydown', function (event) {
      if (cmsInline && (event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') cmsEndInline(true);
    }, true);
  }
  /* ===================================================================== end CONTENT LENS */
  function cmsRoutePath() { return ArkUI.route && ArkUI.route.path ? ArkUI.route.path() : location.pathname; }
  function cmsLayoutBreakpoint() { return window.ArkLayout ? ArkLayout.breakpoint(window.innerWidth) : 'desktop'; }
  /* the frame that applies to `element` (`key`) on `route`: its route's entry, SHELL's for a shell element */
  function cmsFrameFor(route, key, element) {
    return window.ArkLayout ? ArkLayout.merged(ArkLayout.entryFor(cmsLayoutDraft, route, key, element) || {}, window.innerWidth) : {};
  }
  function cmsLayoutEntry(key, element) { return cmsFrameFor(cmsRoutePath(), key, element); }
  /* Where `element`'s edits are stored: its route, or ArkLayout.SHELL for the persistent shell
     (js/content/layout.js, "scopes") -- a header edit shows on every route */
  function cmsScopeOf(element) { return window.ArkLayout && ArkLayout.scopeOf ? ArkLayout.scopeOf(element, cmsRoutePath()) : cmsRoutePath(); }
  function cmsScopeOfAll(elements) { return window.ArkLayout && ArkLayout.scopeOfAll ? ArkLayout.scopeOfAll(elements, cmsRoutePath()) : cmsRoutePath(); }
  /* The editor's Layers tree (js/admin/admin.js renderConnectedLayers) is this: the actual
     rendered DOM of the previewed route, reported with every ready/select/change message. Walks depth-first from host's own
     children, including only elements ArkLayout.annotate() already tagged with a stable
     data-ark-layout-key -- an untagged wrapper produces no row of its own but is still
     walked through, so a valid annotated descendant is never silently dropped just because
     of an intermediate untagged element. A whole <svg> reads as one leaf row regardless of
     what annotate() tagged inside it: its internal paths/shapes stay reachable only through
     the existing "Enter illustration" escape hatch (cmsSelectIllustrationPart above), never
     as a wall of cluttering tree rows. */
  function cmsRealTree(host, route) {
    if (!host || !window.ArkLayout) return [];
    ArkLayout.annotate(host, route);
    var groups = ArkLayout.groupsFor(cmsLayoutDraft, route);
    function walk(parent) {
      var out = [];
      Array.prototype.forEach.call(parent.children || [], function (element) {
        /* a page still leaving after a navigation is another route's: not a layer of this one */
        if (ArkLayout.inRoute && !ArkLayout.inRoute(element, route)) return;
        var key = element.getAttribute && element.getAttribute('data-ark-layout-key'), tag = element.tagName ? element.tagName.toLowerCase() : '';
        /* an original a component instance now stands in for is hidden for as long as it does: not a layer you can see or pick */
        if (element.hasAttribute && element.hasAttribute('data-ark-component-replaced')) return;
        if (!key) { out = out.concat(walk(element)); return; }
        var kids = tag === 'svg' ? [] : walk(element);
        /* a stored name (Rename) wins; otherwise the name is derived from what the element is
           (ArkLayout.layerName: its group/block/state, its accessible name, landmark, heading,
           own words, class hint -- the tag last). `named` says which, `from` says where from. */
        var stored = ArkLayout.labelFor(cmsLayoutDraft, route, key, element);
        var derived = stored ? null : ArkLayout.layerName(element, key, { route: route, groups: groups, components: cmsComponentsDraft, states: cmsStatesDraft, leafRows: kids.every(function (k) { return !k.hasChildren; }) });
        out.push({ key: key, tag: tag, label: stored || derived.name, named: !!stored, from: stored ? 'label' : derived.from, hidden: cmsFrameFor(route, key, element).display === 'hide', hasChildren: kids.length > 0, children: kids });
      });
      return out;
    }
    return walk(host);
  }
  /* Resolves any annotated element by its stable key, independent of the current selection
     -- the Layers panel's rename input and hide toggle both act on a tree ROW, which is
     usually not whatever happens to be selected right now (reusing cmsPreviewSelected the
     way setCmsLayoutFrame does would silently mutate the wrong element). */
  function cmsElementForKey(key) {
    if (!key || !window.ArkLayout) return null;
    return ArkLayout.find(host, key, cmsRoutePath());
  }
  /* The hide toggle's "other half" of setCmsLayoutFrame: same ArkLayout.set() mechanism
     (via setCmsElementFrame below, commit=false so it only does the draft-mutate-and-apply
     half and never posts on its own), but keyed to an explicit element instead of
     cmsPreviewSelected, and reporting the REAL current selection/selections back to Studio
     (never the toggled row) so toggling a row that isn't selected cannot look like it
     silently selected something else. */
  function setCmsLayoutFrameForKey(key, frame, commit) {
    var element = cmsElementForKey(key);
    if (!element || !window.ArkLayout) return;
    if (commit) cmsSnapshotLayout();
    var info = cmsSelectionInfo(element);
    setCmsElementFrame(element, frame, false);
    if (commit) window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { route: info.route, key: info.key, breakpoint: info.breakpoint, frame: frame },
      selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), commands: cmsSelectionCommandList(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
  }
  /* The on-screen box of an element, including one with no box of its own: a captured
     component's root and the spot that holds it are display:contents (so the captured
     markup lays out exactly where the original selection did), and getBoundingClientRect()
     on those is 0x0 at the origin -- the outline and the toolbar landed in the corner. Such
     an element's box is the union of what it lays out. */
  function cmsRectOf(element) {
    if (!element || !element.getBoundingClientRect) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    if (getComputedStyle(element).display !== 'contents') return element.getBoundingClientRect();
    var rects = Array.prototype.map.call(element.children || [], cmsRectOf).filter(function (r) { return r.width || r.height; });
    if (!rects.length) return element.getBoundingClientRect();
    var left = Math.min.apply(null, rects.map(function (r) { return r.left; })), top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var right = Math.max.apply(null, rects.map(function (r) { return r.right; })), bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    return { left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top, x: left, y: top };
  }
  /* rendered at all: neither it nor an ancestor is display:none (a hidden state, a
     replaced original, a hidden layer) */
  function cmsIsShown(element) { return !!element && element.isConnected && (getComputedStyle(element).display === 'contents' ? cmsRectOf(element).width > 0 || cmsRectOf(element).height > 0 : element.getClientRects().length > 0); }
  function cmsSelectionInfo(element) {
    var rect = cmsRectOf(element), key = element.getAttribute('data-ark-layout-key') || '', frame = cmsLayoutEntry(key, element);
    /* A selected element that is itself a reusable-component instance root (js/content/
       components.js tags it with these three attributes on every render) reports which
       instance it is, so Studio's inspector can offer override editing for it -- reusing
       this same selection message rather than inventing a second one. */
    /* Climbs to the nearest instance root, the same way the state group below does: a click
       on an instance selects its root first and a second click drills into the text inside
       it (cmsResolvePick) -- and that drilled-in heading or paragraph IS what an override
       edits, so it must still show the Component instance section, not lose it. */
    var componentNode = null;
    for (var compNode = element; compNode && compNode !== host; compNode = compNode.parentNode) { if (compNode.hasAttribute && compNode.hasAttribute('data-ark-component-key')) { componentNode = compNode; break; } }
    var component = componentNode ? { key: componentNode.getAttribute('data-ark-component-key'), anchorId: componentNode.getAttribute('data-ark-component-anchor'), masterId: componentNode.getAttribute('data-ark-component-master') } : null;
    /* Part E: a state-0 member or a state's own anchor is tagged with its group id by
       ArkStates.render() (the same self-identifying pattern as the component attributes
       just above), so the inspector can show a States accordion for it without a second
       lookup table. Climb to the nearest tagged ANCESTOR (or self), the same escalation
       cmsGroupRootOf/cmsComponentRootOf already use -- without this, selecting a container
       that was made into state zero as one whole unit (e.g. a nav div holding three
       buttons) shows the accordion, but clicking down into one specific button inside it
       (to use THAT button, not the whole container, as the click trigger) found nothing,
       because only the exact selected elements ever carried the attribute, never their
       descendants. `key` below still reports the literal clicked element either way, so
       "Use this element as trigger" still targets the nested button, not the container. */
    var stateGroupNode = null;
    for (var stateNode = element; stateNode && stateNode !== host; stateNode = stateNode.parentNode) { if (stateNode.hasAttribute && stateNode.hasAttribute('data-ark-state-group')) { stateGroupNode = stateNode; break; } }
    var stateGroup = stateGroupNode ? { groupId: stateGroupNode.getAttribute('data-ark-state-group'), stateIndex: stateGroupNode.hasAttribute('data-ark-state-index') ? Number(stateGroupNode.getAttribute('data-ark-state-index')) : 0 } : null;
    /* An image-like element reports which attribute holds its text alternative and what the
       page module itself wrote there (before any saved override), so the toolbar's Alt text
       field can show the override and the markup's own value as its fallback. */
    var alt = typeof ArkLayout !== 'undefined' && ArkLayout.altOwn ? ArkLayout.altOwn(element) : null;
    /* An <img> (or SVG <image>) that shows one of the site's Media images says which: the editor offers
       "Replace image" for it (docs/ux-audit/cms.md P1-11). Matched by the data URL the image shows, the one
       ArkAsset.dataUrl(id) makes; '' for any other image (a file, a drawing). */
    var asset = '';
    var imageSrc = element.tagName === 'IMG' ? element.getAttribute('src') : element.tagName && element.tagName.toLowerCase() === 'image' ? (element.getAttribute('href') || element.getAttribute('xlink:href')) : '';
    if (imageSrc && imageSrc.indexOf('data:') === 0 && window.ArkAsset && ArkAsset.all) {
      ArkAsset.all().some(function (a) { if (ArkAsset.dataUrl(a.id) === imageSrc) { asset = a.id; return true; } return false; });
    }
    /* route: the SCOPE the element's edits are stored under (its route, or SHELL for the header);
       page: the route the preview shows */
    return { key: key, route: cmsScopeOf(element), page: cmsRoutePath(), breakpoint: cmsLayoutBreakpoint(), label: element.getAttribute('aria-label') || element.id || element.tagName.toLowerCase(),
      rect: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }, frame: frame, component: component, stateGroup: stateGroup, alt: alt, asset: asset };
  }
  function cmsSelectionList() { return cmsPreviewSelections.filter(function (element) { return element && element.isConnected; }); }
  function cmsSelectionPayload() { return cmsSelectionList().map(cmsSelectionInfo); }
  function ensureCmsLayoutUi() {
    if (cmsLayoutBox || !cmsPreviewQuery) return;
    var style = document.createElement('style'); style.setAttribute('data-ark-studio-ui', '');
    style.textContent = 'svg [data-ark-layout-key]{pointer-events:all!important}.ark-studio-box,.ark-studio-multi{position:fixed;z-index:2147483645;border:1px solid #5d8df6;pointer-events:none;box-sizing:border-box}.ark-studio-multi{border-style:dashed}.ark-studio-label{position:fixed;z-index:2147483646;background:#5d8df6;color:white;padding:4px 7px;border-radius:4px;font:600 11px/1.2 system-ui;pointer-events:auto;cursor:move;white-space:nowrap;touch-action:none}.ark-studio-handle{position:fixed;z-index:2147483647;width:10px;height:10px;background:white;border:2px solid #5d8df6;border-radius:2px;box-sizing:border-box;touch-action:none}.ark-studio-handle[data-dir=nw],.ark-studio-handle[data-dir=se]{cursor:nwse-resize}.ark-studio-handle[data-dir=ne],.ark-studio-handle[data-dir=sw]{cursor:nesw-resize}.ark-studio-menu{position:fixed;z-index:2147483647;min-width:220px;max-width:min(300px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;padding:6px;background:hsl(var(--overlay,220 12% 11%) / .97);color:hsl(var(--text,220 10% 92%));border:1px solid hsl(var(--border-default,220 8% 30%));border-radius:10px;box-shadow:0 2px 4px hsl(var(--theme-shadow-color,0 0% 0%) / .2),0 16px 40px hsl(var(--theme-shadow-color,0 0% 0%) / .35);font:500 13px/1.3 var(--font-sans,system-ui,sans-serif)}.ark-studio-menu button{display:flex;align-items:baseline;gap:8px;width:100%;border:0;background:transparent;color:inherit;font:inherit;padding:7px 10px;border-radius:6px;text-align:left;cursor:pointer}.ark-studio-menu button:hover:not(:disabled),.ark-studio-menu button:focus-visible{background:hsl(var(--nested,220 8% 22%));color:hsl(var(--text-strong,0 0% 100%));outline:none}.ark-studio-menu button:disabled{color:hsl(var(--text-muted,220 8% 65%));cursor:default}.ark-studio-menu button small{display:inline;padding:0;margin-left:auto;font-size:11px;color:hsl(var(--text-muted,220 8% 65%))}.ark-studio-menu hr{border:0;border-top:1px solid hsl(var(--border-soft,220 8% 25%));margin:5px 0}.ark-studio-menu>small{display:block;color:hsl(var(--text-muted,220 8% 65%));padding:5px 10px;font-size:11.5px}';
    document.head.appendChild(style);
    cmsLayoutBox = document.createElement('div'); cmsLayoutBox.className = 'ark-studio-box'; cmsLayoutBox.hidden = true; cmsLayoutBox.setAttribute('data-ark-studio-ui', '');
    cmsLayoutLabel = document.createElement('div'); cmsLayoutLabel.className = 'ark-studio-label'; cmsLayoutLabel.hidden = true; cmsLayoutLabel.setAttribute('data-ark-studio-ui', '');
    document.body.append(cmsLayoutBox, cmsLayoutLabel);
    ['nw', 'ne', 'se', 'sw'].forEach(function (dir) { var handle = document.createElement('div'); handle.className = 'ark-studio-handle'; handle.dataset.dir = dir; handle.hidden = true; handle.setAttribute('data-ark-studio-ui', ''); document.body.appendChild(handle); cmsLayoutHandles.push(handle); });
    cmsContextMenu = document.createElement('div'); cmsContextMenu.className = 'ark-studio-menu'; cmsContextMenu.hidden = true; cmsContextMenu.setAttribute('data-ark-studio-ui', ''); document.body.appendChild(cmsContextMenu);
  }
  function cmsUnionRect(elements) {
    var rects = elements.map(cmsRectOf);
    var left = Math.min.apply(null, rects.map(function (r) { return r.left; })), top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var right = Math.max.apply(null, rects.map(function (r) { return r.right; })), bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    return { left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top };
  }
  function placeCmsLayoutUi() {
    ensureCmsLayoutUi();
    var selections = cmsSelectionList();
    cmsMultiBoxes.forEach(function (box) { box.remove(); }); cmsMultiBoxes = [];
    if (!cmsPreviewEdit || !selections.length) {
      if (cmsLayoutBox) cmsLayoutBox.hidden = cmsLayoutLabel.hidden = true; cmsLayoutHandles.forEach(function (h) { h.hidden = true; }); return;
    }
    cmsPreviewSelections = selections; cmsPreviewSelected = selections[selections.length - 1];
    /* Only what is actually rendered gets an outline (regression: tests/cms-states-preview-default.cjs).
       Switching a state hides state 0's members with display:none, and the outline stayed
       drawn over the now-empty spot -- an outline around nothing. cmsReconcileSelection()
       moves the selection to what the switch revealed; this is the backstop for anything
       else that hides a selected element. */
    selections = selections.filter(cmsIsShown);
    if (!selections.length) { cmsLayoutBox.hidden = cmsLayoutLabel.hidden = true; cmsLayoutHandles.forEach(function (h) { h.hidden = true; }); return; }
    selections.forEach(function (element) { var rr = cmsRectOf(element), box = document.createElement('div'); box.className = 'ark-studio-multi'; box.setAttribute('data-ark-studio-ui', ''); Object.assign(box.style, { left: rr.left + 'px', top: rr.top + 'px', width: rr.width + 'px', height: rr.height + 'px' }); document.body.appendChild(box); cmsMultiBoxes.push(box); });
    var r = selections.length > 1 ? cmsUnionRect(selections) : cmsRectOf(selections[0]);
    Object.assign(cmsLayoutBox.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); cmsLayoutBox.hidden = false;
    /* named the way the Layers list names it (ArkLayout.layerName: its words, heading or accessible
       name), never its id -- "hl-title 528 x 202" put an internal name on the canvas */
    var selName = '';
    if (selections.length < 2 && window.ArkLayout && ArkLayout.layerName) { try { var ln = ArkLayout.layerName(cmsPreviewSelected, cmsPreviewSelected.getAttribute('data-ark-layout-key'), { route: cmsScopeOf(cmsPreviewSelected) }); selName = ln && ln.name; } catch (e) { selName = ''; } }
    if (selName && selName.length > 28) selName = selName.slice(0, 27) + '…';
    cmsLayoutLabel.textContent = (selections.length > 1 ? selections.length + ' layers' : (selName || cmsPreviewSelected.getAttribute('aria-label') || cmsPreviewSelected.tagName.toLowerCase())) + '  ' + Math.round(r.width) + ' × ' + Math.round(r.height);
    Object.assign(cmsLayoutLabel.style, { left: Math.max(2, r.left) + 'px', top: Math.max(2, r.top - 24) + 'px' }); cmsLayoutLabel.hidden = false;
    var points = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]];
    cmsLayoutHandles.forEach(function (handle, i) { handle.hidden = false; handle.style.left = (points[i][0] - 5) + 'px'; handle.style.top = (points[i][1] - 5) + 'px'; });
    /* the Content lens edits words, not geometry: no resize handles, no drag label */
    if (cmsPreviewLens === 'content') { cmsLayoutLabel.hidden = true; cmsLayoutHandles.forEach(function (h) { h.hidden = true; }); }
  }
  /* Grouping lives entirely in ArkLayout (the real DOM + cmsLayoutDraft), a different tree
     than the CMS content structure the sidebar's own Layers tab walks (manifest/article
     fields) -- so a new group never appeared there, by construction, however the panel was
     wired. Rather than force those two different trees into one view, report the current
     route's real groups directly so Studio can show them as their own small list. */
  function cmsGroupList() {
    var groups = ArkLayout.groupsFor(cmsLayoutDraft, cmsRoutePath());
    return Object.keys(groups).map(function (id) { return { id: id, label: groups[id].label || 'Group', members: (groups[id].members || []).length }; });
  }
  function emitCmsLayoutSelection(content) {
    if (!cmsPreviewSelected) return;
    /* content: the selection's Content-lens binding or refusal (cmsContentInfo), for the toolbar's Content section */
    window.parent.postMessage({ type: 'defxn-cms-preview-select', keys: String(cmsPreviewSelected.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean), content: content || cmsContentInfo(cmsPreviewSelected), selection: cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), commands: cmsSelectionCommandList(), groups: cmsGroupList(), points: cmsInsertionPoints(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
  }
  function setCmsElementFrame(element, frame, commit) {
    if (!element || !window.ArkLayout) return;
    var info = cmsSelectionInfo(element), patch = { route: info.route, key: info.key, breakpoint: info.breakpoint, frame: frame };
    cmsLayoutDraft = ArkLayout.set(cmsLayoutDraft, patch.route, patch.key, patch.breakpoint, patch.frame);
    /* Clearing the LAST stored property for a key (e.g. un-hiding an element that had no
       other overrides) makes sanitize() drop that key, and sometimes the whole route, from
       the draft entirely -- cmsLayoutDraft.routes[route] can then be undefined, so reading
       [key] off it directly used to throw and abort before applyFrame ever ran, leaving the
       element visually stuck in its old state even though the draft itself was already
       correct. Read defensively instead of assuming the path still exists. */
    ArkLayout.applyFrame(element, cmsFrameFor(cmsRoutePath(), patch.key, element));
    if (commit) window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: patch, selection: cmsSelectionInfo(element), selections: cmsSelectionPayload(), commands: cmsSelectionCommandList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
  }
  function setCmsLayoutFrame(frame, commit) {
    if (!cmsPreviewSelected || !window.ArkLayout) return;
    if (commit) cmsSnapshotLayout();
    setCmsElementFrame(cmsPreviewSelected, frame, commit); placeCmsLayoutUi();
  }
  function cmsSnapshotLayout() {
    cmsLayoutUndo.push(JSON.parse(JSON.stringify(cmsLayoutDraft))); if (cmsLayoutUndo.length > 100) cmsLayoutUndo.shift();
    cmsLayoutRedo.length = 0; cmsReportLayoutHistory('push', 'the style or layout edit');
  }
  /* reason 'push' (a new entry, `label` naming it) is what the editor's ONE history mirrors
     (js/admin/history.js): it interleaves these entries with the edits made in its own forms, and
     it alone asks for an undo or a redo here, in the order the person made them */
  function cmsReportLayoutHistory(reason, label) { window.parent.postMessage({ type: 'defxn-cms-preview-layout-history', canUndo: cmsLayoutUndo.length > 0, canRedo: cmsLayoutRedo.length > 0, depth: cmsLayoutUndo.length, reason: reason || '', label: label || '' }, location.origin); }
  function cmsRestoreLayout(nextDraft) {
    cmsLayoutDraft = ArkLayout.define(nextDraft);
    ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    placeCmsLayoutUi(); emitCmsLayoutSelection();
    window.parent.postMessage({ type: 'defxn-cms-preview-layout-replace', layout: cmsLayoutDraft, tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
    cmsReportLayoutHistory();
  }
  /* An inline text edit (Content lens) sits in the same history as layout edits: one undo stack
     for everything done on the canvas, in the order it was done (cmsEndInline pushes it). */
  function cmsUndoLayout() { var top = cmsLayoutUndo[cmsLayoutUndo.length - 1]; if (top && top.cmsCopy) { cmsLayoutRedo.push(cmsLayoutUndo.pop()); cmsReportLayoutHistory(); cmsApplyCopyEntry(top.cmsCopy, 'before', 'undo'); return; } if (!cmsLayoutUndo.length) return; cmsLayoutRedo.push(JSON.parse(JSON.stringify(cmsLayoutDraft))); cmsRestoreLayout(cmsLayoutUndo.pop()); }
  function cmsRedoLayout() { var top = cmsLayoutRedo[cmsLayoutRedo.length - 1]; if (top && top.cmsCopy) { cmsLayoutUndo.push(cmsLayoutRedo.pop()); cmsReportLayoutHistory(); cmsApplyCopyEntry(top.cmsCopy, 'after', 'redo'); return; } if (!cmsLayoutRedo.length) return; cmsLayoutUndo.push(JSON.parse(JSON.stringify(cmsLayoutDraft))); cmsRestoreLayout(cmsLayoutRedo.pop()); }
  function beginCmsLayoutAction(event, dir) {
    if (!cmsPreviewSelected || !cmsPreviewEdit || event.button !== 0) return;
    var r = cmsPreviewSelected.getBoundingClientRect(), current = cmsLayoutEntry(cmsPreviewSelected.getAttribute('data-ark-layout-key'));
    cmsLayoutAction = { dir: dir || 'move', sx: event.clientX, sy: event.clientY, rect: r, moved: false,
      frame: Object.assign({ x: 0, y: 0 }, current) };
    if ((dir || 'move') === 'move' && cmsSelectionList().length > 1) cmsLayoutAction.items = cmsSelectionList().map(function (element) { return { element: element, frame: Object.assign({ x: 0, y: 0 }, cmsLayoutEntry(element.getAttribute('data-ark-layout-key'))) }; });
    if (dir && dir !== 'move') { if (cmsLayoutAction.frame.width == null) cmsLayoutAction.frame.width = r.width; if (cmsLayoutAction.frame.height == null) cmsLayoutAction.frame.height = r.height; }
    if (dir && dir !== 'move') { event.preventDefault(); event.stopPropagation(); }
  }
  function cmsAlign(kind) {
    var elements = cmsSelectionList(); if (elements.length < 2) return;
    cmsSnapshotLayout();
    var union = cmsUnionRect(elements), rects = elements.map(function (element) { return element.getBoundingClientRect(); });
    elements.forEach(function (element, i) {
      var r = rects[i], current = cmsLayoutEntry(element.getAttribute('data-ark-layout-key')), dx = 0, dy = 0;
      if (kind === 'left') dx = union.left - r.left;
      else if (kind === 'hcenter') dx = union.left + union.width / 2 - (r.left + r.width / 2);
      else if (kind === 'right') dx = union.right - r.right;
      else if (kind === 'top') dy = union.top - r.top;
      else if (kind === 'vcenter') dy = union.top + union.height / 2 - (r.top + r.height / 2);
      else if (kind === 'bottom') dy = union.bottom - r.bottom;
      setCmsElementFrame(element, Object.assign({}, current, { x: (current.x || 0) + dx, y: (current.y || 0) + dy }), true);
    }); placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  function cmsDistribute(axis) {
    var elements = cmsSelectionList(); if (elements.length < 3) return;
    cmsSnapshotLayout();
    var items = elements.map(function (element) { return { element: element, rect: element.getBoundingClientRect() }; });
    items.sort(function (a, b) { return axis === 'horizontal' ? a.rect.left - b.rect.left : a.rect.top - b.rect.top; });
    var first = items[0].rect, last = items[items.length - 1].rect;
    for (var i = 1; i < items.length - 1; i++) {
      var item = items[i], ratio = i / (items.length - 1), current = cmsLayoutEntry(item.element.getAttribute('data-ark-layout-key')), dx = 0, dy = 0;
      if (axis === 'horizontal') dx = first.left + (last.left - first.left) * ratio - item.rect.left;
      else dy = first.top + (last.top - first.top) * ratio - item.rect.top;
      setCmsElementFrame(item.element, Object.assign({}, current, { x: (current.x || 0) + dx, y: (current.y || 0) + dy }), true);
    }
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  /* Real rendered markup is rarely as flat as two shift-clicked "layers" look: a heading and
     a badge that sit side by side on screen are almost never literal DOM siblings -- there is
     usually a wrapping span/strong/anchor in between. Requiring an exact parentNode match
     made grouping fail on almost any real selection, so instead: find each selected
     element's ancestor-or-self that IS a direct child of the whole selection's nearest
     common ancestor, and group those "promoted" nodes. That matches what a user actually
     means by "put these two things in a box together" -- the same way Figma groups a nested
     selection at the shallowest shared frame, not by demanding equal nesting depth. */
  function cmsNearestCommonAncestor(elements, root) {
    var chains = elements.map(function (element) {
      var chain = []; for (var node = element; node && node !== root.parentNode; node = node.parentNode) chain.unshift(node);
      return chain;
    });
    var minLen = Math.min.apply(null, chains.map(function (chain) { return chain.length; })), common = null;
    for (var i = 0; i < minLen; i++) {
      var candidate = chains[0][i];
      if (chains.every(function (chain) { return chain[i] === candidate; })) common = candidate; else break;
    }
    return common;
  }
  function cmsPromoteToChildOf(element, ancestor) {
    for (var node = element; node; node = node.parentNode) if (node.parentNode === ancestor) return node;
    return null;
  }
  function cmsGroupSelection() {
    var elements = cmsSelectionList(); if (elements.length < 2 || !window.ArkLayout) return;
    var common = cmsNearestCommonAncestor(elements, host);
    if (!common || common === host) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'These layers are not part of the same section. Select layers inside the same card or section first.' }, location.origin); return; }
    var promoted = [];
    elements.forEach(function (element) { var p = cmsPromoteToChildOf(element, common); if (p && promoted.indexOf(p) < 0) promoted.push(p); });
    if (promoted.length < 2) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'These layers are too close together to group separately. Try selecting their containers instead.' }, location.origin); return; }
    cmsSnapshotLayout();
    promoted.forEach(function (element) { if (!element.getAttribute('data-ark-layout-key')) element.setAttribute('data-ark-layout-key', ArkLayout.keyFor(element, host)); });
    var id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), members = promoted.map(function (element) { return element.getAttribute('data-ark-layout-key'); });
    var groupScope = cmsScopeOfAll(promoted);
    cmsLayoutDraft = ArkLayout.group(cmsLayoutDraft, groupScope, id, members, 'Group'); ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    cmsPreviewSelected = host.querySelector('[data-ark-layout-group="' + id + '"]'); cmsPreviewSelections = cmsPreviewSelected ? [cmsPreviewSelected] : [];
    window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { operation: 'group', route: groupScope, id: id, members: members, label: 'Group' }, selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), commands: cmsSelectionCommandList(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  function cmsUngroupSelection() {
    var element = cmsPreviewSelected, id = element && element.getAttribute('data-ark-layout-group'); if (!id || !window.ArkLayout) return;
    cmsSnapshotLayout();
    cmsLayoutDraft = ArkLayout.ungroup(cmsLayoutDraft, cmsRoutePath(), id); ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    cmsPreviewSelected = null; cmsPreviewSelections = [];
    window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { operation: 'ungroup', route: cmsRoutePath(), id: id }, selection: null, selections: [], groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin); placeCmsLayoutUi();
  }
  function cmsIllustrationParts(element) {
    if (!element || !element.querySelectorAll) return [];
    var parts = Array.prototype.slice.call(element.querySelectorAll('svg,g,path,rect,circle,ellipse,line,polyline,polygon,text,canvas,img'));
    return parts.filter(function (part) { var r = part.getBoundingClientRect(); return r.width > 1 && r.height > 1; }).sort(function (a, b) { var ar = a.getBoundingClientRect(), br = b.getBoundingClientRect(); return br.width * br.height - ar.width * ar.height; });
  }
  function cmsSelectIllustrationPart(element) {
    var parts = cmsIllustrationParts(element), part = parts.find(function (candidate) { return candidate !== element && candidate.tagName.toLowerCase() !== 'svg' && candidate.tagName.toLowerCase() !== 'g'; }) || parts[0];
    if (!part) return; cmsPreviewSelected = part; cmsPreviewSelections = [part]; placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  /* The right-click menu lives in THIS document, but the editor's contextual toolbar
     (#selToolbar in js/admin/admin.js) is drawn in the PARENT document on top of this
     whole iframe, right beside the selection -- exactly where the menu opens. So the
     toolbar covered the menu and swallowed the click: "Make into states", "Group",
     "Remove" visibly highlighted under the cursor and did nothing. This is the owner's
     original report, "I clicked it but nothing happened" (regression:
     tests/cms-context-menu-over-toolbar.cjs). Every open/close goes through here so the
     editor hides its toolbar for exactly as long as the menu is open. */
  function setCmsContextMenuOpen(open) {
    if (!cmsContextMenu) return;
    var was = !cmsContextMenu.hidden;
    cmsContextMenu.hidden = !open;
    if (was !== !!open && window.parent !== window) window.parent.postMessage({ type: 'defxn-cms-preview-context-menu', open: !!open }, location.origin);
  }
  /* THE selection commands: one list, two menus. The right-click menu below draws it, and the
     editor's toolbar draws the same list behind its "More" button (the select message carries it
     as `commands`; a choice comes back as 'defxn-cms-preview-selection-command' { id }) -- these
     were reachable ONLY by right-click (docs/ux-audit/cms.md P1-8). A command that cannot apply
     says why (AGENTS.md: a refusal names what it needs; "Distribute" greyed out with no reason
     read as broken -- regression: tests/cms-make-states-single.cjs); Align and Distribute appear
     only once enough layers are selected for them to mean anything, instead of eight greyed-out
     rows on every single-layer menu. `context`: right-click only (the layer under the pointer). */
  function cmsSelectionCommands(context) {
    var count = cmsSelectionList().length, isGroup = cmsPreviewSelected && cmsPreviewSelected.hasAttribute('data-ark-layout-group');
    /* `waits`: the refusal is only that the selection is too small (Group with one layer, Space evenly with two). Both menus
       leave such a command out of their list and say its reason once, in a line under it; a command refused for WHAT is
       selected (Make into component on an inserted block) has no `waits` and stays a row, marked, with its reason. */
    var out = [], add = function (id, label, run, needs, group, waits) { out.push({ id: id, label: label, run: run, needs: needs || '', group: group || 'edit', waits: !!(needs && waits) }); };
    if (context && cmsContextTarget && cmsPreviewSelections.indexOf(cmsContextTarget) < 0) add('add-layer', 'Add this layer to the selection', function () { cmsPreviewSelections.push(cmsContextTarget); cmsPreviewSelected = cmsContextTarget; placeCmsLayoutUi(); emitCmsLayoutSelection(); }, '', 'select');
    if (cmsIllustrationParts(cmsPreviewSelected).length) add('enter-illustration', 'Select inside this illustration', function () { cmsSelectIllustrationPart(cmsPreviewSelected); }, '', 'select');
    if (cmsPreviewSelected && cmsPreviewSelected.namespaceURI === 'http://www.w3.org/2000/svg' && cmsPreviewSelected.parentElement) add('select-parent', 'Select the drawing it belongs to', function () { cmsPreviewSelected = cmsPreviewSelected.parentElement; cmsPreviewSelections = [cmsPreviewSelected]; placeCmsLayoutUi(); emitCmsLayoutSelection(); }, '', 'select');
    /* Part E: ONE selected element is enough to make states (regression: tests/cms-make-states-single.cjs):
       the owner's worked example is a whole container, and that is exactly one layer */
    add('make-states', 'Make into states', cmsMakeStates, count < 1 ? 'Select a layer first.' : '');
    /* the selection becomes a reusable component, and an instance of it takes its place */
    var componentRefusal = cmsComponentRefusal(cmsSelectionList());
    add('make-component', 'Make into component', cmsMakeComponent, componentRefusal || '');
    add('group', 'Group', cmsGroupSelection, count < 2 ? 'Select 2 or more layers to group them (Shift-click adds a layer).' : '', 'edit', true);
    if (isGroup) add('ungroup', 'Ungroup', cmsUngroupSelection);
    add('remove', 'Remove', cmsRemoveSelection, !cmsPreviewSelected ? 'Select a layer first.' : '');
    if (count >= 2) [['align-left', 'Align left edges', 'left'], ['align-hcenter', 'Align centres (across)', 'hcenter'], ['align-right', 'Align right edges', 'right'], ['align-top', 'Align top edges', 'top'], ['align-vcenter', 'Align middles (down)', 'vcenter'], ['align-bottom', 'Align bottom edges', 'bottom']].forEach(function (item) { add(item[0], item[1], function () { cmsAlign(item[2]); }, '', 'align'); });
    if (count >= 2) {
      add('distribute-horizontal', 'Space evenly across', function () { cmsDistribute('horizontal'); }, count < 3 ? 'Select 3 or more layers to space them evenly.' : '', 'align', true);
      add('distribute-vertical', 'Space evenly down', function () { cmsDistribute('vertical'); }, count < 3 ? 'Select 3 or more layers to space them evenly.' : '', 'align', true);
    }
    /* site-wide, not about the selection: last, and named for what it opens (it was "Edit canvas") */
    add('page-transition', 'Page transition…', function () { window.parent.postMessage({ type: 'defxn-cms-preview-enter-canvas-mode' }, location.origin); }, '', 'site');
    return out;
  }
  /* what the editor's toolbar needs to draw them: no functions cross the frame */
  function cmsSelectionCommandList() { return cmsSelectionCommands(false).map(function (c) { return { id: c.id, label: c.label, needs: c.needs, group: c.group, waits: c.waits }; }); }
  function cmsRunSelectionCommand(id) {
    var command = cmsSelectionCommands(false).filter(function (c) { return c.id === id; })[0];
    if (!command) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'That command does not apply to this selection any more: select the layer again.' }, location.origin); return; }
    if (command.needs) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: command.label.replace(/…$/, '') + ': ' + command.needs }, location.origin); return; }
    command.run();
  }
  function showCmsContextMenu(event) {
    ensureCmsLayoutUi(); var count = cmsSelectionList().length;
    cmsContextMenu.textContent = '';
    cmsContextMenu.setAttribute('role', 'menu');
    var note = document.createElement('small'); note.textContent = count + ' layer' + (count === 1 ? '' : 's') + ' selected · Shift-click adds layers'; cmsContextMenu.appendChild(note);
    var lastGroup = '';
    var waiting = {};
    cmsSelectionCommands(true).forEach(function (command) {
      if (command.waits) { (waiting[command.needs] = waiting[command.needs] || []).push(command.label); return; }
      if (lastGroup && command.group !== lastGroup) cmsContextMenu.appendChild(document.createElement('hr'));
      lastGroup = command.group;
      var button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'menuitem'); button.dataset.command = command.id;
      button.textContent = command.label;
      if (command.needs) { button.disabled = true; button.title = command.needs; var why = document.createElement('small'); why.textContent = command.needs.replace(/\s*\(.*\)\.?$/, '').replace(/\.$/, ''); button.appendChild(why); }
      button.addEventListener('click', function () { setCmsContextMenuOpen(false); command.run(); });
      cmsContextMenu.appendChild(button);
    });
    /* what is waiting for a bigger selection: one quiet line per reason, not a greyed row each */
    var reasons = Object.keys(waiting);
    if (reasons.length) {
      var waits = document.createElement('small'); waits.dataset.waits = 'true';
      waits.textContent = reasons.map(function (needs) { return waiting[needs].join(', ') + ': ' + needs; }).join(' ');
      cmsContextMenu.appendChild(waits);
    }
    /* placed from its MEASURED size, flipped up / left when it would run past the canvas's
       edge: it was placed by a guessed 230 x 330 box and its bottom rows were clipped */
    cmsContextMenu.style.left = '0px'; cmsContextMenu.style.top = '0px'; setCmsContextMenuOpen(true);
    var w = cmsContextMenu.offsetWidth, h = cmsContextMenu.offsetHeight;
    var left = event.clientX + w + 8 > window.innerWidth ? Math.max(8, event.clientX - w) : event.clientX;
    var top = event.clientY + h + 8 > window.innerHeight ? Math.max(8, Math.min(event.clientY - h, window.innerHeight - h - 8)) : event.clientY;
    cmsContextMenu.style.left = left + 'px'; cmsContextMenu.style.top = top + 'px';
    var first = cmsContextMenu.querySelector('button:not(:disabled)'); if (first) first.focus({ preventScroll: true });
    event.preventDefault(); event.stopPropagation();
  }
  /* the menu is a menu: arrow keys move, Esc closes */
  function cmsContextMenuKey(event) {
    if (!cmsContextMenu || cmsContextMenu.hidden) return false;
    if (event.key === 'Escape') { event.preventDefault(); setCmsContextMenuOpen(false); return true; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return false;
    var items = Array.prototype.slice.call(cmsContextMenu.querySelectorAll('button:not(:disabled)')), i = items.indexOf(document.activeElement);
    event.preventDefault();
    var next = items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]; if (next) next.focus();
    return true;
  }
  /* Reusable component edits (js/content/components.js): unlike per-frame layout drags,
     every one of these is a single discrete action (create a master, insert an instance,
     edit an override, remove an instance), so each is applied as one whole-draft replace
     -- compute the new draft here with the real ArkComponents mutators, keep this iframe's
     cmsComponentsDraft and ArkComponents's own `current` in sync (ArkComponents.define,
     the same way cmsRestoreLayout() keeps cmsLayoutDraft in sync with ArkLayout.define),
     re-render the current route's anchors live, then relay the whole updated draft up to
     Studio. This is simpler than layout's patch-vs-replace split because there is no drag
     to throttle: one computation, done once, is the single source of truth, instead of the
     same mutation being recomputed independently in two places. */
  function cmsComponentsCommand(data) {
    if (!window.ArkComponents || !cmsPreviewQuery) return;
    /* `route` is the scope a new instance is stored under -- the place it goes decides it (an
       instance after a header link is the header's, on every route); the mutators below find an
       existing instance in its own scope from the route shown. Rendering is always for `page`. */
    var page = cmsRoutePath(), route = (data && data.route) || page, draft = cmsComponentsDraft;
    if (data.action === 'insert-instance') route = cmsScopeOf(data.after ? cmsElementForKey(data.after) : cmsInsertAnchor(data.anchorId));
    if (data.action === 'create-master') draft = ArkComponents.createMaster(draft, data.id, data.resolver, data.props, data.label);
    else if (data.action === 'update-master') draft = ArkComponents.updateMaster(draft, data.id, data.patch);
    /* `after` (a layout key) instead of an anchor: insert right after that element, in a new
       spot -- how a block goes onto a page whose module declares no usable anchor */
    else if (data.action === 'insert-instance' && data.after) draft = ArkComponents.placeInstance(draft, route, 'spot-' + cmsStamp(), data.after, [], data.key, data.masterId);
    else if (data.action === 'insert-instance') draft = ArkComponents.insertInstance(draft, route, data.anchorId, data.key, data.masterId);
    else if (data.action === 'set-override') draft = ArkComponents.setOverride(draft, route, data.anchorId, data.key, data.propPath, data.value);
    else if (data.action === 'remove-instance') draft = ArkComponents.removeInstance(draft, route, data.anchorId, data.key);
    else if (data.action === 'detach-instance') draft = ArkComponents.detachInstance(draft, route, data.anchorId, data.key, data.id);
    else if (data.action === 'seed-state') draft = cmsSeedState(draft, page, data);
    else return;
    /* a selected instance is rebuilt by the render below; keep it selected by its key */
    var refs = cmsSelectionRefs();
    cmsComponentsDraft = ArkComponents.define(draft);
    ArkComponents.renderAll(host, page, cmsComponentsDraft);
    var reselected = refs.some(function (ref) { return ref.component; }) && cmsRestoreSelection(refs);
    window.parent.postMessage({ type: 'defxn-cms-preview-components-replace', components: cmsComponentsDraft, points: cmsInsertionPoints(), tree: cmsRealTree(host, page) }, location.origin);
    if (reselected) { placeCmsLayoutUi(); emitCmsLayoutSelection(); }
  }
  /* the [data-ark-insert] anchor `id` names on the route shown (the leaving page's never answers) */
  function cmsInsertAnchor(id) {
    return Array.prototype.find.call(host.querySelectorAll('[data-ark-insert]'), function (el) { return el.getAttribute('data-ark-insert') === id && (!window.ArkLayout || ArkLayout.inRoute(el, cmsRoutePath())); }) || null;
  }
  function cmsStamp() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function cmsComponentRoot(key) {
    return Array.prototype.find.call(host.querySelectorAll('[data-ark-component-key]'), function (el) { return el.getAttribute('data-ark-component-key') === key; }) || null;
  }
  /* A selection that survives a re-render which rebuilds what it points at (regression:
     tests/cms-selection-survives-remount.cjs). Two re-renders rebuild selected elements: a
     component command re-renders its instances, and a draft refresh ('defxn-cms-preview-state',
     sent on every frame load and every Studio re-render) REMOUNTS the whole route ~1 s after the
     page is already clickable. The remount used to drop the selection silently while Studio's
     toolbar kept showing the destroyed one -- Detach then "did nothing" visible: the draft was
     detached, but the toolbar still offered Detach on the old master (studio-flows makecomp).
     So each selected element is remembered by what identifies it across a rebuild -- an
     instance root by its instance key (rebuilt with a new node), else the very element while
     it is still in the page, else its layout key -- and found again after the rebuild; one that no
     longer exists drops out of the selection instead of lingering. */
  function cmsSelectionRefs() {
    /* every selected element, connected or not: a removed node still carries the attributes
       that identify it, so this also finds again what a remount already replaced */
    /* what the element says is read NOW, before the rebuild: a rebuild can empty the very node
       (an unwrapped group wrapper reads '' afterwards) and then nothing would ever match it */
    return cmsPreviewSelections.filter(Boolean).map(function (element) { return { element: element, component: element.getAttribute('data-ark-component-key'), key: element.getAttribute('data-ark-layout-key'), tag: element.tagName, text: element.textContent.trim() }; });
  }
  function cmsRestoreSelection(refs) {
    if (!refs.length) return false;
    if (window.ArkLayout) ArkLayout.annotate(host);
    /* A remount used to renumber layout keys (the route's container went from div:2 to div:7 on
       /chain); keys are now scoped to the page's own content and cannot (js/content/layout.js).
       The element a key finds is still only taken if it is the same kind of element saying the
       same thing: the remount rebuilt the page from a draft that may have changed it. */
    var same = function (found, ref) { return !!found && found.tagName === ref.tag && found.textContent.trim() === ref.text; };
    var byKey = function (ref) { var found = ref.key && cmsElementForKey(ref.key); return same(found, ref) ? found : null; };
    var next = refs.map(function (ref) { return (ref.component && cmsComponentRoot(ref.component)) || (ref.element.isConnected && ref.element) || byKey(ref) || null; })
      .filter(function (element, i, all) { return element && element.isConnected && all.indexOf(element) === i; });
    cmsPreviewSelections = next; cmsPreviewSelected = next[next.length - 1] || null;
    return true;
  }
  /* A new state's starter content, derived from the state-0 content it stands in for
     (regression: tests/components-capture.cjs): one unit of state 0 -- a nav link for a nav,
     the heading for a heading -- captured with its own look and the state's label as its
     text, instead of a fixed big Text heading that looked like a page title in a nav bar.
     Only when state 0 has no text at all (an image) does it fall back to a typed Text block. */
  function cmsSeedState(draft, route, data) {
    if (!window.ArkStates || !data.groupId || !data.id || !data.key) return draft;
    var group = ArkStates.groupFor(cmsStatesDraft, route, data.groupId);
    var members = group ? group.states[0].members.map(cmsElementForKey).filter(Boolean) : [];
    var label = String(data.label || 'New state'), anchorId = ArkStates.anchorId(data.groupId, data.index);
    var starter = ArkComponents.starterFrom(members, label);
    draft = starter
      ? ArkComponents.createMaster(draft, data.id, ArkComponents.CAPTURED, starter.props, label + ' · like state 0', starter.tree)
      : ArkComponents.createMaster(draft, data.id, 'RBLOCK_TEXT_V1', ArkComponents.starterProps('RBLOCK_TEXT_V1', label), label + ' · Text');
    /* the state's content lives where its group does: a header group's states show on every route */
    return ArkComponents.insertInstance(draft, ArkStates.groupScope(cmsStatesDraft, route, data.groupId) || route, anchorId, data.key, data.id);
  }
  /* Why the current selection cannot become a component, or '' when it can -- every
     refusal says what to select instead. Content the runtime builds (an inserted block, a
     state's own content, a state group's members) is rebuilt on every render and has no
     fixed place to stand in for, so only the page's own markup is offered. */
  function cmsComponentRefusal(elements) {
    if (!elements.length) return 'select a layer';
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element === host) return 'select something inside the page';
      if (element.closest('[data-ark-insert]') || element.closest('[data-ark-component-key]')) return 'select page content, not an inserted block';
      if (element.closest('[data-ark-state-group]') || element.querySelector('[data-ark-state-group]')) return 'select content outside a state group';
      if (element.namespaceURI === 'http://www.w3.org/2000/svg' && element.tagName.toLowerCase() !== 'svg') return 'select the whole illustration';
    }
    /* One place to stand in for: the instance takes the selection's place, so the layers must share a
       parent. Across two containers (a page title in its hero and a paragraph in a tab) there is no
       single place -- the instance landed after the last one and the hero silently lost its title.
       Owner-facing choice (2026-10-20): refuse and say how, never move content between containers. */
    if (elements.length > 1) {
      var parent = elements[0].parentNode;
      for (var j = 1; j < elements.length; j++) if (elements[j].parentNode !== parent) return 'select layers that sit side by side in one container (or select that container)';
    }
    return '';
  }
  /* "Make into component": the selection becomes a reusable component -- its real markup
     captured as the definition (ArkComponents.capture: structure, classes, attributes; one
     prop per text node and image) -- and an instance of it takes the selection's place, in a
     spot right after the last selected element that hides the originals. The originals stay
     in the DOM, hidden: removing that instance brings them back. */
  function cmsMakeComponent() {
    if (!window.ArkComponents || !window.ArkLayout) return;
    var elements = cmsSelectionList(), refusal = cmsComponentRefusal(elements);
    if (refusal) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'Make into component needs a different selection: ' + refusal + '.' }, location.origin); return; }
    elements = elements.filter(function (element) { return !elements.some(function (other) { return other !== element && other.contains(element); }); });
    elements.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    ArkLayout.annotate(host);
    elements.forEach(function (element) { if (!element.getAttribute('data-ark-layout-key')) element.setAttribute('data-ark-layout-key', ArkLayout.keyFor(element, host)); });
    var captured = ArkComponents.capture(elements);
    if (!captured) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'Nothing in this selection can be rebuilt as a component: select text, links, images or the boxes around them (a canvas is painted by page code and cannot be captured).' }, location.origin); return; }
    var route = cmsRoutePath(), scope = cmsScopeOfAll(elements), stamp = cmsStamp(), masterId = 'm' + stamp, spotId = 'spot-' + stamp, key = 'i' + stamp;
    var keys = elements.map(function (element) { return element.getAttribute('data-ark-layout-key'); });
    var firstSlot = ArkComponents.propsOf({ resolver: ArkComponents.CAPTURED, tree: captured.tree })[0];
    var label = (firstSlot && String(captured.props[firstSlot] || '').trim().slice(0, 40)) || elements[0].tagName.toLowerCase();
    if (elements.length > 1) label += ' + ' + (elements.length - 1) + ' more';
    var draft = ArkComponents.createMaster(cmsComponentsDraft, masterId, ArkComponents.CAPTURED, captured.props, label, captured.tree);
    draft = ArkComponents.placeInstance(draft, scope, spotId, keys[keys.length - 1], keys, key, masterId);
    if (!draft.spots || !draft.spots[scope] || !draft.spots[scope][spotId]) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'Could not place the component on this page.' }, location.origin); return; }
    cmsComponentsDraft = ArkComponents.define(draft);
    ArkComponents.renderAll(host, route, cmsComponentsDraft);
    ArkLayout.annotate(host);
    var root = cmsComponentRoot(key);
    cmsPreviewSelections = root ? [root] : []; cmsPreviewSelected = root;
    window.parent.postMessage({ type: 'defxn-cms-preview-components-replace', components: cmsComponentsDraft, created: masterId, points: cmsInsertionPoints(), tree: cmsRealTree(host, route) }, location.origin);
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  /* ---- insertion points for the Library's Insert. Every place a block could go on this
     page, each with whether a block put there would actually be SEEN (regression:
     tests/cms-insertion-points.cjs): /about's only declared anchor sits in a section whose
     padding leaves it 0px of content width, so an inserted block existed and was invisible.
     A state's own anchor is not a place to insert -- its content belongs to that state and
     is managed in the States section -- so it is never listed. */
  var MIN_POINT_WIDTH = 24;      /* narrower than two characters of body text: nothing readable fits */
  function cmsContentWidth(element) {
    if (!element || !cmsIsShown(element)) return 0;
    var cs = getComputedStyle(element);
    return Math.max(0, element.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
  }
  function cmsLabelOf(element) {
    if (!element) return 'element';
    var text = String(element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();
    return element.tagName.toLowerCase() + (text ? ' "' + text.slice(0, 32) + (text.length > 32 ? '…' : '') + '"' : '');
  }
  function cmsInsertionPoints() {
    if (!window.ArkComponents || !host) return [];
    var points = [];
    Array.prototype.forEach.call(host.querySelectorAll('[data-ark-insert]'), function (anchor) {
      if (anchor.hasAttribute('data-ark-state-anchor') || (anchor.parentElement && anchor.parentElement.closest('[data-ark-insert],[data-ark-state-group]'))) return;
      var id = anchor.getAttribute('data-ark-insert'), spot = anchor.hasAttribute('data-ark-spot');
      /* a declared anchor's width when empty is the width a block put in it gets; a spot is
         display:contents, so what it holds lays out in its parent */
      var width = spot ? cmsContentWidth(anchor.parentElement) : (cmsIsShown(anchor) ? anchor.getBoundingClientRect().width : 0);
      var prev = spot ? anchor.previousElementSibling : null;
      points.push({ id: id, anchorId: id, kind: spot ? 'spot' : 'anchor', label: spot ? 'Beside ' + cmsLabelOf(prev && prev.hasAttribute('data-ark-component-replaced') ? null : prev) : 'Page slot "' + id + '"', width: Math.round(width) });
    });
    var selected = cmsPreviewSelected, key = selected && selected.getAttribute('data-ark-layout-key');
    if (selected && key && selected !== host && !selected.closest('[data-ark-insert],[data-ark-component-key],[data-ark-state-group]') && !(selected.namespaceURI === 'http://www.w3.org/2000/svg' && selected.tagName.toLowerCase() !== 'svg')) {
      points.push({ id: 'after:' + key, after: key, kind: 'after', label: 'After the selection: ' + cmsLabelOf(selected), width: Math.round(cmsContentWidth(selected.parentElement)) });
    }
    points.forEach(function (point) {
      point.usable = point.width >= MIN_POINT_WIDTH;
      if (!point.usable) point.reason = point.width ? point.width + 'px wide in this page\'s layout -- too narrow to show a block' : '0px wide in this page\'s layout -- a block inserted here would be invisible';
    });
    return points;
  }
  /* The Library's point picker hovers a point; draw where it is on the page. An empty
     anchor has no height, so it is drawn as a bar where a block would start; "after the
     selection" is a bar on the selection's trailing edge (its right edge in a row layout). */
  var cmsPointMarker = null;
  function cmsHighlightPoint(id) {
    if (cmsPointMarker) { cmsPointMarker.remove(); cmsPointMarker = null; }
    if (!id) return;
    var point = cmsInsertionPoints().find(function (p) { return p.id === id; });
    if (!point) return;
    var rect, bar = false;
    if (point.kind === 'after') {
      var after = cmsElementForKey(point.after); if (!after) return;
      var r = cmsRectOf(after), parentStyle = after.parentElement ? getComputedStyle(after.parentElement) : null;
      var row = parentStyle && /flex/.test(parentStyle.display) && !/column/.test(parentStyle.flexDirection);
      rect = row ? { left: r.right + 1, top: r.top, width: 4, height: r.height } : { left: r.left, top: r.bottom + 1, width: r.width, height: 4 };
      bar = true;
    } else {
      var anchor = Array.prototype.find.call(host.querySelectorAll('[data-ark-insert]'), function (el) { return el.getAttribute('data-ark-insert') === point.anchorId; });
      if (!anchor) return;
      rect = cmsRectOf(anchor.hasAttribute('data-ark-spot') && !anchor.children.length ? anchor.parentElement : anchor);
      if (rect.height < 4) { rect = { left: rect.left, top: rect.top, width: Math.max(rect.width, 4), height: 4 }; bar = true; }
    }
    if (!rect || (!point.usable && !rect.width)) return;
    var marker = document.createElement('div'); marker.className = 'ark-studio-point'; marker.setAttribute('data-ark-studio-ui', ''); marker.setAttribute('data-point', id);
    Object.assign(marker.style, { position: 'fixed', zIndex: '2147483646', pointerEvents: 'none', boxSizing: 'border-box', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px',
      background: bar ? '#2fbf71' : 'rgba(47,191,113,.12)', border: bar ? '0' : '2px dashed #2fbf71', borderRadius: '2px' });
    document.body.appendChild(marker); cmsPointMarker = marker;
    if (marker.scrollIntoView && (rect.top < 0 || rect.top > window.innerHeight)) { var target = point.kind === 'after' ? cmsElementForKey(point.after) : null; if (target) target.scrollIntoView({ block: 'center' }); }
  }
  /* "Make into states" (js/main.js's own showCmsContextMenu, below): the current
     selection becomes state 0 of a brand-new group, the same direct-call shape
     cmsGroupSelection already uses for its own right-click action (not a postMessage
     round trip, since the selection already lives here). Every OTHER states edit
     (+ Add state, remove a state, change the trigger, preview a state) comes from
     Studio's inspector instead, so it is message-driven -- see cmsStatesCommand below,
     the same create-vs-edit split cmsGroupSelection/cmsComponentsCommand already have. */
  function cmsMakeStates() {
    var elements = cmsSelectionList();
    if (elements.length < 1 || !window.ArkStates || !window.ArkLayout) return;
    elements.forEach(function (element) { if (!element.getAttribute('data-ark-layout-key')) element.setAttribute('data-ark-layout-key', ArkLayout.keyFor(element, host)); });
    var route = cmsRoutePath(), groupId = 'st' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    var keys = elements.map(function (element) { return element.getAttribute('data-ark-layout-key'); });
    /* stored in its members' scope: a state group of header elements works on every route */
    cmsStatesDraft = ArkStates.define(ArkStates.createStateGroup(cmsStatesDraft, cmsScopeOfAll(elements), groupId, keys, 'self'));
    ArkStates.render(host, route, groupId, cmsStatesView(route), cmsComponentsDraft);
    window.parent.postMessage({ type: 'defxn-cms-preview-states-replace', states: cmsStatesDraft, showing: cmsStatesShowingFor(route), route: route, groupId: groupId, created: true, tree: cmsRealTree(host, route) }, location.origin);
    emitCmsLayoutSelection();
  }
  /* After a group switches state, a selected element it just hid is replaced by what the
     switch revealed -- state 0's members, or the showing state's anchor -- so the outline,
     the toolbar and the States section follow the content instead of pointing at a hidden
     element (regression: tests/cms-states-preview-default.cjs). A selected element the
     switch did not hide is left alone. */
  function cmsReconcileSelection(route, groupId) {
    var selected = cmsSelectionList();
    if (!selected.length || selected.every(cmsIsShown)) return false;
    var group = ArkStates.groupFor(cmsStatesView(route), route, groupId);
    var inGroup = function (element) { for (var node = element; node && node !== host; node = node.parentNode) if (node.getAttribute && node.getAttribute('data-ark-state-group') === groupId) return true; return false; };
    var kept = selected.filter(cmsIsShown);
    if (group && selected.some(function (element) { return !cmsIsShown(element) && inGroup(element); })) {
      var revealed = group.current === 0
        ? Array.prototype.filter.call(host.querySelectorAll('[data-ark-state-group]'), function (el) { return el.getAttribute('data-ark-state-group') === groupId && !el.hasAttribute('data-ark-state-anchor'); })
        : Array.prototype.filter.call(host.querySelectorAll('[data-ark-state-anchor]'), function (el) { return el.getAttribute('data-ark-state-group') === groupId && el.getAttribute('data-ark-state-index') === String(group.current); });
      if (window.ArkLayout) ArkLayout.annotate(host);
      kept = kept.filter(function (element) { return !inGroup(element); }).concat(revealed.filter(cmsIsShown));
    }
    cmsPreviewSelections = kept; cmsPreviewSelected = kept[kept.length - 1] || null;
    placeCmsLayoutUi();
    if (cmsPreviewSelected) emitCmsLayoutSelection();
    else window.parent.postMessage({ type: 'defxn-cms-preview-select', keys: [], selection: null, selections: [], groups: cmsGroupList(), tree: cmsRealTree(host, route) }, location.origin);
    return true;
  }
  /* shows `index` for one group (clamped), draws it, and tells the editor -- the one path
     both the toolbar's Preview and a Live-mode click take */
  function cmsShowState(route, groupId, index) {
    cmsStatesShowing[cmsStatesShowKey(route, groupId)] = Number(index) || 0;
    ArkStates.render(host, route, groupId, cmsStatesView(route), cmsComponentsDraft);
    if (cmsPreviewQuery && window.parent !== window) window.parent.postMessage({ type: 'defxn-cms-preview-states-showing', route: route, showing: cmsStatesShowingFor(route) }, location.origin);
  }
  /* Layered-state edits from Studio's States inspector accordion: every add-state/
     remove-state/remove-group/set-trigger/set-default command is computed once here
     with the real ArkStates mutators, re-rendered for that one group live, then
     relayed up as a whole-draft replace -- the exact same shape as
     cmsComponentsCommand above. `preview` is NOT a draft edit: it only changes what the
     group is showing (cmsStatesShowing), so it can never reach a saved file. `set-default`
     is the explicit, saved choice of which state a visitor sees first (ArkStates.setCurrent
     -- the model's `current` IS the default); it also shows that state. */
  function cmsStatesCommand(data) {
    if (!window.ArkStates || !cmsPreviewQuery || !data) return;
    /* always the route shown: the mutators find a group in its own scope (the route's or SHELL's) */
    var route = cmsRoutePath(), draft = cmsStatesDraft, showKey = cmsStatesShowKey(route, data.groupId);
    if (data.action === 'preview') {
      cmsShowState(route, data.groupId, data.index);
      cmsReconcileSelection(route, data.groupId);
      return;
    }
    var showing = cmsStatesShowing[showKey];
    if (data.action === 'add-state') draft = ArkStates.addState(draft, route, data.groupId, data.label);
    else if (data.action === 'remove-state') {
      draft = ArkStates.removeState(draft, route, data.groupId, data.index);
      /* the states after the removed one move down by one; showing the removed one falls back to 0 */
      if (typeof showing === 'number') cmsStatesShowing[showKey] = showing === Number(data.index) ? 0 : showing > Number(data.index) ? showing - 1 : showing;
    } else if (data.action === 'remove-group') {
      /* show state 0 before the group goes, or its members stay hidden with nothing left to bring them back */
      cmsShowState(route, data.groupId, 0);
      draft = ArkStates.removeGroup(draft, route, data.groupId);
      delete cmsStatesShowing[showKey];
    }
    else if (data.action === 'set-trigger') draft = ArkStates.setTrigger(draft, route, data.groupId, data.trigger);
    else if (data.action === 'set-default') { draft = ArkStates.setCurrent(draft, route, data.groupId, data.index); cmsStatesShowing[showKey] = Number(data.index) || 0; }
    else return;
    cmsStatesDraft = ArkStates.define(draft);
    if (data.groupId) ArkStates.render(host, route, data.groupId, cmsStatesView(route), cmsComponentsDraft);
    window.parent.postMessage({ type: 'defxn-cms-preview-states-replace', states: cmsStatesDraft, showing: cmsStatesShowingFor(route), route: route, groupId: data.groupId,
      points: cmsInsertionPoints(), tree: cmsRealTree(host, route) }, location.origin);
    if (data.groupId) cmsReconcileSelection(route, data.groupId);
  }
  /* Canvas-only mode's field edits (effect/duration/easing, Part G): unlike layout/
     components/states, nothing here mutates real page content or needs re-rendering
     against a route -- it is one site-wide settings object -- so this just merges the
     patch, sanitizes it through the real ArkCanvasTransitions.define() (keeping this
     iframe's own module state and the relayed draft in sync, the same way the components/
     states commands above do), and relays the whole updated draft up. The editor applies
     that draft as-is (applyStudioCanvasTransitionsReplace) rather than re-deriving it, so
     the one sanitize() result is computed once, here, next to the page that renders it. */
  function cmsCanvasTransitionsCommand(data) {
    if (!window.ArkCanvasTransitions || !cmsPreviewQuery || !data) return;
    cmsCanvasTransitionsDraft = ArkCanvasTransitions.define(Object.assign({}, cmsCanvasTransitionsDraft, data.patch));
    window.parent.postMessage({ type: 'defxn-cms-preview-canvas-transitions-replace', canvasTransitions: cmsCanvasTransitionsDraft }, location.origin);
  }
  /* Studio's "Preview this transition" button: a one-shot round trip against the
     connected preview's own persistent layer, reusing the exact same apply() call
     js/ark/page-router.js's navigate() makes on every real navigation -- never a
     separate preview-only animation path. Reads whatever is currently defined
     (cmsCanvasTransitionsDraft's sanitized value, already live here from every prior
     field edit above), so the owner previews their unsaved draft, not last Save's. */
  function cmsCanvasTransitionsPreview() {
    if (!window.ArkCanvasTransitions || !cmsPreviewQuery) return;
    var persistentEl = scene && scene.querySelector && scene.querySelector('[data-ark-layer="persistent"]');
    if (!persistentEl) return;
    try {
      var outMs = ArkCanvasTransitions.apply(persistentEl, 'out');
      setTimeout(function () { try { ArkCanvasTransitions.apply(persistentEl, 'in'); } catch (e) {} }, outMs);
    } catch (e) {}
  }
  /* Animation-only mode's field edits (direction/distance/duration/delay/easing,
     Part H): resolved against the CURRENTLY SELECTED element (cmsPreviewSelected,
     the same selection every layout/components/states command above already acts
     on). This has no copy of ArkElementMotion.sanitize()/set() of its own (same
     "this document has no <script src>, compute it once inside the one document
     that does" reasoning cmsCanvasTransitionsCommand's own comment states) -- merge
     the patch through the real ArkElementMotion.set(), keep this iframe's own
     module state and the relayed draft in sync, relay the whole updated draft up.
     A patch with no selection, or a selection with no addressable key, is a safe
     no-op: Studio's own panel never shows these controls without a selection (the
     "Select an element..." hint takes their place instead), but every other
     selection-scoped command above guards the same way regardless of what the UI
     currently shows. */
  function cmsElementMotionCommand(data) {
    if (!window.ArkElementMotion || !cmsPreviewQuery || !data || !data.patch || !cmsPreviewSelected) return;
    var info = cmsSelectionInfo(cmsPreviewSelected);
    if (!info.key) return;
    cmsElementMotionDraft = ArkElementMotion.define(ArkElementMotion.set(cmsElementMotionDraft, info.route, info.key, data.patch));
    window.parent.postMessage({ type: 'defxn-cms-preview-element-motion-replace', elementMotion: cmsElementMotionDraft, selection: info }, location.origin);
  }
  /* Studio's "Preview" button (Part H): a one-shot round trip against the connected
     preview's own selected element. createPresence's real per-item stagger
     (js/ark/scene-state.js) only ever operates on a whole registered page's own
     item list from inside its own closure, so there is no single exported function
     to call for one arbitrary element directly -- this instead builds the exact
     same keyframe/transform SHAPE createPresence's own override branch does (same
     ArkElementMotion.vectorFor() table, same sign convention: entering travels FROM
     the offset point with sign +1, exiting travels TO it with sign -1), so the two
     can never describe the override differently even though they are not one
     literal shared call. Reads the DRAFT's current (possibly unsaved) value for the
     resolved key -- not whatever is already saved to window.ArkElementMotion -- so
     the owner previews exactly what they are about to save, the same "preview the
     unsaved draft" rule cmsCanvasTransitionsPreview above already follows. */
  function cmsElementMotionPreview(key) {
    if (!window.ArkElementMotion) return;
    var element = key ? cmsElementForKey(key) : cmsPreviewSelected;
    if (!element) return;
    var resolvedKey = key || element.getAttribute('data-ark-layout-key');
    if (!resolvedKey) return;
    var entry = ArkElementMotion.entryFor(cmsElementMotionDraft, cmsScopeOf(element), resolvedKey) || ArkElementMotion.defaultEntry();
    var vec = ArkElementMotion.vectorFor(entry.direction);
    var base = getComputedStyle(element).transform;
    function offsetTransform(sign) {
      var ox = vec[0] * entry.distance * sign, oy = vec[1] * entry.distance * sign;
      return 'translate3d(' + ox + 'px,' + oy + 'px,0)' + (base === 'none' ? '' : ' ' + base);
    }
    try {
      var exit = element.animate([
        { opacity: getComputedStyle(element).opacity, transform: base },
        { opacity: 0, transform: offsetTransform(-1) }
      ], { duration: entry.duration, delay: 0, easing: entry.easing, fill: 'both' });
      Promise.resolve(exit.finished ? exit.finished.catch(function () {}) : null).then(function () {
        try { element.animate([
          { opacity: 0, transform: offsetTransform(1) },
          { opacity: 1, transform: base }
        ], { duration: entry.duration, delay: entry.delay, easing: entry.easing, fill: 'both' }); } catch (e) {}
      });
    } catch (e) {}
  }
  /* Site-wide settings-gear defaults (js/content/settings-defaults.js) inside the editor's
     preview: an unsaved edit, or a past version shown from the Versions panel. The settings
     panel (scripts/settings-entry.js -> js/settings/panel.js) reads them once at load, so after
     re-defining them this fires 'ark-site-defaults-preview' and the panel re-applies them as an
     unconfigured visitor lands on them, writing nothing to localStorage. */
  function cmsPreviewSiteDefaults(value) {
    if (!window.ArkSiteDefaults || !value || typeof value !== 'object') return;
    ArkSiteDefaults.define(value);
    try { window.dispatchEvent(new CustomEvent('ark-site-defaults-preview', { detail: ArkSiteDefaults.get() })); }
    catch (error) { if (window.console) console.error('[ark] settings defaults preview failed', error); }
  }
  /* named so a state held back during an inline edit can be applied once it ends (cmsEndInline) */
  function cmsOnMessage(event) {
    if (event.origin !== location.origin) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    /* A new site while words are being typed would rebuild the element under the caret: hold the
       latest one until the edit ends. The editor answers the final edit with a newer state anyway. */
    if (data.type === 'defxn-cms-preview-state' && cmsInline && event.source === window.parent && cmsPreviewQuery) { cmsInline.pending = event; return; }
    if (data.type === 'defxn-cms-preview-state') cmsCopyIndexCache = null;   /* new drafts: new words to bind */
    if (data.type === 'defxn-cms-preview-lens' && event.source === window.parent && cmsPreviewQuery) { cmsSetLens(data.lens); return; }
    if (data.type === 'defxn-cms-preview-site-defaults' && event.source === window.parent && cmsPreviewQuery) { cmsPreviewSiteDefaults(data.settingsDefaults); return; }
    if (data.type === 'flux-chain-preview-theme' && data.theme) {
      if (!window.ArkTheme) return;
      /* editor preview only: show the theme whose colours are being edited (on the public page
         js/settings/panel.js alone owns data-theme -- see the note at the top of this file's boot) */
      if (data.theme.activeTheme) root.dataset.theme = data.theme.activeTheme;
      ArkUI.base(ArkTheme.css(data.theme));
      if (data.theme.background) applyBackground(data.theme.background);
      return;
    }
    if (data.type === 'defxn-cms-preview-mode' && event.source === window.parent && cmsPreviewQuery) {
      cmsPreviewEdit = data.mode !== 'live';
      if (!cmsPreviewEdit) { cmsEndInline(true); cmsHover(null); cmsPreviewSelected = null; cmsPreviewSelections = []; } placeCmsLayoutUi();
      return;
    }
    /* The Layers panel's eye icon targets a tree row, which is usually not whatever is
       currently selected -- data.key routes to setCmsLayoutFrameForKey (an explicit element,
       same ArkLayout.set() mechanism) instead of setCmsLayoutFrame (which always acts on
       cmsPreviewSelected, exactly as every Frame/Fill accordion control already relies on). */
    if (data.type === 'defxn-cms-preview-layout-command' && event.source === window.parent && cmsPreviewQuery && data.frame) {
      if (data.key) setCmsLayoutFrameForKey(data.key, data.frame, true); else setCmsLayoutFrame(data.frame, true);
      return;
    }
    if (data.type === 'defxn-cms-preview-layout-operation' && event.source === window.parent && cmsPreviewQuery) {
      if (data.operation === 'group') cmsGroupSelection();
      else if (data.operation === 'ungroup') cmsUngroupSelection();
      else if (data.operation === 'distribute-horizontal') cmsDistribute('horizontal');
      else if (data.operation === 'distribute-vertical') cmsDistribute('vertical');
      else cmsAlign(data.operation); return;
    }
    if (data.type === 'defxn-cms-preview-layout-undo' && event.source === window.parent && cmsPreviewQuery) { cmsUndoLayout(); return; }
    if (data.type === 'defxn-cms-preview-layout-redo' && event.source === window.parent && cmsPreviewQuery) { cmsRedoLayout(); return; }
    if (data.type === 'defxn-cms-preview-components-command' && event.source === window.parent && cmsPreviewQuery) { cmsComponentsCommand(data); return; }
    if (data.type === 'defxn-cms-preview-states-command' && event.source === window.parent && cmsPreviewQuery) { cmsStatesCommand(data); return; }
    if (data.type === 'defxn-cms-preview-canvas-transitions-command' && event.source === window.parent && cmsPreviewQuery) { cmsCanvasTransitionsCommand(data); return; }
    if (data.type === 'defxn-cms-preview-canvas-transitions-preview' && event.source === window.parent && cmsPreviewQuery) { cmsCanvasTransitionsPreview(); return; }
    if (data.type === 'defxn-cms-preview-element-motion-command' && event.source === window.parent && cmsPreviewQuery) { cmsElementMotionCommand(data); return; }
    if (data.type === 'defxn-cms-preview-element-motion-preview' && event.source === window.parent && cmsPreviewQuery) { cmsElementMotionPreview(data && data.key); return; }
    /* Forwarded from the editor's (js/admin/admin.js) own keydown handler for the one case where
       that parent document, not this iframe, actually holds keyboard focus (e.g.
       right after clicking a "Groups on this page" row in the sidebar, which is a parent-
       document button) -- see the keydown listener below for the normal case, where focus
       already lives here and this message is never sent. */
    if (data.type === 'defxn-cms-preview-remove-selection' && event.source === window.parent && cmsPreviewQuery) { cmsRemoveSelection(); return; }
    /* the editor was clicked while this document's right-click menu was open: close it (see setCmsContextMenuOpen) */
    if (data.type === 'defxn-cms-preview-close-menu' && event.source === window.parent && cmsPreviewQuery) { setCmsContextMenuOpen(false); return; }
    /* the editor toolbar's own "Make into component" button, and the Library's point picker hovering a point */
    if (data.type === 'defxn-cms-preview-make-component' && event.source === window.parent && cmsPreviewQuery) { cmsMakeComponent(); return; }
    /* a command chosen from the toolbar's More menu: the same list the right-click menu draws */
    if (data.type === 'defxn-cms-preview-selection-command' && event.source === window.parent && cmsPreviewQuery) { cmsRunSelectionCommand(String(data.id || '')); return; }
    if (data.type === 'defxn-cms-preview-highlight-point' && event.source === window.parent && cmsPreviewQuery) { cmsHighlightPoint(data.id || ''); return; }
    /* Select-by-id (an existing layout group) and select-by-key (any annotated element, the
       Layers panel row click -- Part B) are close enough in shape to share one handler: both
       just resolve a target element and select it, the only difference is how the target is
       found. A sibling message type would just duplicate this whole body for one line of
       difference. */
    if (data.type === 'defxn-cms-preview-select-group' && event.source === window.parent && cmsPreviewQuery && (data.id || data.key)) {
      var targetEl = data.key ? cmsElementForKey(data.key) : host.querySelector('[data-ark-layout-group="' + data.id + '"]');
      if (!targetEl) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: data.key ? 'That element is not on the current page.' : 'That group is not on the current page.' }, location.origin); return; }
      cmsPreviewSelected = targetEl; cmsPreviewSelections = [targetEl];
      placeCmsLayoutUi(); emitCmsLayoutSelection(); return;
    }
    /* Rename a Layers panel row (Part B): writes through ArkLayout.setLabel the same way
       every other layout draft mutation does (snapshot first, for undo/redo), then relays
       the updated tree right away -- a label edit must feel instant, not wait for the next
       unrelated selection change to refresh the panel. */
    if (data.type === 'defxn-cms-preview-set-label' && event.source === window.parent && cmsPreviewQuery && data.key != null && window.ArkLayout) {
      var labelElement = cmsElementForKey(data.key), labelRoute = labelElement ? cmsScopeOf(labelElement) : (data.route || cmsRoutePath());
      cmsSnapshotLayout();
      cmsLayoutDraft = ArkLayout.setLabel(cmsLayoutDraft, labelRoute, data.key, data.label);
      window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { route: labelRoute, key: data.key, operation: 'set-label', label: data.label },
        selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), commands: cmsSelectionCommandList(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
      return;
    }
    /* A plain image's alt text (ArkLayout.setAlt): same snapshot-then-mutate shape as
       set-label above, plus the attribute applied to the live element at once, so the
       preview's DOM is what the public page will render after Save. */
    if (data.type === 'defxn-cms-preview-set-alt' && event.source === window.parent && cmsPreviewQuery && data.key != null && window.ArkLayout) {
      var altElement = cmsElementForKey(data.key), altRoute = altElement ? cmsScopeOf(altElement) : (data.route || cmsRoutePath());
      cmsSnapshotLayout();
      cmsLayoutDraft = ArkLayout.setAlt(cmsLayoutDraft, altRoute, data.key, data.alt);
      if (altElement) ArkLayout.applyAlt(altElement, ArkLayout.altFor(cmsLayoutDraft, cmsRoutePath(), data.key, altElement));
      window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { route: altRoute, key: data.key, operation: 'set-alt', alt: data.alt },
        selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), commands: cmsSelectionCommandList(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
      return;
    }
    if (data.type === 'defxn-cms-preview-layout-reset' && event.source === window.parent && cmsPreviewQuery && cmsPreviewSelected && window.ArkLayout) {
      var resetInfo = cmsSelectionInfo(cmsPreviewSelected), reset = { route: resetInfo.route, key: resetInfo.key, breakpoint: data.breakpoint || resetInfo.breakpoint, reset: true };
      cmsSnapshotLayout();
      cmsLayoutDraft = ArkLayout.remove(cmsLayoutDraft, reset.route, reset.key, reset.breakpoint); ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft); placeCmsLayoutUi();
      window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: reset, selection: cmsSelectionInfo(cmsPreviewSelected), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin); return;
    }
    /* The complete CMS preview is deliberately accepted only inside an iframe
       opened with a preview query. It replaces the in-memory registries with
       unsaved drafts, then remounts the real route module. The same HTML, CSS,
       components and runtime therefore render here as on the deployed site. */
    if (data.type !== 'defxn-cms-preview-state' || !data.site || event.source !== window.parent ||
        !cmsPreviewQuery) return;
    var site = data.site;
    try {
      if (window.ArkManifest && Array.isArray(site.manifests)) site.manifests.forEach(function (manifest) { ArkManifest.define(manifest); });
      if (window.LearningContent && Array.isArray(site.articles)) {
        LearningContent.define(site.articles);
        site.articles.forEach(function (article) { if (article.sections) LearningContent.load(article.slug, article); });
      }
      if (window.ArkAsset && Array.isArray(site.assets)) site.assets.forEach(function (asset) { ArkAsset.define(asset); });
      if (window.ArkMeshSettings && site.meshSettings) ArkMeshSettings.define(site.meshSettings);
      if (window.ArkTheme && site.theme) {
        ArkTheme.define(site.theme);
        /* layered on purpose: the edited theme first, then the settings defaults below re-assert
           the visitor's palette exactly as the public page decides it (js/settings/panel.js) */
        if (site.theme.activeTheme) root.dataset.theme = site.theme.activeTheme;
        ArkUI.base(ArkTheme.css(site.theme));
        if (site.theme.background) applyBackground(site.theme.background);
      }
      /* after the theme, as on the public page, where the settings panel runs after this file */
      if (site.settingsDefaults) cmsPreviewSiteDefaults(site.settingsDefaults);
      if (window.ArkSEO && site.seo) ArkSEO.define(site.seo);
      if (window.ArkLayout && site.layout) { cmsLayoutDraft = ArkLayout.define(site.layout); }
      if (window.ArkComponents && site.components) { cmsComponentsDraft = ArkComponents.define(site.components); }
      if (window.ArkStates && site.states) { cmsStatesDraft = ArkStates.define(site.states); }
      if (window.ArkCanvasTransitions && site.canvasTransitions) { cmsCanvasTransitionsDraft = ArkCanvasTransitions.define(site.canvasTransitions); }
      if (window.ArkElementMotion && site.elementMotion) { cmsElementMotionDraft = ArkElementMotion.define(site.elementMotion); }
      if (window.ArkSEO && ArkUI.pageCatalog) Object.keys(ArkUI.pageCatalog).forEach(function (key) {
        var entry = ArkUI.pageCatalog[key];
        if (!entry.cmsFallbackTitle) entry.cmsFallbackTitle = String(entry.title || key).replace(/\s+[—-]\s+(?:DEFXN|Flux Protocol).*$/, '');
        if (entry.seoArticle) {
          var article = LearningContent.find(entry.seoArticle);
          entry.title = ArkSEO.articleTitle(entry.seoArticle, article ? article.title : entry.cmsFallbackTitle);
        } else if (entry.seoId) {
          var manifest = ArkManifest.get(entry.seoId);
          entry.title = ArkSEO.pageTitle(entry.seoId, manifest ? manifest.title : entry.cmsFallbackTitle);
        }
      });
      /* A page or article that exists only as a draft has a route now: derived from the drafts
         exactly as js/pages/catalog.js derives a saved one. Until 2026-10-19 the router knew only
         the saved files' routes, so a new page fell back to Home on the canvas while the editor
         named the new page (docs/ux-audit/cms.md P0-1; regression: tests/cms-draft-routes.cjs). */
      var draftRoutes = ArkUI.catalogContentRoutes ? ArkUI.catalogContentRoutes(
        (site.articles || []).filter(function (a) { return a && a.slug && !ArkUI.pageCatalog['article/' + a.slug]; }),
        (site.manifests || []).filter(function (m) { return m && m.group === 'theory' && m.route && !ArkUI.pageCatalog['concept/' + m.id]; })) : [];
      /* ...and the scene state every routed page needs (the router refuses a page without it) */
      if (draftRoutes.length && ArkUI.sceneState && ArkUI.sceneState.addPages) ArkUI.sceneState.addPages(draftRoutes);
      /* the selection as it is BEFORE the remount rebuilds it (cmsSelectionRefs) */
      var keptRefs = cmsSelectionRefs();
      /* The route the editor asked for (data.route) became routable with THIS message: this
         document fell back from it at load, so it navigates there now. Only then -- any other
         route is the editor's to change (it re-points the frame). */
      var draftTarget = ArkUI.pageRouter && typeof data.route === 'string' ? ArkUI.pageRouter.resolve(data.route) : '';
      var openDraft = draftTarget && draftRoutes.indexOf(draftTarget) >= 0 && draftTarget !== ArkUI.pageRouter.active;
      /* in place: a draft re-sent for the route this document shows is not a navigation (a route
         change loads a new document), so it never plays the route-change transition -- that
         flashed the canvas blank on every edit (regression: tests/page-router-refresh-in-place.cjs) */
      var refreshed = openDraft ? ArkUI.pageRouter.navigate(draftTarget, { history: 'replace' })
        : ArkUI.pageRouter && ArkUI.pageRouter.refresh ? ArkUI.pageRouter.refresh({ inPlace: true }) : Promise.resolve();
      Promise.resolve(refreshed).then(function () {
        annotateCmsPreviewCopy(site.manifests);
        if (window.ArkLayout) ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
        if (window.ArkComponents) ArkComponents.renderAll(host, cmsRoutePath(), cmsComponentsDraft);
        if (window.ArkStates) ArkStates.renderAll(host, cmsRoutePath(), cmsStatesView(cmsRoutePath()), cmsComponentsDraft);
        var reselected = cmsRestoreSelection(keptRefs);
        placeCmsLayoutUi();
        var ready = { type: 'defxn-cms-preview-ready', path: ArkUI.route.path(), groups: cmsGroupList(), points: cmsInsertionPoints(), showing: cmsStatesShowingFor(cmsRoutePath()), tree: cmsRealTree(host, cmsRoutePath()) };
        /* the selection as it is AFTER the remount (possibly none), so Studio's toolbar never edits a destroyed one */
        /* sameSelection: every selected element was found again. Its layout key can still differ
           (a remount renumbers the route's containers: path:div:1/div:2/... became div:7), so
           Studio is told it is the same selection rather than left to compare keys */
        if (reselected) { ready.selection = cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected); ready.selections = cmsSelectionPayload(); ready.commands = cmsSelectionCommandList(); ready.sameSelection = cmsPreviewSelections.length === keptRefs.length; ready.content = cmsPreviewSelected ? cmsContentInfo(cmsPreviewSelected) : null; }
        window.parent.postMessage(ready, location.origin);
      }).catch(function (error) {
        window.parent.postMessage({ type: 'defxn-cms-preview-error', message: error.message }, location.origin);
        if (window.console) console.error('[ark] CMS preview refresh failed', error);
      });
    } catch (error) {
      window.parent.postMessage({ type: 'defxn-cms-preview-error', message: error.message }, location.origin);
      if (window.console) console.error('[ark] CMS preview state failed', error);
    }
  }
  window.addEventListener('message', cmsOnMessage);
  cmsInstallContentLens();
  /* In edit mode the exact public DOM remains visible and scrollable, but a
     click selects the manifest-backed element instead of following its link.
     Live mode removes this interception and behaves exactly like the site. */
  /* A grouped element keeps its own data-ark-layout-key, so a plain closest() lookup always
     resolves to the innermost clicked child, never the group wrapper around it -- so a click
     anywhere inside a just-created group silently re-selected a single member, and dragging
     from that point moved only that member instead of the whole group. Resolve a raw pick up
     to its nearest enclosing group, the same "select the frame first, click again to drill
     in" rule design tools use for groups:
     stay drilled in only while the current selection is already that same group or something
     inside it. */
  function cmsGroupRootOf(element) {
    for (var node = element; node && node !== host; node = node.parentNode) if (node.hasAttribute && node.hasAttribute('data-ark-layout-group')) return node;
    return null;
  }
  /* A click anywhere inside a reusable-component instance (e.g. the paragraph inside a quote
     block, or a heading inside a text block) must select the instance's own root, the thing
     Studio's override panel actually edits -- never a structural child key of no interest on
     its own. Same "select the frame first" escalation cmsGroupRootOf/cmsResolvePick already
     use for a just-created layout group, applied a second time for component instances. */
  function cmsComponentRootOf(element) {
    for (var node = element; node && node !== host; node = node.parentNode) if (node.hasAttribute && node.hasAttribute('data-ark-component-key')) return node;
    return null;
  }
  /* "Delete" in connected mode (Part A of the follow-up Studio plan) can never mean
     destroying arbitrary hand-written real page content -- there is no such concept, and
     never will be: it's hardcoded in the page module's JS. It means exactly one of three
     things, reusing cmsComponentRootOf/cmsGroupRootOf above rather than re-deriving the same
     two checks differently: a component instance is removed for real (the SAME path the
     inspector's own "Remove instance" button already uses -- cmsComponentsCommand's
     'remove-instance' action); a layout group is ungrouped (its real children were always
     real content, so "deleting" a group can only ever mean "stop grouping them," never
     destroy them -- the SAME cmsUngroupSelection() the right-click menu's own "Ungroup" entry
     already calls); anything else gets a notice explaining it can't be deleted, only hidden
     (Part B's eye icon, not built yet -- referenced by name only). */
  function cmsRemoveSelection() {
    var element = cmsPreviewSelected;
    if (!element) return;
    var compRoot = cmsComponentRootOf(element);
    if (compRoot) {
      cmsComponentsCommand({ action: 'remove-instance', route: cmsRoutePath(), anchorId: compRoot.getAttribute('data-ark-component-anchor'), key: compRoot.getAttribute('data-ark-component-key') });
      cmsPreviewSelected = null; cmsPreviewSelections = []; placeCmsLayoutUi();
      /* cmsComponentsCommand already relays the updated components draft up; the selection
         itself (now gone) also needs clearing in Studio -- reuse the existing '-select'
         message shape with a null selection instead of inventing a second message type. */
      window.parent.postMessage({ type: 'defxn-cms-preview-select', keys: [], selection: null, selections: [], groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
      return;
    }
    var groupRoot = cmsGroupRootOf(element);
    if (groupRoot) { cmsPreviewSelected = groupRoot; cmsUngroupSelection(); return; }
    window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'This is real page content — it can’t be deleted here. Hide it from the Layers panel instead (coming soon).' }, location.origin);
  }
  function cmsResolvePick(target) {
    var root = cmsGroupRootOf(target);
    var resolved = (!root || root === target) ? target : ((cmsPreviewSelected && root.contains(cmsPreviewSelected)) ? target : root);
    var compRoot = cmsComponentRootOf(resolved);
    if (!compRoot || compRoot === resolved) return resolved;
    return (cmsPreviewSelected && compRoot.contains(cmsPreviewSelected)) ? resolved : compRoot;
  }
  /* A press on a CLOSED tab opens it and selects it (the owner's follow-up, 2026-10-20: a page's other
     views were reachable only through Layers or Preview, because this listener ate every click -- the
     home's first view since "Where do I start?" became the default). The click is passed on to the
     page's own tabs handler once, then the tab is selected like any element. A press on the OPEN tab
     is an ordinary selection (and, in the content lens, edits its label). Regression:
     tests/browser/canvas-tabs.mjs. */
  var cmsTabPass = null;
  function cmsOpenTab(event) {
    var tab = event.target && event.target.closest && event.target.closest('[role="tab"]');
    if (!tab || !host.contains(tab) || tab.getAttribute('aria-selected') !== 'false' || tab.disabled || tab.getAttribute('aria-disabled') === 'true') return false;
    event.preventDefault(); event.stopPropagation();
    cmsTabPass = tab;
    try { tab.click(); } finally { cmsTabPass = null; }
    var target = cmsResolvePick(tab.closest('[data-ark-layout-key]') || tab);
    cmsPreviewSelected = target; cmsPreviewSelections = [target];
    placeCmsLayoutUi(); emitCmsLayoutSelection();
    return true;
  }
  document.addEventListener('click', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit || window.parent === window) return;
    if (cmsTabPass && event.target === cmsTabPass) return;
    if (event.target && event.target.closest && event.target.closest('[data-ark-studio-ui]')) return;
    if (window.ArkLayout) ArkLayout.annotate(host);
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey && cmsOpenTab(event)) return;
    if (cmsPreviewLens === 'content' && !event.shiftKey && !event.metaKey && !event.ctrlKey && cmsContentClick(event)) return;
    var graphic = event.target && event.target.closest && event.target.closest('path,rect,circle,ellipse,line,polyline,polygon,svg,canvas,img,figure,picture,video');
    /* The last fallback, [data-ark-component-key], catches a click on a leaf that
       ArkLayout.annotate() never tags (RBLOCK_QUOTE_V1's <cite>, RBLOCK_DIVIDER_V1's bare
       <hr>) -- without it rawTarget is null there and the click silently selects nothing. */
    var rawTarget = graphic && graphic.hasAttribute('data-ark-layout-key') ? graphic : event.target && event.target.closest && (event.target.closest('[data-ark-copy-keys]') || event.target.closest('[data-ark-layout-key]') || event.target.closest('[data-ark-component-key]'));
    if (!rawTarget) return;
    var target = cmsResolvePick(rawTarget);
    event.preventDefault(); event.stopPropagation();
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      var at = cmsPreviewSelections.indexOf(target); if (at >= 0) cmsPreviewSelections.splice(at, 1); else cmsPreviewSelections.push(target);
      cmsPreviewSelected = cmsPreviewSelections[cmsPreviewSelections.length - 1] || null;
    } else { cmsPreviewSelected = target; cmsPreviewSelections = [target]; }
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }, true);
  /* Part E's real-visitor behavior: click-to-cycle a layered-state group. Deliberately
     UNCONDITIONAL -- no cmsPreviewQuery/cmsPreviewEdit/window.parent check -- unlike
     every CMS-editor listener above, since this has to run for every real visitor on
     the deployed site, not only inside Studio. A plain bubble-phase listener (no
     capture, no stopPropagation): while Studio is actively editing (cmsPreviewEdit
     true), the capture-phase selection listener above already calls
     event.stopPropagation() for any click on annotated content, which keeps this
     listener from ever firing during an actual edit session -- exactly like a real
     visitor never gets selection UI, an editor mid-edit never gets a surprise state
     advance. Studio's own "Live mode" toggle (cmsPreviewEdit=false) lets this through
     normally, so the click-to-cycle behavior can be tried from inside Studio too.
     CAPTURE phase, and it stops propagation once a trigger matched (regression:
     tests/states-trigger-click-capture.cjs). It used to be a bubble-phase listener with
     only preventDefault(), which runs AFTER every handler inside the page: the scene's
     own link handler (js/hero-motion.js, `[data-scene-link]`) had already navigated
     away by then, so a nav link chosen as the trigger -- the owner's own worked example,
     three nav buttons made into states -- changed the PAGE instead of the state, on the
     real public site as well as in Live preview. A capture listener on the document is
     not stopped by the editor's capture listener above (stopPropagation never stops
     other listeners on the same node), so edit mode is gated explicitly instead. */
  document.addEventListener('click', function (event) {
    if (!window.ArkStates) return;
    if (cmsPreviewQuery && cmsPreviewEdit && window.parent !== window) return;
    var route = cmsRoutePath(), view = cmsStatesView(route), groupId = ArkStates.findTriggerMatch(host, route, view, event.target);
    if (!groupId) return;
    event.preventDefault(); event.stopPropagation();
    /* advances what the group SHOWS, never the draft's saved default -- and tells the editor,
       whose "Showing" label otherwise kept naming the state from before the clicks
       (regression: tests/cms-states-preview-default.cjs) */
    cmsShowState(route, groupId, ArkStates.groupFor(ArkStates.advance(view, route, groupId), route, groupId).current);
  }, true);
  document.addEventListener('contextmenu', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit || window.parent === window) return;
    if (event.target && event.target.closest && event.target.closest('[data-ark-studio-ui]')) { if (!event.target.closest('.ark-studio-menu')) showCmsContextMenu(event); return; }
    if (window.ArkLayout) ArkLayout.annotate(host);
    var target = cmsPreviewSelections.find(function (element) { return element === event.target || element.contains(event.target); });
    if (!target) { var rawTarget = event.target && event.target.closest && event.target.closest('[data-ark-layout-key]'); target = rawTarget && cmsResolvePick(rawTarget); } if (!target) return;
    cmsContextTarget = target;
    if (!cmsPreviewSelections.length) { cmsPreviewSelected = target; cmsPreviewSelections = [target]; placeCmsLayoutUi(); emitCmsLayoutSelection(); }
    showCmsContextMenu(event);
  }, true);
  document.addEventListener('pointerdown', function (event) { if (cmsContextMenu && !(event.target && event.target.closest && event.target.closest('.ark-studio-menu'))) setCmsContextMenuOpen(false); }, true);
  /* A press on the canvas closes the editor's popovers (js/admin/overlay.js closeCanvas): told by
     the press itself, not inferred from the editor losing focus -- the canvas also takes focus on
     its own (a selection made from the Layers list), and that must not shut the More menu */
  document.addEventListener('pointerdown', function () { if (cmsPreviewQuery && window.parent !== window) window.parent.postMessage({ type: 'defxn-cms-preview-pointerdown' }, location.origin); }, true);
  document.addEventListener('pointerdown', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit || !cmsPreviewSelected || cmsPreviewLens === 'content') return;
    var handle = event.target && event.target.closest && event.target.closest('.ark-studio-handle');
    if (handle) { beginCmsLayoutAction(event, handle.dataset.dir); return; }
    if (event.target && event.target.closest && event.target.closest('.ark-studio-label')) { beginCmsLayoutAction(event, 'move'); return; }
    if (cmsPreviewSelected.contains(event.target)) beginCmsLayoutAction(event, 'move');
  }, true);
  window.addEventListener('pointermove', function (event) {
    if (!cmsLayoutAction) return;
    var a = cmsLayoutAction, dx = event.clientX - a.sx, dy = event.clientY - a.sy, f = Object.assign({}, a.frame), dir = a.dir;
    if (Math.hypot(dx, dy) < 5) return; a.moved = true; event.preventDefault();
    if (dir === 'move') {
      if (a.items) { a.items.forEach(function (item) { item.next = Object.assign({}, item.frame, { x: (item.frame.x || 0) + dx, y: (item.frame.y || 0) + dy }); setCmsElementFrame(item.element, item.next, false); }); placeCmsLayoutUi(); return; }
      f.x = a.frame.x + dx; f.y = a.frame.y + dy;
    }
    else {
      var left = dir.indexOf('w') >= 0, top = dir.indexOf('n') >= 0, width = Math.max(8, a.rect.width + (left ? -dx : dx)), height = Math.max(8, a.rect.height + (top ? -dy : dy));
      if (event.shiftKey) { var ratio = a.rect.width / Math.max(1, a.rect.height); if (width / height > ratio) height = width / ratio; else width = height * ratio; }
      f.width = width; f.height = height; if (left) f.x = a.frame.x + (a.rect.width - width); if (top) f.y = a.frame.y + (a.rect.height - height);
    }
    cmsLayoutFrame = f; setCmsLayoutFrame(f, false);
  }, true);
  window.addEventListener('pointerup', function () {
    if (!cmsLayoutAction) return; var action = cmsLayoutAction, moved = action.moved, frame = cmsLayoutFrame || action.frame; cmsLayoutAction = null; cmsLayoutFrame = null;
    if (moved && action.items) { cmsSnapshotLayout(); action.items.forEach(function (item) { setCmsElementFrame(item.element, item.next || item.frame, true); }); placeCmsLayoutUi(); emitCmsLayoutSelection(); }
    else if (moved) setCmsLayoutFrame(frame, true);
  }, true);
  window.addEventListener('resize', function () {
    if (window.ArkLayout) ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    /* Re-run right after ArkLayout.apply(), same ordering reason as the onMount rAF
       pair above: re-applying a stored display override would otherwise overwrite a
       hidden state-0 member's display:none on every resize. */
    if (window.ArkStates) ArkStates.renderAll(host, cmsRoutePath(), cmsStatesView(cmsRoutePath()), cmsComponentsDraft);
    placeCmsLayoutUi();
  });
  document.addEventListener('scroll', placeCmsLayoutUi, true);
  /* The header re-fits its row a frame after a change -- a state switch, a route's styles --
     and moves the links beside the one that left or rejoined it (js/resolvers/header.js
     fitHeaderRow). The outline and Studio's toolbar were placed before that move, so they were
     left 88px off the selected link (studio-flows statesui). Re-place both. */
  document.addEventListener('ark-header-refit', function () {
    if (!cmsPreviewQuery || !cmsSelectionList().length) return;
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  });
  /* Delete/Backspace for the canvas. A click inside this iframe (the document.addEventListener
     ('click', ...) handler above) moves keyboard focus into it, so THIS listener, not the
     parent's, is what normally receives the keystroke once a real element is selected; the
     'defxn-cms-preview-remove-selection' message above covers the one case where focus
     stayed in the parent instead. Guarded the same way showCmsContextMenu's own trigger
     already is (cmsPreviewEdit), and never while the user is typing in a field, mirroring
     the editor's own `typing` check in its keydown handler (js/admin/admin.js). */
  /* The same listener forwards Ctrl/Cmd+S from inside the canvas. Any click on the canvas moves keyboard focus into
     THIS document, so the editor's own Ctrl/Cmd+S listener (js/admin/admin.js) never heard
     the shortcut: after editing on the canvas -- the normal case -- the save shortcut did
     nothing (or opened the browser's own Save Page dialog). Forward it to the editor, the
     one place that knows every unsaved draft (regression: tests/cms-save-shortcut-from-canvas.cjs). */
  function cmsForwardSaveShortcut(event) {
    if (!(event.metaKey || event.ctrlKey) || String(event.key).toLowerCase() !== 's' || window.parent === window) return false;
    event.preventDefault(); window.parent.postMessage({ type: 'defxn-cms-preview-save' }, location.origin); return true;
  }
  /* Ctrl/Cmd+Z (Shift: redo) with focus in the canvas -- after an inline edit it always is: the
     canvas history, the same one the header's undo/redo buttons drive. While typing, the
     browser's own undo (the keydown listener below asks only when nothing is being typed). */
  /* Forwarded, not handled here: the editor holds the ONE history (text typed in its forms
     interleaved with this canvas's edits, js/admin/history.js), so the key asks it, and it asks
     this document back when the edit to undo is one of the canvas's. */
  function cmsCanvasUndoKey(event) {
    var key = String(event.key).toLowerCase();
    if (!(event.metaKey || event.ctrlKey) || (key !== 'z' && key !== 'y')) return false;
    event.preventDefault();
    if (window.parent !== window) window.parent.postMessage({ type: 'defxn-cms-preview-undo-key', redo: key === 'y' || event.shiftKey }, location.origin);
    else if (key === 'y' || event.shiftKey) cmsRedoLayout(); else cmsUndoLayout();
    return true;
  }
  document.addEventListener('keydown', function (event) {
    if (!cmsPreviewQuery || cmsForwardSaveShortcut(event) || cmsContextMenuKey(event)) return;
    if (!cmsPreviewEdit) return;
    var active = document.activeElement, tag = (active && active.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (active && active.isContentEditable);
    if (!typing && cmsCanvasUndoKey(event)) return;
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (typing) return;
    if (!cmsPreviewSelected) return;
    event.preventDefault();
    cmsRemoveSelection();
  });
})();
