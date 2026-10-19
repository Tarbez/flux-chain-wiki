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
  var INTRO = 'Bring independent groups closer together to explore a visual analogy for threshold evidence. Then inspect the actual authority contract. The dots do not represent real nodes, votes, or a ledger. The model does not calculate a roster, signer threshold, certificate, or transition. Change a variable and watch a visual analogy respond. The controls help explain authority, lifecycle, and network boundaries; they do not measure or reproduce a running Flux network.';
  var S = 'id:work', L = 'page:/div:1/section:1/div:2';
  var WAS = {
    'lab-crumbs': { ':root': 'page:/div:1/section:1/nav:1', 'breadcrumb-item': 'page:/div:1/section:1/nav:1/a:1', 'breadcrumb-item#2': 'page:/div:1/section:1/nav:1/span:1' },
    'lab-hero': { ':root': { key: 'page:/div:1/section:1/div:1', self: true }, eyebrow: 'page:/div:1/section:1/div:1/div:1/p:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)': 'page:/div:1/section:1/div:1/div:1/p:2' },
    'lab-intro': { ':scope > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/div:1/section:1/div:1/p:1' },
    'work': { ':root': { key: S, self: true }, '.lab': L },
    'lab-pager': { ':root': { key: 'page:/div:1/section:1/p:1', self: true },
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)': 'page:/div:1/section:1/p:1/a:1',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)': 'page:/div:1/section:1/p:1/a:2' },
    insert: 'page:/div:2'
  };

  /* The model: the page's own (js/studio.js drives every part of it by these classes and ids).
     Census note (2026-10-19): this markup used to be an escaped string (class=\"...\"), which
     scripts/ux-component-census.mjs cannot see; in plain quotes it counts .experiment-stage, so the
     baseline's step family rose by one by hand -- a class always used, measured now, not added. */
  function model(practiceHref) {
    var box = document.createElement('div');
    box.innerHTML = '<div class="lab" data-mode="spacing">' +
      '<div class="lab-toolbar"><div class="study-tabs" role="group" aria-label="Choose a model"><button type="button" disabled data-icon="authority" data-study="spacing" aria-pressed="true">01 <span>Authority</span></button><button type="button" disabled data-icon="cycle" data-study="rhythm" aria-pressed="false">02 <span>Lifecycle</span></button><button type="button" disabled data-icon="network" data-study="depth" aria-pressed="false">03 <span>Networks</span></button></div><span class="live-label">INTERACTIVE MODEL</span></div>' +
      '<div class="experiment-stage" role="img" aria-label="Illustrative dots in three independent groups. Adjust their spacing to explore the idea of threshold agreement."><div class="experiment-grid"></div><span class="stage-corner">FX—001</span><div class="specimen" aria-hidden="true"><span class="dot-group"><i></i><i></i><i></i><i></i></span><span class="dot-group"><i></i><i></i><i></i><i></i></span><span class="dot-group"><i></i><i></i><i></i><i></i></span></div><span class="stage-footnote">A VISUAL ANALOGY FOR DERIVED, TEMPORARY AUTHORITY.</span><span class="stage-axis" aria-hidden="true">x →</span></div>' +
      '<div class="lab-bottom"><details class="study-description"><summary>Understand this analogy</summary><h3 id="study-title">How can threshold agreement be pictured?</h3><p id="study-description">This model moves independent groups closer together as a visual analogy for threshold evidence. It does not calculate a real roster, vote, certificate, or transition.</p></details><div class="control"><div class="control-label"><label for="variable">Visual convergence</label><output for="variable" id="variable-value">50%</output></div><input id="variable" disabled type="range" min="0" max="100" value="50" aria-describedby="study-description"><div class="control-ends"><span id="range-start">Apart</span><span id="range-end">Together</span></div></div></div>' +
      '<p class="model-consequence" role="status"></p><a class="model-canonical" href="' + practiceHref + '" data-scene-link="concept/practice">Read the authority contract →</a><p class="no-script">This model needs JavaScript to respond to your input.</p>' +
      '</div>';
    var section = document.createElement('section');
    section.className = 'experiments section'; section.tabIndex = -1;
    section.setAttribute('aria-label', 'The model');
    section.appendChild(box.firstChild);
    return section;
  }

  ArkUI.pageModules.lab = {
    mount: function (host) {
      var practiceHref = ArkUI.dash.resolveLinkField('route:concept/practice').href;
      var page = ArkUI.page([
        { block: 'breadcrumb', id: 'lab-crumbs', was: WAS['lab-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Interactive model' }] } },
        { block: 'hero', id: 'lab-hero', was: WAS['lab-hero'], props: { eyebrow: '01 / Interactive model', title: 'Explore three protocol concepts.', density: 'compact',
          meta: [{ label: 'Status', value: 'Illustrative, not live network data.' }] } },
        { block: 'disclosure', id: 'lab-intro', was: WAS['lab-intro'], props: { content: INTRO, foldBelow: 'phone', preview: 2, more: 'Read the whole introduction', less: 'Show less' } },
        { block: 'custom', id: 'work', was: WAS.work, mount: function () { return model(practiceHref); } },
        { insert: 'main', was: WAS.insert },
        { block: 'pager', id: 'lab-pager', was: WAS['lab-pager'], props: { label: 'Evidence context', relatedLabel: '↳ Evidence context',
          related: [{ label: 'claim inventory', href: 'doc:docs/evidence/public-claim-inventory.md' }, { label: 'evidence registry', href: 'doc:docs/evidence/registry.md' }] } }
      ], host, { page: 'proximity', className: 'lab-page', titleId: 'experiments-title' });
      ArkUI.mountStudio(page);
      return page;
    }
  };
})();
