'use strict';
/* run-tests-timeout-ms: 300000 -- one boot plus every route measured 4.7-7.0 s wall (5.5-6.8 s
   CPU) on the owner's Apple M2 Mac mini (8 cores, 8 GB) at load average 6-12 from other agents,
   2026-10-19; tests/ssr-render.cjs measured the same boot running up to 30x its CPU time at peak
   load, so 120 s (the runner's default) is not a safe guard and 300 s is. */
/* Exercise real route modules and their copy, not only mocked loader results.

   Every route in the live ArkUI.pageCatalog is mounted from its real module, in real jsdom, inside
   the real site: api/lib/render-core.mjs boots index.html once (the same render path
   api/render.mjs runs for a crawler and tests/ssr-*.cjs use), and each route's scripts are then
   loaded by the site's own loader, ArkUI.loadPage (js/ark/page-loader.js) -- so a page built from
   Ark blocks gets ArkUI.blockScripts exactly as a visitor's browser would, from the catalog entry
   or from a saved ARK_BLOCK_* instance.

   Named regressions it holds:
   - A hand-written toy DOM (createElement/createTextNode, with ad-hoc querySelector cases such
     as '.ark-hero-body') stood in for the browser here until 2026-10-19. The first page converted
     to Ark blocks broke it ("resolutions: a.createDocumentFragment is not a function"): the
     blocks use the real DOM API. Its querySelectorAll() always returned [], so the "no state
     anchor is created" check below could never fail, and its addEventListener kept only the
     LAST listener per event, so a page's other listeners never ran. Never reintroduce a fake DOM
     here: Wave 3 converts many more pages to blocks.
   - The toy's `location` had no protocol, which is js/ark/route.js's hash mode (a page opened from
     disk), so every in-site href was expected as '#/path'. Visitors are served over https, where
     routes are clean paths; this runs at https://defxn.com, the mode people get. Comparing
     resolved hrefs (what the link opens) is what found js/studio.js writing '#' + path.
   - The toy could not parse innerHTML, so pages authored as markup strings (js/pages/lab.js)
     answered every querySelector with a placeholder and showed no links at all: their links
     were never checked.
   - Every page-specific section below runs only when its route is in the catalog with the shape
     it checks. A page restructured so its section's selector no longer matches would silently
     drop those checks; the tally at the end requires each section to have run for every route
     the catalog derives for it, so coverage cannot shrink unnoticed.
   - jsdom's resource loader answers a missing file with an empty 200 (render-core
     createLocalResources, so a missing webfont degrades as in a browser). A route whose script
     is missing would load as empty here, so every .js the loader fetches is checked on disk.
   - The real loader resolves a script's load even when the script throws (a browser reports the
     error on window, not on the <script>); errors are collected per route and fail it.

   Owner test law: run alone, never alongside another suite. The result line prints its own cost. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'https://defxn.com';
/* A boot that has not finished in this long is stalled, not slow (tests/ssr-render.cjs's
   STALL_DEADLINE_MS records the measurements behind the same number). */
const STALL_DEADLINE_MS = 60000;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

