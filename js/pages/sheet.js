/* =====================================================================
   THE THEORY SHEETS (/concept/<id>) and /dao: one question each, on the story template
   (js/pages/story.js). The words are the page's manifest (js/content/manifests/<id>.js): its
   title is the question, its deck the short answer (The idea), its numbered points the mechanism
   (How it works, one point open at a time, each addressable as ?view=context&step=<n>), its limit
   and evidence links the Evidence view, its status the boundary every view keeps in sight.
   Theory pages are DERIVED routes (js/pages/catalog.js catalogContentRoutes): a page the editor
   creates in the theory group renders here with no code change, with or without a status.

   The drawing (js/ark/story-diagrams.js) sits in Ark's figure frame with its numbered legend:
   choosing a legend entry opens that point, and opening a point moves the drawing's marker.
   Regression: tests/story-blocks.cjs; behaviour in a real DOM: tests/routes-live.cjs. */
(function () {
  'use strict';

  /* The legend under each drawing: what its numbered places are (the drawing is aria-hidden). */
  var LEGEND = {
    purpose: ['Network A / miner presence', 'Network B / miner presence', 'Shared accounts / outside this isolation'],
    depth: ['Intent', 'Offer', 'Agreement', 'Fulfillment', 'Receipt'],
    practice: ['Object + applicable policy', 'Bounded authority cell', 'Threshold evidence', 'Cell dissolves'],
    dao: ['Mesh policy / substrate', 'Network policy / own network', 'Approval ≠ activation'],
    notes: ['Approval / signed consent', 'Readiness + safety gates', 'Activation / separate evidence'],
    studio: ['Named network ID', 'Source revision', 'Dated observation', 'Evidence + isolation boundary'],
    spec: ['Workload + method', 'Raw results / registered', 'Digest + conditions', 'Conclusion / per record']
  };
  /* `was`: the layout keys of the hand-built sheet, by block id (tests/lib/layout-continuity.cjs,
     censuses tests/fixtures/layout-keys/concept-*.tsv and dao.tsv); never typed. */
  var WAS = {
   "concept/purpose": {
    "purpose-hero": {
     "hero-title": "id:purpose-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "purpose-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "purpose-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "purpose-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"PURPOSE.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "purpose-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "purpose-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "concept/depth": {
    "depth-hero": {
     "hero-title": "id:depth-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "depth-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "depth-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "depth-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"DEPTH.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "depth-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "depth-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3",
     ".story-legend > button:nth-of-type(4)": "page:/div:1/figure:1/button:4",
     ".story-legend > button:nth-of-type(5)": "page:/div:1/figure:1/button:5"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "concept/practice": {
    "practice-hero": {
     "hero-title": "id:practice-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "practice-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "practice-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "practice-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"PRACTICE.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "practice-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "practice-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3",
     ".story-legend > button:nth-of-type(4)": "page:/div:1/figure:1/button:4"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "concept/notes": {
    "notes-hero": {
     "hero-title": "id:notes-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "notes-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "notes-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "notes-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"NOTES.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "notes-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "notes-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "concept/studio": {
    "studio-hero": {
     "hero-title": "id:studio-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "studio-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "studio-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "studio-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"STUDIO.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "studio-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "studio-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3",
     ".story-legend > button:nth-of-type(4)": "page:/div:1/figure:1/button:4"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "concept/spec": {
    "spec-hero": {
     "hero-title": "id:spec-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "spec-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "spec-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "spec-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"SPEC.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "spec-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "spec-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3",
     ".story-legend > button:nth-of-type(4)": "page:/div:1/figure:1/button:4"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "dao": {
    "dao-hero": {
     "hero-title": "id:dao-title",
     "button": "page:/nav:3",
     "actions": "page:/nav:3/a:1"
    },
    "dao-crumbs": {
     "breadcrumb-item#2": "page:/nav:1/a:1",
     "breadcrumb-item#3": "page:/nav:1/span:1",
     ":root": {
      "key": "page:/nav:1",
      "self": true
     }
    },
    "dao-status": {
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1",
     "[data-ark-block=\"callout\"] > div": "page:/div:1/div:1/aside:1"
    },
    "dao-depth": {
     "tabs-list": {
      "key": "page:/nav:2",
      "self": true
     },
     "tabs-trigger": "page:/nav:2/button:1",
     "tabs-trigger#2": "page:/nav:2/button:2",
     "tabs-trigger#3": "page:/nav:2/button:3",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "[data-ark-copy-keys=\"DAO.DECK\"]": "page:/div:1/div:1/div:1/p:1"
    },
    "dao-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "dao-figure": {
     "figure": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     "svg.story-drawing": "page:/div:1/figure:1/svg:1",
     ".story-legend > button:nth-of-type(1)": "page:/div:1/figure:1/button:1",
     ".story-legend > button:nth-of-type(2)": "page:/div:1/figure:1/button:2",
     ".story-legend > button:nth-of-type(3)": "page:/div:1/figure:1/button:3"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   }
  };

  function sentence(text) { return text.charAt(0) + text.slice(1).toLowerCase(); }

  ArkUI.sheet = function (id, page) {
    var manifest = ArkManifest.get(id), area = id.toUpperCase();
    function copy(role) { return 'copy:' + area + '.' + role; }
    function words(role) { return ArkCopy.text(area + '.' + role); }
    function has(role) { return !!manifest.fields[role]; }
    /* One case rule for every action label a manifest authored in capitals (the hero's next step, the evidence links):
       sentence case, derived (js/ark/page-kit.js). Before, the hero's next step was the manifest's capitals on eleven
       sheets and hand-typed sentence case on /dao (docs/ux-audit/ledger.md, story sheets CTA casing). */
    function label(role) { return ArkUI.sentenceCase(words(role)); }
    var count = ArkManifest.points(manifest), step = 0;
    var theory = ArkManifest.group('theory'), index = theory.findIndex(function (m) { return m.id === id; });
    var path = ArkUI.pageCatalog[page] && ArkUI.pageCatalog[page].path;

    /* The figure: the drawing, then its legend -- each entry opens its point. */
    var drawing = ArkUI.createStoryDiagram ? ArkUI.createStoryDiagram(id) : null;
    var labels = LEGEND[id] || [];
    var figure = ArkUI.el('div', 'story-plate');
    if (drawing) figure.appendChild(drawing.element);
    var legend = ArkUI.el('div', 'story-legend'), records = [];
    labels.forEach(function (label, i) {
      var record = ArkUI.el('button', 'story-record', label); record.type = 'button';
      record.dataset.diagramNumber = String(i + 1).padStart(2, '0');
      records.push(record); legend.appendChild(record);
    });
    if (records.length) figure.appendChild(legend);

    /* Evidence: the limit, then every source the manifest names -- its docs, and each 'link'
       field ROLE.HREF labelled by its ROLE field (spec -> /stats, /stats/gpu, /stats/ledger). */
    var sources = [];
    if (manifest.meta.docs && has('EVIDENCE')) sources.push({ label: label('EVIDENCE'), href: 'doc:' + manifest.meta.docs, tone: 'link' });
    Object.keys(manifest.fields).forEach(function (role) {
      var f = manifest.fields[role];
      if (f.kind !== 'link' || !/\.HREF$/.test(role) || !manifest.fields[role.replace(/\.HREF$/, '')]) return;
      sources.push({ label: label(role.replace(/\.HREF$/, '')), href: words(role), tone: 'link' });
    });
    /* The limit can be long (spec lists every benchmark still unverified): its first three lines
       stay in view with "Read the whole limit" (Ark's disclosure, never cut; the button only
       appears when the text is longer than that). */
    var evidence = [];
    if (has('LIMIT.TEXT')) {
      if (has('LIMIT.TITLE')) evidence.push({ block: 'eyebrow', props: { text: copy('LIMIT.TITLE') } });
      evidence.push({ block: 'disclosure', props: { content: copy('LIMIT.TEXT'), preview: 3, more: 'Read the whole limit', less: 'Show less' } });
    }
    for (var s = 0; s < sources.length; s += 4) evidence.push({ block: 'actions', props: { label: 'Sources', items: sources.slice(s, s + 4) } });

    var points = [];
    for (var n = 1; n <= count; n++) points.push({ value: 'step-' + (n - 1), title: copy('POINT' + n + '.TITLE'), content: copy('POINT' + n + '.TEXT') });
    var parent = { label: 'Operating model', href: 'route:concept' };
    /* Onward: the manifest's own next step; a sheet without one (/dao) leads on with the words of the page it leads to, the
       link that page's own manifest authored for it (NOTES.CTA), not words typed here. */
    var onward = manifest.meta.next ? { label: label('NEXT'), href: 'route:' + manifest.meta.next }
      : id === 'dao' ? { label: ArkUI.sentenceCase(ArkCopy.text('NOTES.CTA')), href: 'route:concept/notes' } : null;
    /* The ways on out of this page's journey (ArkUI.nextSteps), in sight in The idea. */
    var ways = ArkUI.nextSteps(page);

    var def = {
      page: page, id: id, className: 'story-question', titleId: id + '-title', was: WAS[page] || {}, insertWas: (WAS[page] || {}).insert,
      crumbs: [{ label: 'Home', href: 'route:zero' }, parent, { label: manifest.title }],
      eyebrow: index >= 0 ? ArkUI.story.position('Operating model', index, theory.length) : (has('EYEBROW') ? copy('EYEBROW') : undefined),
      title: copy('TITLE'),
      depth: {
        focus: { text: copy('DECK'), blocks: ways.length ? [{ block: 'actions', props: { label: 'Where next', items: ways } }] : undefined },
        context: points.length ? { blocks: [{ block: 'accordion', props: { label: manifest.title + ' questions', items: points } }] } : { text: copy('DECK') },
        reference: evidence.length ? { blocks: evidence } : { text: copy('DECK') }
      },
      boundary: has('STATUS.TEXT') ? { tone: 'drift', title: copy('STATUS.TITLE'), body: copy('STATUS.TEXT') } : undefined, boundaryFold: 'phone',
      figure: drawing ? { slot: 'diagram', caption: manifest.title + ' relationships: ' + sentence(drawing.title) + '.' } : undefined,
      slots: { diagram: figure },
      /* Onward: the next step the manifest names (the old call to action) is the one action of the
         hero (Ark: "the main next step"); every other question is one step up, on /concept. */
      actions: onward ? [{ label: onward.label, href: onward.href, tone: 'primary' }] : undefined,
      query: function (view) { return view === 'focus' ? '' : view === 'context' ? 'view=context&step=' + step : 'view=' + view; },
      onView: function (view) { mark(view === 'context'); if (drawing) drawing.select(view === 'context' ? step : 0, false); },
      onRestore: function (params) { open(Math.max(0, Math.min(count - 1, Number(params.get('step')) || 0)), true); },
      onFigureVisibility: function (node, visible) { if (drawing) drawing.visible(visible); },
      dispose: function () { if (drawing) drawing.dispose(); }
    };
    var el = ArkUI.story.mount(def, null);

    /* Rail questions return to the evidence group of /concept (its ?view=more). */
    if (manifest.meta.placement === 'rail') {
      var back = el.querySelector('#' + id + '-crumbs a[data-scene-link="concept"]');
      if (back) { back.dataset.routeQuery = 'view=more'; back.setAttribute('href', back.getAttribute('href') + '?view=more'); }
    }
    var accordion = el.story.panel('context') && el.story.panel('context').querySelector('[data-ark-block="accordion"]');
    var triggers = accordion ? Array.prototype.slice.call(accordion.querySelectorAll('[data-ark-part="accordion-trigger"]')) : [];
    function mark(on) {
      records.forEach(function (record, i) { var selected = on && i === Math.min(step, records.length - 1); record.dataset.selected = String(selected); record.setAttribute('aria-pressed', String(selected)); });
    }
    /* Open point `i` (through the accordion, never by hand) and move the drawing to it. */
    function open(i, quiet) {
      step = i;
      if (triggers[i] && triggers[i].getAttribute('aria-expanded') !== 'true') triggers[i].click();
      if (drawing) drawing.select(el.story.view() === 'context' ? i : 0, !quiet);
      mark(el.story.view() === 'context');
    }
    triggers.forEach(function (trigger, i) {
      trigger.addEventListener('click', function () {
        if (trigger.getAttribute('aria-expanded') !== 'true') return;
        step = i; mark(true); if (drawing) drawing.select(i, true);
        if (ArkUI.route && path) ArkUI.route.write(path, 'view=context&step=' + i, 'push');
      });
    });
    records.forEach(function (record, i) {
      record.addEventListener('click', function () {
        var target = Math.min(i, count - 1);
        el.story.select('context', { quiet: true });
        open(target);
        if (ArkUI.route && path) ArkUI.route.write(path, 'view=context&step=' + target, 'push');
      });
    });
    var initial = el.story.params();
    if (initial && initial.get('step')) open(Math.max(0, Math.min(count - 1, Number(initial.get('step')) || 0)), true);
    else mark(el.story.view() === 'context');
    return el;
  };
})();
