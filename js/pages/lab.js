/* /experiments -- the interactive model -- as a page of Ark blocks around the model itself.

   /experiments and /experiments/lab were two pages for one model, with the same h1 and the same
   disclaimer; the first only said "Explore the model" (docs/ux-audit/pages.md P3). They are one
   page at /experiments (/experiments/lab is an alias, js/pages/catalog.js; regressions:
   tests/page-router.cjs, tests/mechanism-evidence.cjs).

   Converted in DEFXN polish Wave 3 (W3-GUIDE): the page was one innerHTML string with a hand-built
   breadcrumb, eyebrow and heading, and its introduction was display:none in the task frame
   (pages-ux-a.md /experiments/lab). It is Ark's breadcrumb, hero (its status line a detail), the
   introduction in full from 601px (two lines and "More" on a phone), the model -- the page's own,
   driven by js/studio.js, unchanged -- and a pager to its evidence. Layout keys of the old page are
   pinned (`WAS`, tests/lib/layout-continuity.cjs). Regression: tests/task-pages-blocks.cjs. */
(function () {
  'use strict';
  /* One sentence that says what to do, so the model rises into view (first-visit audit 2026-10-22, P1: the model began below
     the fold at 1280x800 under a paragraph that said five times what it is not; the slider itself still sat below the fold,
     so it now comes right after the model picker, above the stage it moves). The page keeps ONE disclaimer in sight, the
     hero's Status line; what the model does not do is in "Understand this analogy" (LIMITS), beside each study's own words. */
  var INTRO = 'Pick a model, then drag the slider to watch an idea change shape: how approvals add up, how one agreement moves through five records, or how named networks stay apart.';
  var LIMITS = 'The dots do not represent real nodes, votes, or a ledger. The model does not calculate a roster, signer threshold, certificate, or transition. The controls explain ideas; they do not measure or reproduce a running Flux network. The link under the model opens the actual contract.';
  var S = 'id:work', L = 'page:/div:1/section:1/div:2';
  var WAS = {
    'lab-crumbs': { ':root': 'page:/div:1/section:1/nav:1', 'breadcrumb-item': 'page:/div:1/section:1/nav:1/a:1', 'breadcrumb-item#2': 'page:/div:1/section:1/nav:1/span:1' },
    /* no eyebrow pin: the eyebrow ("01 / Interactive model") repeated the breadcrumb and the title (first-visit audit 2026-10-22, P1) */
    'lab-hero': { ':root': { key: 'page:/div:1/section:1/div:1', self: true },
      ':scope > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)': 'page:/div:1/section:1/div:1/div:1/p:2' },
    'lab-intro': { ':scope > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/div:1/section:1/div:1/p:1' },
    /* The slider and its analogy come before the stage since 2026-10-22 (first-visit audit, P1: the slider sat below the fold):
       each keeps the key it had in its old place, so a saved edit still lands on the same part. */
    'work': { ':root': { key: S, self: true }, '.lab': L, '.lab-bottom': L + '/div:3', '.experiment-stage': L + '/div:2' },
    'lab-pager': { ':root': { key: 'page:/div:1/section:1/p:1', self: true },
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)': 'page:/div:1/section:1/p:1/a:1',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)': 'page:/div:1/section:1/p:1/a:2' },
    /* the study picker (Ark's choice): each option's words keep the key of the button they replaced */
    'lab-study': { 'choice-text': L + '/div:1/div:1/button:1', 'choice-text#2': L + '/div:1/div:1/button:2', 'choice-text#3': L + '/div:1/div:1/button:3' },
    insert: 'page:/div:2'
  };

  /* The model: the page's own (js/studio.js drives every part of it by these classes and ids).
     Census note (2026-10-19): this markup used to be an escaped string (class=\"...\"), which
     scripts/ux-component-census.mjs cannot see; in plain quotes it counts .experiment-stage, so the
     baseline's step family rose by one by hand -- a class always used, measured now, not added. */
  function model(practiceHref) {
    var box = document.createElement('div');
    box.innerHTML = '<div class="lab" data-mode="spacing">' +
      '<div class="lab-toolbar"><div class="study-tabs"></div></div>' +
      '<div class="lab-bottom"><details class="study-description"><summary>Understand this analogy</summary><h3 id="study-title">How can threshold agreement be pictured?</h3><p id="study-description">This model moves independent groups closer together as a visual analogy for threshold evidence. It does not calculate a real roster, vote, certificate, or transition.</p><p class="study-limits">' + LIMITS + '</p></details><div class="control"><div class="control-label"><label for="variable">Visual convergence</label><output for="variable" id="variable-value">50%</output></div><p class="control-hint" id="variable-hint">Drag the slider to explore the model.</p><input id="variable" disabled type="range" min="0" max="100" value="50" aria-describedby="variable-hint study-description"><div class="control-ends"><span id="range-start">Apart</span><span id="range-end">Together</span></div></div></div>' +
      '<div class="experiment-stage" role="img" aria-label="Illustrative dots in three independent groups. Adjust their spacing to explore the idea of threshold agreement."><div class="experiment-grid"></div><span class="stage-corner">Analogy, not live data</span><div class="specimen" aria-hidden="true"><span class="dot-group"><i></i><i></i><i></i><i></i></span><span class="dot-group"><i></i><i></i><i></i><i></i></span><span class="dot-group"><i></i><i></i><i></i><i></i></span></div><span class="stage-footnote">THREE INDEPENDENT GROUPS</span><span class="stage-axis" aria-hidden="true">x →</span></div>' +
      '<p class="model-consequence" role="status"></p><a class="model-canonical" href="' + practiceHref + '" data-scene-link="concept/practice">Read the authority contract →</a><p class="no-script">This model needs JavaScript to respond to your input.</p>' +
      '</div>';
    var section = document.createElement('section');
    /* `expansion` is the scope css/studio.css styles the whole model under (the stage, the dots, the tabs, the slider). The
       converted page had dropped it with the wrapper it sat on, so the model drew unstyled -- no dots, a 0px stage -- until
       2026-10-20; it rides on the section itself (a class, so no layout key moves). */
    section.className = 'expansion experiments section'; section.tabIndex = -1;
    section.setAttribute('aria-label', 'The model');
    section.appendChild(box.firstChild);
    /* The three studies are ONE stage and ONE slider re-drawn, not three panels, so they are not tabs (a tab owns a panel); they are Ark's
       `choice` -- pick one of a few, a real radio group with the browser's keyboard model -- in the forms chunk this route lists. The
       hand-built group was three aria-pressed buttons with their own look (docs/ux-audit/ledger.md /experiments/lab, S8). A pick is an
       ark:action that js/studio.js hears. */
    section.querySelector('.study-tabs').appendChild(ArkUI.blocks.render({ block: 'choice', id: 'lab-study', was: WAS['lab-study'], props: {
      label: 'Choose a model', look: 'segmented', value: 'spacing', action: 'lab-study',
      options: [{ value: 'spacing', label: '01 Authority' }, { value: 'rhythm', label: '02 Lifecycle' }, { value: 'depth', label: '03 Networks' }]
    } }));
    return section;
  }

  ArkUI.pageModules.lab = {
    mount: function (host) {
      var practiceHref = ArkUI.dash.resolveLinkField('route:concept/practice').href;
      var page = ArkUI.page([
        { block: 'breadcrumb', id: 'lab-crumbs', was: WAS['lab-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Interactive model' }] } },
        /* The title is fixed and names the page as the menu does; the study's question is the model's own (#study-title), no
           longer written over the h1 (first-visit audit 2026-10-22, P1: the page's name changed three times). */
        { block: 'hero', id: 'lab-hero', was: WAS['lab-hero'], props: { title: 'Interactive model: authority, lifecycle and networks', density: 'compact',
          meta: [{ label: 'Status', value: 'Illustrative, not live network data.' }] } },
        { block: 'disclosure', id: 'lab-intro', was: WAS['lab-intro'], props: { content: INTRO, foldBelow: 'phone', preview: 2, more: 'Read the whole introduction', less: 'Show less' } },
        { block: 'custom', id: 'work', was: WAS.work, mount: function () { return model(practiceHref); } },
        { insert: 'main', was: WAS.insert },
        { block: 'pager', id: 'lab-pager', was: WAS['lab-pager'], props: { label: 'Evidence context', relatedLabel: '↳ Evidence context',
          related: [{ label: 'claim inventory', href: 'doc:docs/evidence/public-claim-inventory.md' }, { label: 'evidence registry', href: 'doc:docs/evidence/registry.md' }] } }
      ], host, { page: 'proximity', terms: 'first-use', className: 'lab-page', titleId: 'experiments-title' });
      ArkUI.mountStudio(page);
      return page;
    }
  };
})();