(async () => {
  const started = process.hrtime.bigint();
  const cpuStart = process.cpuUsage();
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const { requestInterceptor } = (await import('jsdom')).default;

  /* Every same-origin .js the window fetches, in order; the interceptor returns nothing, so the
     request continues to render-core's own local-file interceptor. */
  const fetchedScripts = [];
  const resources = createLocalResources(ROOT);
  resources.interceptors.unshift(requestInterceptor((request) => {
    let url;
    try { url = new URL(request.url); } catch { return undefined; }
    if (url.origin === HOST && url.pathname.endsWith('.js')) fetchedScripts.push(decodeURIComponent(url.pathname).replace(/^\//, ''));
    return undefined;
  }));

  const productionScripts = [...read('index.html').matchAll(/<script src="([^"?]+)(?:\?[^"]*)?" defer><\/script>/g)].map((match) => match[1]);
  const routeBoot = productionScripts.filter((file) => ['js/pages/catalog.js', 'js/ark/scene-state.js'].includes(file));
  assert.deepEqual(routeBoot, ['js/pages/catalog.js', 'js/ark/scene-state.js'], 'catalog must exist before scene state snapshots its routes');
  // /experiments and /experiments/lab merged (2026-10-19): one page, one h1; the old intro's question is the lab's own study title.
  assert(!fs.existsSync(path.join(ROOT, 'js/resolvers/experiment.js')) && !fs.existsSync(path.join(ROOT, 'js/pages/experiments.js')), 'the duplicate experiment entry page is gone, merged into the lab');
  assert(read('js/pages/lab.js').includes('How can threshold agreement be pictured?'), 'the old intro question survives in the lab');
  /* the lab is a page of Ark blocks since 2026-10-19 (W3-GUIDE): its h1 is the hero's, given the old id */
  // the hero title names the page as the menu does, and stays (first-visit audit 2026-10-22: it was "Explore three protocol concepts." and then each study's question)
  assert(/block: 'hero', id: 'lab-hero'[^\n]*title: 'Interactive model: authority, lifecycle and networks'/.test(read('js/pages/lab.js')) && read('js/pages/lab.js').includes("titleId: 'experiments-title'"), 'interactive model has a primary heading');

  const summary = await inspectDocument({ html: await readIndexHtml(ROOT), url: HOST + '/', resources, root: ROOT, timeoutMs: STALL_DEADLINE_MS }, async (window) => {
    const { document, ArkUI, ArkCopy, ArkStates, ArkCanvasTransitions, ArkElementMotion } = window;
    const route = ArkUI.route;
    let current = '(boot)';
    const errors = [];
    window.addEventListener('error', (event) => { errors.push({ route: current, error: event.error || event.message }); });
    function assertNoErrors(stage) {
      const mine = errors.splice(0);
      if (mine.length) throw new Error(`${current}: ${stage} raised ${mine.length} error(s) in the window; first (during ${mine[0].route}): ${mine[0].error && mine[0].error.stack || mine[0].error}`, { cause: mine[0].error });
    }
    /* A page-specific section's anchor is missing: say which one and what to do, not "null". */
    const childrenOf = (root, selector) => {
      const node = root.querySelector(selector);
      assert(node, `${current}: the page has no ${selector}, which this route's checks drive. If the page was restructured (e.g. converted to Ark blocks), carry these checks over to its new structure in tests/routes-live.cjs; never delete them.`);
      return [...node.children];
    };
    /* `inert` is not an IDL attribute in jsdom: a page that sets the property gets an expando, one
       that sets the attribute gets no property. A browser reflects both, so either counts. */
    const isInert = (node) => node.inert === true || node.hasAttribute('inert');
    const pointer = (node, type) => node.dispatchEvent(new window.PointerEvent(type, { bubbles: false }));
    const resolved = (href) => new window.URL(href, window.location.href).href;

    // The real baked default is a genuine, subtle, always-on transition -- never "disabled" --
    // since no page-background transition existed before this module to stay byte-identical to.
    assert(ArkCanvasTransitions.get().outDuration > 0 && ArkCanvasTransitions.get().inDuration > 0, 'the baked canvas-transitions-data.js default is a real transition, not 0ms/disabled');
    /* Part H's bar is the STRICT one Parts A-E used (byte-identical to today's existing behavior):
       element-motion sits inside ArkUI.createPresence's EXISTING per-item stagger
       (js/ark/scene-state.js) and must leave it untouched by default. The override-vs-default
       proof with a staggered list lives in tests/element-motion-presence.cjs; this proves, for
       every real route, the formal guarantee that keeps that branch unreachable: the baked
       element-motion-data.js stores zero routes, so entryFor() is null for any real key. */
    assert.equal(JSON.stringify(ArkElementMotion.get().routes), '{}', 'the baked element-motion-data.js default has zero stored routes -- no element on any real page has an override today');
    assert.equal(ArkElementMotion.entryFor(ArkElementMotion.get(), '/', 'copy:home.TITLE'), null, 'entryFor() returns null, never a default-filled entry, when nothing is stored for a route+key -- this is what keeps createPresence\'s override branch inert by default');

    for (const key of Object.keys(ArkUI.pageCatalog)) {
      assert(ArkUI.sceneState.pages[key], `${key}: route is missing scene state`);
      assert.doesNotThrow(() => ArkUI.sceneState.navigate(key), `${key}: route cannot activate`);
    }
    assertNoErrors('scene state navigation');

    const ran = { lifecycle: [], deployment: [], how: [], download: [], deploy: [], mechanism: [] };
    let linkCount = 0, copyKeyCount = 0, blockRoutes = 0;
    /* One route: load its scripts, mount it, exercise it, dispose of it. Throws at its first
       failed check. */
    async function exerciseRoute(key, entry) {
      window.history.replaceState(null, '', route.href(entry.path)); // the route's own address, as the router leaves it
      for (const file of entry.scripts) assert(fs.existsSync(path.join(ROOT, file)), `${key}: missing ${file}`);
      const fetchedBefore = fetchedScripts.length;
      let module;
      try { module = await ArkUI.loadPage(key, entry); }
      catch (error) { throw new Error(`${key}: the page loader failed: ${error.message}`, { cause: error }); }
      const missing = fetchedScripts.slice(fetchedBefore).filter((file) => !fs.existsSync(path.join(ROOT, file)));
      assert.deepEqual(missing, [], `${key}: the loader fetched scripts that do not exist (jsdom would have run them as empty files)`);
      assertNoErrors('loading its scripts');
      assert(module, `${key}: missing ${entry.module} module`);
      assert.equal(module, ArkUI.pageModules[entry.module], `${key}: the loader returned a module other than ${entry.module}`);
      if (ArkUI.pageNeedsBlocks(entry) || entry.scripts.includes('js/ark/blocks.js')) {
        blockRoutes++;
        assert(ArkUI.blocks && typeof ArkUI.blocks.render === 'function', `${key}: a route that renders Ark blocks mounted without the block adapter`);
      }

      const host = document.createElement('div');
      let page;
      try { if (module.prepare) await module.prepare(key, {}); page = module.mount(host, key); }
      catch (error) { throw new Error(`${key}: ${error.message}`, { cause: error }); }
      assertNoErrors('mounting');
      assert(page instanceof window.Element, `${key}: mount did not return a page`);
      assert.equal(host.children.length, 1, `${key}: mount did not attach one page`);
      assert.equal(page.querySelectorAll('[data-ark-block-refused]').length, 0, `${key}: an Ark block on this page rendered its refusal callout instead of the block`);
      /* Copy keys the page stamped for the Content lens (data-ark-copy-keys) must each name a field
         a manifest defines, or the lens would bind the words to nothing. */
      for (const node of [page, ...page.querySelectorAll('[data-ark-copy-keys]')]) {
        for (const copyKey of String(node.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean)) {
          assert(ArkCopy.has(copyKey), `${key}: an element is bound to copy key ${copyKey}, which no manifest defines`);
          copyKeyCount++;
        }
      }
      /* General component system (Part 3): every non-home page module declares at least one
         [data-ark-insert] anchor for reusable blocks (js/content/components.js). Rendering into
         it is centralized in js/main.js's onMount hook, not called from mount() itself here, so
         this only checks the anchor markup exists and starts genuinely empty -- no placeholder
         text authored into it, since the saved components file starts empty by default and a
         page must still read right with zero components inserted. home/zero keeps its own,
         already-rich hero system and is explicitly excluded from this rollout. */
      if (key !== 'zero') {
        const anchor = page.querySelector('[data-ark-insert]');
        assert(anchor, `${key}: page module has no [data-ark-insert] anchor for reusable components`);
        assert.equal(anchor.textContent, '', `${key}: the component anchor must start empty, never placeholder/empty-state text`);
      }
      /* Layered states (Part E): the saved states-data.js starts empty (no groups on any route),
         the real default today. ArkStates.renderAll must be a true no-op against that default --
         zero observable difference versus a page that never knew this feature existed. */
      assert.doesNotThrow(() => ArkStates.renderAll(page, entry.path, ArkStates.get()), `${key}: ArkStates.renderAll must not throw for a page with no saved state groups`);
      assert.equal(host.children.length, 1, `${key}: ArkStates.renderAll must not add/remove/replace the mounted page itself`);
      assert.equal(page.querySelectorAll('[data-ark-state-anchor]').length, 0, `${key}: no state anchor is created when the route has no saved state groups`);
      if (key !== 'zero') assert.equal(page.querySelector('[data-ark-insert]').textContent, '', `${key}: the component anchor is still untouched by ArkStates with no saved state groups`);
      /* Background in/out transition (Part G): no page-background transition existed before this
         module, so the bar is "doesn't throw, doesn't break anything already asserted about this
         mounted page". js/ark/page-router.js's own navigate() sequencing is exercised in
         tests/page-router.cjs; this confirms the baked canvas-transitions-data.js default survives
         an apply() call against every real mounted page. */
      assert.doesNotThrow(() => ArkCanvasTransitions.apply(page, 'out'), `${key}: ArkCanvasTransitions.apply('out') must not throw against a real mounted page`);
      assert.doesNotThrow(() => ArkCanvasTransitions.apply(page, 'in'), `${key}: ArkCanvasTransitions.apply('in') must not throw against a real mounted page`);
      assert.equal(host.children.length, 1, `${key}: ArkCanvasTransitions.apply must not add/remove/replace the mounted page itself`);
      /* Per-element animation overrides (Part H): for THIS route, the baked default has no stored
         entry for any key -- the formal condition elementMotionOverride() (js/ark/scene-state.js)
         checks before it ever overrides createPresence's default per-item computation. */
      assert.equal(ArkElementMotion.entryFor(ArkElementMotion.get(), entry.path, 'copy:probe'), null, `${key}: no element-motion override exists for this route today -- createPresence's default stagger is untouched`);

      /* The story template (js/pages/story.js, 2026-10-19): the lifecycle, the agreement chapters,
         the mechanism sheets and "Deploy a resolver" share ONE depth control -- Ark tabs, The idea /
         How it works / Evidence, addressed as ?view=context / ?view=reference. `depth(page)` is
         that control's three tabs; `panel(page, i)` the view each one opens. */
      const depthTabs = (root) => {
        const tabs = root.querySelector('[data-story-depth]');
        assert(tabs, `${current}: the page has no story depth control ([data-story-depth]), which this route's checks drive. If the page was restructured, carry these checks over to its new structure in tests/routes-live.cjs; never delete them.`);
        const triggers = [...tabs.querySelectorAll('[data-ark-part="tabs-trigger"]')];
        assert.deepEqual(triggers.map((t) => t.textContent.trim()), ['The idea', 'Step by step', 'Evidence'], `${current}: one depth vocabulary on every story page` /* 'Step by step' since 2026-10-22: the header's 'How it works' names another page */);
        return triggers;
      };
      const panelOf = (root, i) => [...root.querySelector('[data-story-depth]').children].filter((n) => n.getAttribute('data-ark-part') === 'tabs-content')[i];
      /* A node's own words: a glossary term's tooltip (its definition) is not part of them. */
      const words = (node) => { let text = node.textContent; for (const tip of node.querySelectorAll('[data-ark-part="term-tip"]')) text = text.replace(tip.textContent, ''); return text.replace(/\s+/g, ' '); };
      const selected = (triggers) => triggers.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      if (entry.module === 'lifecycle') {
        ran.lifecycle.push(key);
        const stageId = key.split('/')[1];
        const controls = depthTabs(page);
        const boundary = page.querySelector('[data-ark-block="callout"][id$="-boundary"]');
        assert(boundary, `${key}: the boundary callout is on the page`);
        const boundaryText = boundary.textContent;
        assert.equal(selected(controls), 0, `${key}: starts with the idea`);
        controls[1].click();
        assert.equal(selected(controls), 1);
        assert(route.current().endsWith('view=context'), `${key}: the depth is in the address`);
        assert(!panelOf(page, 1).hidden && panelOf(page, 0).hidden, `${key}: one view at a time`);
        if (stageId) {
          const facts = ArkUI.lifecycleContent[stageId].facts;
          const triggers = [...panelOf(page, 1).querySelectorAll('[data-ark-part="accordion-trigger"]')];
          assert.deepEqual(triggers.map((t) => t.textContent.trim()), ['Why it matters', facts[0][0], facts[3][0] === 'Next' ? 'What follows' : facts[3][0]], `${key}: how it works opens one fact at a time`);
          triggers[1].click();
          assert(words(panelOf(page, 1)).includes(facts[0][1]), `${key}: choosing a fact reveals it`);
          assert(words(panelOf(page, 0)).includes(facts[2][1]), `${key}: what becomes true is the idea's answer`);
          assert(words(panelOf(page, 2)).includes(facts[1][1]), `${key}: what it references opens the evidence`);
        }
        controls[2].click();
        const source = [...panelOf(page, 2).querySelectorAll('a')].find((a) => /agreement guide/i.test(a.textContent));
        assert(source && source.getAttribute('href').startsWith(route.href('/reference') + '?doc=docs%2Fprotocol%2Fagreements.md&from='), 'source uses the canonical reader route on inner pages');
        assert.equal(boundary.textContent, boundaryText, `${key}: the boundary survives every view`);
        controls[0].click();
        assert.equal(selected(controls), 0);
        assert(!route.current().includes('view='), `${key}: the idea has a clean address`);
        const related = [...page.querySelectorAll('[data-ark-block="pager"] [data-ark-part="pager-related"] a')].map((a) => a.dataset.sceneLink);
        assert.deepEqual(related, [...ArkUI.lifecycleStages].filter((s) => s.id !== stageId).map((s) => 'lifecycle/' + s.id), `${key}: every other stage is one press away`);
        if (stageId) {
          const scene = page.querySelector('.stage-scene');
          assert(scene.classList.contains('stage-scene-' + stageId));
          const inspect = childrenOf(scene, '.stage-scene-choices');
          inspect[0].click(); const firstInspection = scene.querySelector('.stage-scene-mesh').dataset.stage;
          inspect[1].click(); assert.notEqual(scene.querySelector('.stage-scene-mesh').dataset.stage, firstInspection, 'lifecycle inspection controls have different patterns');
          assert.equal(scene.querySelector('.stage-scene-detail').textContent, ArkUI.lifecycleContent[stageId].facts[1][1], 'scene inspection reveals the actual reference fact');
          const other = page.querySelector('[data-ark-block="pager"] [data-ark-part="pager-related"] a');
          const mesh = scene.querySelector('.stage-scene-mesh');
          pointer(other, 'pointerenter'); const previewed = mesh.dataset.stage;
          pointer(other, 'pointerleave');
          assert.notEqual(previewed, mesh.dataset.stage, `${key}: pointing at another stage previews it on the illustration, and leaving returns`);
        }
        assert.equal(typeof page.arkDispose, 'function', `${key}: the page can be disposed`);
      }
      if (key === 'deployment') {
        ran.deployment.push(key);
        /* Since 2026-10-19 this page is "Deploy a resolver" on the story template: the three stages
           (write, launch, serve) are its idea, the six steps its How it works, the hazard, the plan
           and the earlier agreement chapters its Evidence. The chapters stay reachable, each link
           still returning to its exact source. */
        const controls = depthTabs(page);
        const stages = [...panelOf(page, 0).querySelectorAll('[data-ark-part="step"]')];
        assert.equal(stages.length, 3, 'deploy story keeps three distinct journey surfaces');
        assert(words(stages[1]).includes(ArkCopy.text('DEPLOYMENT.SIMPLE.LAUNCH.TEXT')), 'editable explanation survives into the actual stage');
        controls[1].click();
        const steps = [...panelOf(page, 1).querySelectorAll('[data-ark-part="accordion-trigger"]')];
        assert.equal(steps.length, 6, 'the six steps');
        assert(steps.every((t, i) => t.textContent.trim().startsWith((i + 1) + ' · ')), 'numbered across the page');
        steps[3].click();
        assert(words(panelOf(page, 1)).includes(ArkCopy.text('DEPLOYMENT.BODY4')), 'a step opens its text in place');
        const all = [...page.querySelectorAll('*')];
        const cards = [...new Set(all.filter((a) => a.dataset.continuityCard && a.dataset.sceneLink).map((a) => a.dataset.continuityCard))];
        assert.deepEqual(cards, ['how/ask', 'how/work', 'how/check'], 'the agreement chapters are not orphaned, and each link returns to its exact source');
        assert(all.some((a) => a.getAttribute('href') === 'https://deploy.defxn.com'), 'the page hands off to the Deploy product');
        assert(all.some((a) => a.getAttribute('href') === 'https://explore.defxn.com'), 'the page hands off to the Explore product');
        const meshes = [...page.querySelectorAll('.how-deploy-mesh')];
        assert.equal(meshes.length, 3, 'each stage keeps its own mesh');
        pointer(stages[1], 'pointerenter'); assert.equal(meshes[1].dataset.active, 'true');
        pointer(stages[1], 'pointerleave'); assert.equal(meshes[1].dataset.active, 'false');
        assert(words(page.querySelector('#deploy-status [data-ark-block="callout"]')).includes('Current implementation'), 'implementation boundary remains in sight (folded behind "Show the status" on a phone only)');
        assert.equal(typeof page.arkDispose, 'function', `${key}: the page can be disposed`);
      }
      if (key.startsWith('how/')) {
        ran.how.push(key);
        const id = key.split('/')[1];
        assert(page.classList.contains('story-chapter-' + id));
        const controls = depthTabs(page);
        const reasons = [...panelOf(page, 0).querySelectorAll('[data-ark-part="fact"]')];
        assert.equal(reasons.length, 3, 'each chapter explains why it works this way');
        controls[1].click();
        const steps = [...panelOf(page, 1).querySelectorAll('[data-ark-part="step"]')];
        assert.equal(steps.length, 3, 'each chapter teaches three steps');
        assert(words(steps[1]).includes(ArkCopy.text('DEPLOYMENT.CHAPTER.' + id.toUpperCase() + '.DETAIL2')), 'every step\'s text is on the page');
        const canvas = page.querySelector('.how-chapter-mesh'), firstPattern = canvas.dataset.stage;
        pointer(steps[1], 'pointerenter');
        assert.notEqual(canvas.dataset.stage, firstPattern, 'each chapter step runs its own mesh pattern');
        pointer(steps[1], 'pointerleave');
        assert.equal(canvas.dataset.stage, firstPattern, 'leaving the step restores the chapter\'s own pattern');
        controls[2].click();
        const proof = words(panelOf(page, 2));
        assert(proof.includes(ArkCopy.text('DEPLOYMENT.CHAPTER.' + id.toUpperCase() + '.NOW')) && proof.includes(ArkCopy.text('DEPLOYMENT.CHAPTER.' + id.toUpperCase() + '.NOT')), 'what it proves, and what it does not');
        assert(panelOf(page, 2).querySelector('a[data-scene-link="lifecycle/' + ['intent', 'agreement', 'receipt'][['ask', 'work', 'check'].indexOf(id)] + '"]'), 'the signed record is one press away');
        assert.equal(typeof page.arkDispose, 'function', `${key}: the page can be disposed`);
      }
      /* /download is the story template since 2026-10-19 (W3-GUIDE). Since 2026-10-21 How it works is
         the five steps as Ark tabs -- the step control /deploy uses, where it was an accordion (ledger
         recheck 2026-10-21, "/download fixes (one step component with /deploy)") -- in step with the
         terminal (the figure), whose way through is an Ark actions row like /deploy's ("/download
         hand-built", DN7/P8). The checks are the same: one step shown, terminal and tabs follow each
         other both ways, the last step hands on. */
      if (key === 'download') {
        ran.download.push(key);
        const terminal = page.querySelector('.download-terminal');
        const steps = page.story.panel('context').querySelector('#download-steps');
        const rows = [...steps.querySelectorAll('[data-ark-part="tabs-trigger"]')];
        const panels = [...steps.children].filter((n) => n.getAttribute('data-ark-part') === 'tabs-content');
        const open = () => panels.map((panel) => !panel.hidden);
        const next = terminal.querySelector('.download-way [data-action="download-next"]'), progress = terminal.querySelector('.download-progress');
        assert.equal(rows.length, 5, 'five source steps');
        assert.equal(progress.textContent, 'Step 1 of 5', 'source guide starts at the first step');
        assert.deepEqual(open(), [true, false, false, false, false], 'source guide starts with one step shown');
        next.click();
        assert.equal(progress.textContent, 'Step 2 of 5', 'source guide advances one step');
        assert.deepEqual(open(), [false, true, false, false, false], 'the shown step follows the terminal');
        rows[4].click();
        assert.equal(progress.textContent, 'Step 5 of 5', 'choosing a step chooses it in the terminal');
        assert(next.hidden, 'final source step has no next step');
        assert(!terminal.querySelector('.download-way .ark-actions > a').hidden, 'final source step hands on to the network page');
        terminal.querySelector('.download-way [data-action="download-previous"]').click();
        assert.equal(progress.textContent, 'Step 4 of 5', 'previous step works');
        assert.deepEqual(open(), [false, false, false, true, false]);
      }
      /* /deploy is a page of Ark blocks since 2026-10-19 (W3-GUIDE): the steps are Ark tabs, the way
         through an Ark actions row, "Review all steps" a disclosure holding every command. */
      if (key === 'deploy') {
        ran.deploy.push(key);
        const steps = page.querySelector('#deploy-steps');
        const tabs = [...steps.querySelectorAll('[data-ark-part="tabs-trigger"]')];
        const panels = [...steps.children].filter((n) => n.getAttribute('data-ark-part') === 'tabs-content');
        const open = () => panels.map((panel) => !panel.hidden);
        const next = page.querySelector('#deploy-way [data-action="deploy-next"]'), back = page.querySelector('#deploy-way [data-action="deploy-previous"]');
        const review = page.querySelector('#deploy-review'), toggle = review.querySelector('[data-ark-part="disclosure-trigger"]');
        assert.deepEqual(open(), [true, false, false, false, false], 'setup starts with one command');
        next.click();
        assert.deepEqual(open(), [false, true, false, false, false], 'next isolates the next setup step');
        tabs[4].click();
        assert(open()[4] && next.hidden, 'last step has no false completion action');
        toggle.click();
        assert.equal(review.getAttribute('data-state'), 'open', 'review opens');
        assert.equal(review.querySelectorAll('tbody tr').length, 5, 'review exposes all commands');
        toggle.click();
        assert(open()[4], 'return to one step preserves position');
        back.click();
        assert(open()[3], 'previous step works');
      }
      if (page.classList.contains('story-question')) {
        ran.mechanism.push(key);
        const area = key === 'dao' ? 'DAO' : key.replace('concept/', '').toUpperCase();
        const controls = depthTabs(page);
        assert.equal(selected(controls), 0, `${key}: starts with the primary answer`);
        assert(words(panelOf(page, 0)).includes(ArkCopy.text(area + '.DECK')), `${key}: the idea is the deck`);
        const boundary = page.querySelector('[data-ark-block="callout"]');
        const boundaryText = boundary.textContent;
        controls[1].click();
        assert.equal(selected(controls), 1);
        const points = [...panelOf(page, 1).querySelectorAll('[data-ark-part="accordion-trigger"]')];
        points[1].click();
        assert(route.current().endsWith('view=context&step=1'), `${key}: named detail is addressable`);
        assert.equal(points[1].getAttribute('aria-expanded'), 'true');
        assert(words(panelOf(page, 1)).includes(ArkCopy.text(area + '.POINT2.TEXT')), `${key}: the chosen point opens in place`);
        const legend = [...page.querySelectorAll('.story-legend .story-record')];
        if (legend.length > 2) {
          controls[0].click(); legend[2].click();
          assert.equal(selected(controls), 1, `${key}: a legend entry opens how it works`);
          assert(route.current().endsWith('view=context&step=2'), `${key}: ...at its own point`);
          assert.equal(legend[2].getAttribute('aria-pressed'), 'true');
        }
        controls[2].click();
        assert.equal(selected(controls), 2);
        assert(panelOf(page, 1).hidden, `${key}: reference replaces supporting detail`);
        assert.equal(boundary.textContent, boundaryText, `${key}: status boundary survives every depth`);
        page.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        assert.equal(selected(controls), 0);
      }
      const links = [page, ...page.querySelectorAll('[data-scene-link]')].filter((node) => node.dataset.sceneLink);
      links.forEach((link) => {
        const target = link.dataset.sceneLink;
        assert(ArkUI.pageCatalog[target], `${key}: unknown link ${target}`);
        /* `link.href` is the address the link opens, resolved against the page's own address as a
           browser resolves it, so both sides are compared resolved: '/concept?view=more' and
           'https://defxn.com/concept?view=more' (js/pages/sheet.js appends to `a.href`, which a
           real DOM returns absolute) open the same route; '#/concept/practice' does not -- on a
           clean-path site it opens the CURRENT page with a legacy hash (js/ark/route.js). */
        const base = resolved(route.href(ArkUI.pageCatalog[target].path)), href = link.href;
        if (target === 'reference') {
          // dash-kit.js's docLink() bakes doc=...&from=... straight into href
          // (no dataset.routeQuery), so only the route and the doc param are checked.
          assert(href.startsWith(base + '?doc='), `${key}: reference link ${href} does not open a real document`);
        } else {
          assert.equal(href, resolved(route.href(ArkUI.pageCatalog[target].path) + (link.dataset.routeQuery ? '?' + link.dataset.routeQuery : '')), `${key}: ${target} has a noncanonical href (as written: ${link.getAttribute('href')})`);
        }
      });
      linkCount += links.length;
      assertNoErrors('its interactions');
      // What the router does when it leaves a page (js/ark/page-router.js): stops its timers and listeners.
      if (typeof page.arkDispose === 'function') assert.doesNotThrow(() => page.arkDispose(), `${key}: arkDispose must not throw`);
      host.remove();
      assertNoErrors('disposal');
    }
    /* Every route is exercised even after one fails, and every failure is reported at the end, so
       one run names each broken route (Wave 3 converts many pages at once), not only the first. */
    const failures = [];
    for (const [key, entry] of Object.entries(ArkUI.pageCatalog)) {
      current = key;
      try { await exerciseRoute(key, entry); }
      catch (error) { failures.push({ key, error, late: errors.splice(0) }); }
    }
    current = '(after every route)';
    assertNoErrors('the last route, after it was disposed');

    /* Each page-specific section ran for every route the catalog derives for it -- never a silent
       skip because a restructured page stopped matching the section's selector. A route that
       failed above is reported with its own error below, so it is not counted twice here. */
    const failed = new Set(failures.map((failure) => failure.key));
    const catalog = Object.entries(ArkUI.pageCatalog);
    const keysWhere = (test) => catalog.filter(([key, entry]) => !failed.has(key) && test(key, entry)).map(([key]) => key);
    const passed = (keys) => keys.filter((key) => !failed.has(key));
    assert.deepEqual(passed(ran.lifecycle), keysWhere((key, entry) => entry.module === 'lifecycle'), 'the lifecycle checks ran on every lifecycle route');
    assert.deepEqual(passed(ran.how), keysWhere((key, entry) => entry.module === 'howStory'), 'the chapter checks ran on every How it works chapter');
    assert.deepEqual(passed(ran.mechanism), keysWhere((key, entry) => entry.scripts.includes('js/pages/sheet.js')), 'the reading-depth checks ran on every page built by js/pages/sheet.js');
    const inCatalog = (test) => catalog.filter(([key, entry]) => test(key, entry)).length;
    assert.equal(inCatalog((key, entry) => entry.module === 'lifecycle'), 1 + ArkUI.lifecycleStages.length, 'the lifecycle overview and each of its stages are routes');
    assert.equal(inCatalog((key, entry) => entry.module === 'howStory'), 3, 'three How it works chapters are routes');
    assert(inCatalog((key, entry) => entry.scripts.includes('js/pages/sheet.js')) > 0, 'the derived reading-depth set is not empty');
    for (const name of ['deployment', 'download', 'deploy']) assert.deepEqual(passed(ran[name]), failed.has(name) ? [] : [name], `the ${name} checks ran`);
    return { failures, routes: catalog.length, blockRoutes, linkCount, copyKeyCount, ran: Object.fromEntries(Object.entries(ran).map(([name, keys]) => [name, keys.length])) };
  });

  const wallMs = Number(process.hrtime.bigint() - started) / 1e6, cpu = process.cpuUsage(cpuStart);
  const cost = `${(wallMs / 1000).toFixed(1)} s wall, ${((cpu.user + cpu.system) / 1e6).toFixed(1)} s CPU`;
  if (summary.failures.length) {
    for (const { key, error, late } of summary.failures) {
      console.error(`FAIL ${key}: ${error.stack || error}`);
      for (const extra of late) console.error(`  also raised in the window during ${extra.route}: ${extra.error && extra.error.stack || extra.error}`);
    }
    throw new Error(`${summary.failures.length} of ${summary.routes} routes failed: ${summary.failures.map((failure) => failure.key).join(', ')}. The rest passed (${summary.blockRoutes} block routes counted, ${summary.linkCount} links, ${summary.copyKeyCount} copy keys; sections ran: ${JSON.stringify(summary.ran)}; failed routes count only up to their failure). ${cost}`);
  }
  console.log(`PASS: ${summary.routes} real route modules mount in jsdom with valid internal links (${summary.blockRoutes} through Ark blocks; ${summary.linkCount} in-site links, ${summary.copyKeyCount} bound copy keys checked; sections ran: ${JSON.stringify(summary.ran)}). ${cost}.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
