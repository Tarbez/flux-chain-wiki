/* =====================================================================
   /how-deployment-works: "Deploy a resolver" (since 2026-10-19; the URL is kept, its inbound
   links with it), on the story template (js/pages/story.js):

     hero           what deploying is, and the hand-offs: Deploy, Explore, the registry
     The idea       what deploying is, and the three stages -- write it, launch it, serve it
     How it works   the six steps, numbered across the page, one open at a time
     Evidence       the one hazard every deployer must hear before signing, what is planned
                    (labelled so, never shown as live), and the earlier agreement path's three
                    chapters, read-only (the resolver content audit, Q4)
     boundary       launched is not served -- in sight in every view
     figure         each stage keeps its own mesh; pointing at a stage runs its pattern

   Words: js/content/manifests/deployment.js (W1-CONTENT's). Regression: tests/story-blocks.cjs;
   behaviour in a real DOM: tests/routes-live.cjs. */
(function () {
  'use strict';
  var STAGES = [{ key: 'WRITE', pattern: 'story-ask' }, { key: 'LAUNCH', pattern: 'story-work' }, { key: 'SERVE', pattern: 'story-check' }];
  var CHAPTERS = [['ASK', 'how/ask'], ['WORK', 'how/work'], ['CHECK', 'how/check']];
  /* `was`: the layout keys of the hand-built page, by block id (tests/lib/layout-continuity.cjs,
     census tests/fixtures/layout-keys/how-deployment-works.tsv); never typed. */
  var WAS = {
   "deploy-hero": {
    "hero-title": "id:deployment-title",
    ":root": {
     "key": "page:/header:1",
     "self": true
    },
    "actions": "page:/footer:1/div:2",
    "button": "page:/footer:1/div:2/a:1",
    "button#2": "page:/footer:1/div:2/a:2"
   },
   "deploy-crumbs": {
    ":root": "page:/nav:1",
    "breadcrumb-item": "page:/nav:1/a:1",
    "breadcrumb-item#2": "page:/nav:1/span:1"
   },
   "deploy-depth": {
    ":scope > div:nth-of-type(2) > p:nth-of-type(1)": "page:/header:1/p:1",
    "step-title": "page:/div:1/article:1/h2:1",
    "step-body": "page:/div:1/article:1/p:1",
    "step-title#2": "page:/div:1/article:2/h2:1",
    "step-body#2": "page:/div:1/article:2/p:1",
    "step-title#3": "page:/div:1/article:3/h2:1",
    "step-body#3": "page:/div:1/article:3/p:1",
    "accordion-trigger#7": "page:/div:2/details:1/summary:1",
    "accordion-content#7": "page:/div:2/details:1/p:1",
    "accordion-trigger#8": "page:/div:2/details:2/summary:1",
    "accordion-content#8": "page:/div:2/details:2/p:1",
    "accordion-trigger#9": "page:/div:2/nav:1/strong:1",
    ":scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)": "page:/div:2/nav:1/p:1",
    "actions": "page:/div:2/nav:1/p:2",
    "step-marker": "page:/div:1/article:1/div:1/span:1",
    "step-marker#2": "page:/div:1/article:2/div:1/span:1",
    "step-marker#3": "page:/div:1/article:3/div:1/span:1",
    "accordion-content": "page:/div:1/article:1/ol:1/li:1/span:1",
    "accordion-content#2": "page:/div:1/article:1/ol:1/li:2/span:1",
    "accordion-content#3": "page:/div:1/article:2/ol:1/li:1/span:1",
    "accordion-content#4": "page:/div:1/article:2/ol:1/li:2/span:1",
    "accordion-content#5": "page:/div:1/article:3/ol:1/li:1/span:1",
    "accordion-content#6": "page:/div:1/article:3/ol:1/li:2/span:1",
    "tabs-content": {
     "key": "page:/div:1",
     "self": true
    },
    "accordion#2": {
     "key": "page:/div:2",
     "self": true
    },
    "accordion-item#7": {
     "key": "page:/div:2/details:1",
     "self": true
    },
    "accordion-item#8": {
     "key": "page:/div:2/details:2",
     "self": true
    },
    "accordion-item#9": {
     "key": "page:/div:2/nav:1",
     "self": true
    },
    "step#1": {
     "key": "page:/div:1/article:1",
     "self": true
    },
    "accordion-item#1": {
     "key": "page:/div:1/article:1/ol:1/li:1",
     "self": true
    },
    "accordion-trigger#1": "page:/div:1/article:1/ol:1/li:1/strong:1",
    "accordion-item#2": {
     "key": "page:/div:1/article:1/ol:1/li:2",
     "self": true
    },
    "accordion-trigger#2": "page:/div:1/article:1/ol:1/li:2/strong:1",
    "step#2": {
     "key": "page:/div:1/article:2",
     "self": true
    },
    "accordion-item#3": {
     "key": "page:/div:1/article:2/ol:1/li:1",
     "self": true
    },
    "accordion-trigger#3": "page:/div:1/article:2/ol:1/li:1/strong:1",
    "accordion-item#4": {
     "key": "page:/div:1/article:2/ol:1/li:2",
     "self": true
    },
    "accordion-trigger#4": "page:/div:1/article:2/ol:1/li:2/strong:1",
    "step#3": {
     "key": "page:/div:1/article:3",
     "self": true
    },
    "accordion-item#5": {
     "key": "page:/div:1/article:3/ol:1/li:1",
     "self": true
    },
    "accordion-trigger#5": "page:/div:1/article:3/ol:1/li:1/strong:1",
    "accordion-item#6": {
     "key": "page:/div:1/article:3/ol:1/li:2",
     "self": true
    },
    "accordion-trigger#6": "page:/div:1/article:3/ol:1/li:2/strong:1"
   },
   "deploy-status": {
    "alert-title": "page:/footer:1/div:1/span:1",
    "alert-description": "page:/footer:1/div:1/strong:1",
    "[data-ark-block=\"callout\"] > div": "page:/footer:1",
    "[data-ark-block=\"callout\"]": {
     "key": "page:/footer:1/div:1",
     "self": true
    }
   },
   "deploy-figure": {
    ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(2)": "page:/div:1/article:1/div:1/span:2",
    ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(2)": "page:/div:1/article:2/div:1/span:2",
    ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > span:nth-of-type(2)": "page:/div:1/article:3/div:1/span:2",
    ".how-deploy-mesh:nth-of-type(1)": {
     "key": "page:/div:1/article:1/div:2",
     "self": true
    },
    ".how-deploy-mesh:nth-of-type(1) > canvas": "page:/div:1/article:1/div:2/canvas:1",
    ".how-deploy-mesh:nth-of-type(2)": {
     "key": "page:/div:1/article:2/div:2",
     "self": true
    },
    ".how-deploy-mesh:nth-of-type(2) > canvas": "page:/div:1/article:2/div:2/canvas:1",
    ".how-deploy-mesh:nth-of-type(3)": {
     "key": "page:/div:1/article:3/div:2",
     "self": true
    },
    ".how-deploy-mesh:nth-of-type(3) > canvas": "page:/div:1/article:3/div:2/canvas:1"
   },
   "insert": {
    "key": "page:/div:3",
    "self": true
   }
  };

  ArkUI.pageModules.deployment = {
    mount: function (host) {
      var manifest = ArkManifest.get('deployment');
      function copy(role) { return 'copy:DEPLOYMENT.SIMPLE.' + role; }
      function top(role) { return 'copy:DEPLOYMENT.' + role; }
      /* A link field's value ('route:how/ask', 'url:https://...') is the href itself: the block
         resolves route:/url:, never copy: (a copy: href was an address nobody could open). */
      function words(role) { return ArkCopy.text('DEPLOYMENT.SIMPLE.' + role); }

      /* One mesh per stage, numbered as the stages are. */
      var meshes = ArkUI.el('div', 'how-deploy-meshes'), fabrics = [];
      STAGES.forEach(function (stage, i) {
        var cell = ArkUI.el('div', 'how-deploy-mesh');
        var canvas = ArkUI.el('canvas', 'how-work-mesh'); canvas.setAttribute('aria-hidden', 'true'); cell.appendChild(canvas);
        var tag = ArkUI.el('span', 'how-deploy-mesh-name', String(i + 1).padStart(2, '0') + ' · ' + words(stage.key + '.TITLE')); cell.appendChild(tag);
        var signal = ArkUI.el('span', 'how-deploy-mesh-signal', words(stage.key + '.SIGNAL')); cell.appendChild(signal);
        // clean: the fabric's story labels name the agreement path (YOUR REQUEST, THEIR OFFER); a deploy step is not that.
        fabrics.push({ controller: ArkUI.createMeshFabric(canvas, { clean: true }), pattern: stage.pattern, cell: cell });
        meshes.appendChild(cell);
      });
      var chapters = CHAPTERS.map(function (c) { return { label: copy(c[0] + '.TITLE'), href: words(c[0] + '.HREF') }; })
        .concat([{ label: 'Agreement lifecycle', href: words('NEXT.HREF') }]);

      var def = {
        page: 'deployment', id: 'deploy', className: 'story-deploy', titleId: 'deployment-title', was: WAS, insertWas: WAS.insert,
        crumbs: [{ label: 'Home', href: words('HOME.HREF') }, { label: manifest.title }],
        title: copy('TITLE'),
        actions: [
          { label: copy('DEPLOYER.LINK'), href: words('DEPLOYER.HREF'), tone: 'primary' },
          { label: copy('EXPLORE.LINK'), href: words('EXPLORE.HREF'), tone: 'secondary' },
          { label: copy('REGISTRY.LINK'), href: words('REGISTRY.HREF'), tone: 'link' }
        ],
        /* The idea is the short answer and the three stages; How it works opens the six steps one
           at a time; Evidence holds what to hear before signing, what is planned, and the earlier
           agreement path -- each closed until asked for, as they were behind disclosures before. */
        depth: {
          focus: { text: copy('INTRO'), blocks: [{ block: 'steps', props: { label: 'Three stages', items: STAGES.map(function (stage) {
            return { title: copy(stage.key + '.TITLE'), body: copy(stage.key + '.TEXT') };
          }) } }] },
          context: { blocks: [
            /* Six steps, numbered across the page, one open at a time: each body is a paragraph,
               and all six open at once ran to 2.8 screens on a phone. */
            { block: 'accordion', props: { label: 'Six steps to deploy a resolver', defaultOpen: ['step-1'], items: [1, 2, 3, 4, 5, 6].map(function (n) {
              return { value: 'step-' + n, title: n + ' · ' + ArkCopy.text('DEPLOYMENT.STEP' + n), content: top('BODY' + n) };
            }) } }
          ] },
          reference: { blocks: [
            { block: 'accordion', props: { label: 'Before you deploy', items: [
              { value: 'caution', title: copy('CAUTION.TITLE'), content: copy('CAUTION') },
              { value: 'planned', title: copy('PLANNED.TITLE'), content: copy('PLANNED') },
              { value: 'agreement', title: copy('AGREEMENT.TITLE'), content: copy('AGREEMENT.TEXT'),
                blocks: [{ block: 'actions', props: { label: words('AGREEMENT.TITLE'), items: chapters.map(function (c) { return { label: c.label, href: c.href, tone: 'link' }; }) } }] }
            ] } }
          ] }
        },
        boundary: { tone: 'drift', title: 'Current implementation', body: copy('BOUNDARY') }, boundaryFold: 'phone',
        figure: { slot: 'meshes', caption: words('WRITE.TITLE') + ' · ' + words('LAUNCH.TITLE') + ' · ' + words('SERVE.TITLE') + ': each stage on the mesh.', more: 'Show the three meshes', less: 'Hide the three meshes' },
        slots: { meshes: meshes },
        pager: { label: 'Continue', relatedLabel: copy('AGREEMENT.TITLE'), related: chapters },
        onFigureVisibility: function (figure, visible) { fabrics.forEach(function (f) { f.controller.visible(visible); }); },
        dispose: function () { fabrics.forEach(function (f) { f.controller.dispose(); }); }
      };
      var el = ArkUI.story.mount(def, null);
      /* A chapter link returns to its exact source (js/ark/panel-continuity.js). */
      Array.prototype.forEach.call(el.querySelectorAll('a[data-scene-link^="how/"]'), function (a) { a.dataset.continuityCard = a.getAttribute('data-scene-link'); });
      /* Pointing at a stage runs its pattern on its own mesh. */
      Array.prototype.forEach.call(el.querySelectorAll('#deploy-depth [data-ark-part="step"]'), function (card, i) {
        var f = fabrics[i]; if (!f) return;
        card.addEventListener('pointerenter', function () { f.cell.dataset.active = 'true'; f.controller.select(f.pattern, true, true); });
        card.addEventListener('pointerleave', function () { f.cell.dataset.active = 'false'; f.controller.select(f.pattern, false); });
      });
      host.appendChild(el);
      fabrics.forEach(function (f) { f.controller.select(f.pattern, false); });
      return el;
    }
  };
})();
