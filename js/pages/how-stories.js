/* =====================================================================
   THE AGREEMENT CHAPTERS (/how-deployment-works/ask, /work, /check), on the story template
   (js/pages/story.js). Each chapter teaches one part of the earlier agreement path -- no longer
   the direction, kept read-only (the resolver content audit, Q4), which the boundary under the
   depth control says with its way to today's model:

     The idea       the chapter's answer, and why DEFXN works this way (three reasons)
     How it works   the three steps; pointing at one runs its pattern on the record's mesh
     Evidence       what is true after this step and what is not yet, the signed record's
                    fields (Ark facts) and the record itself on the lifecycle
     figure         the record this chapter produces, and its mesh

   Words: js/content/manifests/deployment.js (DEPLOYMENT.CHAPTER.*). A record row reads
   "name: meaning"; a leading "[n] " names the step that explains it, kept in the manifest and
   shown as that step's number beside the row. Regression: tests/story-blocks.cjs; behaviour in a
   real DOM: tests/routes-live.cjs. */
(function () {
  'use strict';
  var IDS = ['ask', 'work', 'check'];
  var RECORDS = ['intent', 'agreement', 'receipt'];
  var PATTERNS = { ask: ['story-ask', 'story-goal', 'story-limits'], work: ['story-request', 'story-proposal', 'story-work'], check: ['story-promise', 'story-result', 'story-decision'] };
  /* `was`: the layout keys of the hand-built chapter, by block id (tests/lib/layout-continuity.cjs,
     censuses tests/fixtures/layout-keys/how-deployment-works-*.tsv); never typed. */
  var WAS = {
   "how/ask": {
    "how-ask-hero": {
     "hero-title": "id:how-ask-title",
     ":root": {
      "key": "page:/header:1",
      "self": true
     }
    },
    "how-ask-status": {
     "alert": "page:/p:1",
     "button": "page:/p:1/a:1"
    },
    "how-ask-pager": {
     ":scope > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)": "page:/nav:1/a:1",
     "pager-next": "page:/nav:2/a:2",
     ":root": {
      "key": "page:/nav:2",
      "self": true
     }
    },
    "how-ask-depth": {
     "button": "page:/nav:2/a:1",
     "eyebrow": "page:/div:1/section:1/span:1",
     "stepper": "page:/div:1/section:2/ol:1",
     "facts#2": "page:/div:1/section:2/div:2",
     "fact-term#6": "page:/div:1/section:1/dl:1/dt:1",
     "fact-term#7": "page:/div:1/section:1/dl:1/dt:2",
     "fact-term#8": "page:/div:1/section:1/dl:1/dt:3",
     "fact-term#9": "page:/div:1/section:1/dl:1/dt:4",
     "fact-term#10": "page:/div:1/section:1/dl:1/dt:5",
     "tabs-trigger#2": "page:/div:1/section:2/nav:1/button:1",
     "fact#4": "page:/div:1/section:2/div:2/p:1",
     "fact#5": "page:/div:1/section:2/div:2/p:2",
     "step-body": "page:/div:1/section:2/ol:1/li:1/p:1",
     "step-body#2": "page:/div:1/section:2/ol:1/li:2/p:1",
     "step-body#3": "page:/div:1/section:2/ol:1/li:3/p:1",
     "fact-term": "page:/div:1/section:2/div:1/article:1/h3:1",
     "fact-value": "page:/div:1/section:2/div:1/article:1/p:1",
     "fact-term#2": "page:/div:1/section:2/div:1/article:2/h3:1",
     "fact-value#2": "page:/div:1/section:2/div:1/article:2/p:1",
     "fact-term#3": "page:/div:1/section:2/div:1/article:3/h3:1",
     "fact-value#3": "page:/div:1/section:2/div:1/article:3/p:1",
     "fact-term#4": "page:/div:1/section:2/div:2/p:1/span:1",
     "fact-value#4": "page:/div:1/section:2/div:2/p:1/span:2",
     "fact-term#5": "page:/div:1/section:2/div:2/p:2/span:1",
     "fact-value#5": "page:/div:1/section:2/div:2/p:2/span:2",
     "step-marker": "page:/div:1/section:2/ol:1/li:1/button:1/span:1",
     "step-title": "page:/div:1/section:2/ol:1/li:1/button:1/strong:1",
     "step-marker#2": "page:/div:1/section:2/ol:1/li:2/button:1/span:1",
     "step-title#2": "page:/div:1/section:2/ol:1/li:2/button:1/strong:1",
     "step-marker#3": "page:/div:1/section:2/ol:1/li:3/button:1/span:1",
     "step-title#3": "page:/div:1/section:2/ol:1/li:3/button:1/strong:1",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"]": {
      "key": "page:/div:1/section:1/dl:1",
      "self": true
     },
     ":root": {
      "key": "page:/div:1/section:2",
      "self": true
     },
     "tabs-list": {
      "key": "page:/div:1/section:2/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/section:2/nav:1/button:2",
     "tabs-trigger#3": "page:/div:1/section:2/nav:1/button:3",
     "[data-ark-copy-keys=\"DEPLOYMENT.CHAPTER.ASK.INTRO\"]": {
      "key": "page:/header:1/p:1",
      "self": true
     },
     "facts": "page:/div:1/section:2/div:1",
     "fact#1": "page:/div:1/section:2/div:1/article:1",
     "fact#2": "page:/div:1/section:2/div:1/article:2",
     "fact#3": "page:/div:1/section:2/div:1/article:3",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(1) > dd": "page:/div:1/section:1/dl:1/dd:1",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(2) > dd": "page:/div:1/section:1/dl:1/dd:2",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(3) > dd": "page:/div:1/section:1/dl:1/dd:3",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(4) > dd": "page:/div:1/section:1/dl:1/dd:4",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(5) > dd": "page:/div:1/section:1/dl:1/dd:5",
     "[data-ark-part=\"step\"]:nth-of-type(1) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:1/button:1",
     "[data-ark-part=\"step\"]:nth-of-type(2) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:2/button:1",
     "[data-ark-part=\"step\"]:nth-of-type(3) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:3/button:1"
    },
    "how-ask-figure": {
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > h2:nth-of-type(1)": "page:/div:1/section:1/h2:1",
     "figure": {
      "key": "page:/div:1/section:1",
      "self": true
     },
     "canvas": "page:/div:1/section:1/canvas:1",
     "p.mesh-story-cue": "page:/div:1/section:1/p:1"
    },
    "how-ask-crumbs": {
     ":root": {
      "key": "page:/nav:1",
      "self": true
     },
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "how-ask-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     }
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "how/work": {
    "how-work-hero": {
     "hero-title": "id:how-work-title",
     ":root": {
      "key": "page:/header:1",
      "self": true
     }
    },
    "how-work-status": {
     "alert": "page:/p:1",
     "button": "page:/p:1/a:1"
    },
    "how-work-pager": {
     ":scope > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)": "page:/nav:1/a:1",
     "pager-next": "page:/nav:2/a:3",
     ":root": {
      "key": "page:/nav:2",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/how-deployment-works/ask\"]": "page:/nav:2/a:2"
    },
    "how-work-depth": {
     "button": "page:/nav:2/a:1",
     "eyebrow": "page:/div:1/section:1/span:1",
     "stepper": "page:/div:1/section:2/ol:1",
     "facts#2": "page:/div:1/section:2/div:2",
     "fact-term#6": "page:/div:1/section:1/dl:1/dt:1",
     "fact-term#7": "page:/div:1/section:1/dl:1/dt:2",
     "fact-term#8": "page:/div:1/section:1/dl:1/dt:3",
     "fact-term#9": "page:/div:1/section:1/dl:1/dt:4",
     "fact-term#10": "page:/div:1/section:1/dl:1/dt:5",
     "fact-term#11": "page:/div:1/section:1/dl:1/dt:6",
     "tabs-trigger#2": "page:/div:1/section:2/nav:1/button:1",
     "fact#4": "page:/div:1/section:2/div:2/p:1",
     "fact#5": "page:/div:1/section:2/div:2/p:2",
     "step-body": "page:/div:1/section:2/ol:1/li:1/p:1",
     "step-body#2": "page:/div:1/section:2/ol:1/li:2/p:1",
     "step-body#3": "page:/div:1/section:2/ol:1/li:3/p:1",
     "fact-term": "page:/div:1/section:2/div:1/article:1/h3:1",
     "fact-value": "page:/div:1/section:2/div:1/article:1/p:1",
     "fact-term#2": "page:/div:1/section:2/div:1/article:2/h3:1",
     "fact-value#2": "page:/div:1/section:2/div:1/article:2/p:1",
     "fact-term#3": "page:/div:1/section:2/div:1/article:3/h3:1",
     "fact-value#3": "page:/div:1/section:2/div:1/article:3/p:1",
     "fact-term#4": "page:/div:1/section:2/div:2/p:1/span:1",
     "fact-value#4": "page:/div:1/section:2/div:2/p:1/span:2",
     "fact-term#5": "page:/div:1/section:2/div:2/p:2/span:1",
     "fact-value#5": "page:/div:1/section:2/div:2/p:2/span:2",
     "step-marker": "page:/div:1/section:2/ol:1/li:1/button:1/span:1",
     "step-title": "page:/div:1/section:2/ol:1/li:1/button:1/strong:1",
     "step-marker#2": "page:/div:1/section:2/ol:1/li:2/button:1/span:1",
     "step-title#2": "page:/div:1/section:2/ol:1/li:2/button:1/strong:1",
     "step-marker#3": "page:/div:1/section:2/ol:1/li:3/button:1/span:1",
     "step-title#3": "page:/div:1/section:2/ol:1/li:3/button:1/strong:1",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"]": {
      "key": "page:/div:1/section:1/dl:1",
      "self": true
     },
     ":root": {
      "key": "page:/div:1/section:2",
      "self": true
     },
     "tabs-list": {
      "key": "page:/div:1/section:2/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/section:2/nav:1/button:2",
     "tabs-trigger#3": "page:/div:1/section:2/nav:1/button:3",
     "[data-ark-copy-keys=\"DEPLOYMENT.CHAPTER.WORK.INTRO\"]": {
      "key": "page:/header:1/p:1",
      "self": true
     },
     "facts": "page:/div:1/section:2/div:1",
     "fact#1": "page:/div:1/section:2/div:1/article:1",
     "fact#2": "page:/div:1/section:2/div:1/article:2",
     "fact#3": "page:/div:1/section:2/div:1/article:3",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(1) > dd": "page:/div:1/section:1/dl:1/dd:1",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(2) > dd": "page:/div:1/section:1/dl:1/dd:2",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(3) > dd": "page:/div:1/section:1/dl:1/dd:3",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(4) > dd": "page:/div:1/section:1/dl:1/dd:4",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(5) > dd": "page:/div:1/section:1/dl:1/dd:5",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(6) > dd": "page:/div:1/section:1/dl:1/dd:6",
     "[data-ark-part=\"step\"]:nth-of-type(1) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:1/button:1",
     "[data-ark-part=\"step\"]:nth-of-type(2) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:2/button:1",
     "[data-ark-part=\"step\"]:nth-of-type(3) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:3/button:1"
    },
    "how-work-figure": {
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > h2:nth-of-type(1)": "page:/div:1/section:1/h2:1",
     "figure": {
      "key": "page:/div:1/section:1",
      "self": true
     },
     "canvas": "page:/div:1/section:1/canvas:1",
     "p.mesh-story-cue": "page:/div:1/section:1/p:1"
    },
    "how-work-crumbs": {
     ":root": {
      "key": "page:/nav:1",
      "self": true
     },
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "how-work-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     }
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "how/check": {
    "how-check-hero": {
     "hero-title": "id:how-check-title",
     ":root": {
      "key": "page:/header:1",
      "self": true
     }
    },
    "how-check-status": {
     "alert": "page:/p:1",
     "button": "page:/p:1/a:1"
    },
    "how-check-depth": {
     "button": "page:/nav:2/a:1",
     "eyebrow": "page:/div:1/section:1/span:1",
     "stepper": "page:/div:1/section:2/ol:1",
     "facts#2": "page:/div:1/section:2/div:2",
     "fact-term#6": "page:/div:1/section:1/dl:1/dt:1",
     "fact-term#7": "page:/div:1/section:1/dl:1/dt:2",
     "fact-term#8": "page:/div:1/section:1/dl:1/dt:3",
     "fact-term#9": "page:/div:1/section:1/dl:1/dt:4",
     "fact-term#10": "page:/div:1/section:1/dl:1/dt:5",
     "tabs-trigger#2": "page:/div:1/section:2/nav:1/button:1",
     "fact#4": "page:/div:1/section:2/div:2/p:1",
     "fact#5": "page:/div:1/section:2/div:2/p:2",
     "step-body": "page:/div:1/section:2/ol:1/li:1/p:1",
     "step-body#2": "page:/div:1/section:2/ol:1/li:2/p:1",
     "step-body#3": "page:/div:1/section:2/ol:1/li:3/p:1",
     "fact-term": "page:/div:1/section:2/div:1/article:1/h3:1",
     "fact-value": "page:/div:1/section:2/div:1/article:1/p:1",
     "fact-term#2": "page:/div:1/section:2/div:1/article:2/h3:1",
     "fact-value#2": "page:/div:1/section:2/div:1/article:2/p:1",
     "fact-term#3": "page:/div:1/section:2/div:1/article:3/h3:1",
     "fact-value#3": "page:/div:1/section:2/div:1/article:3/p:1",
     "fact-term#4": "page:/div:1/section:2/div:2/p:1/span:1",
     "fact-value#4": "page:/div:1/section:2/div:2/p:1/span:2",
     "fact-term#5": "page:/div:1/section:2/div:2/p:2/span:1",
     "fact-value#5": "page:/div:1/section:2/div:2/p:2/span:2",
     "step-marker": "page:/div:1/section:2/ol:1/li:1/button:1/span:1",
     "step-title": "page:/div:1/section:2/ol:1/li:1/button:1/strong:1",
     "step-marker#2": "page:/div:1/section:2/ol:1/li:2/button:1/span:1",
     "step-title#2": "page:/div:1/section:2/ol:1/li:2/button:1/strong:1",
     "step-marker#3": "page:/div:1/section:2/ol:1/li:3/button:1/span:1",
     "step-title#3": "page:/div:1/section:2/ol:1/li:3/button:1/strong:1",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"]": {
      "key": "page:/div:1/section:1/dl:1",
      "self": true
     },
     ":root": {
      "key": "page:/div:1/section:2",
      "self": true
     },
     "tabs-list": {
      "key": "page:/div:1/section:2/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/section:2/nav:1/button:2",
     "tabs-trigger#3": "page:/div:1/section:2/nav:1/button:3",
     "[data-ark-copy-keys=\"DEPLOYMENT.CHAPTER.CHECK.INTRO\"]": {
      "key": "page:/header:1/p:1",
      "self": true
     },
     "facts": "page:/div:1/section:2/div:1",
     "fact#1": "page:/div:1/section:2/div:1/article:1",
     "fact#2": "page:/div:1/section:2/div:1/article:2",
     "fact#3": "page:/div:1/section:2/div:1/article:3",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(1) > dd": "page:/div:1/section:1/dl:1/dd:1",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(2) > dd": "page:/div:1/section:1/dl:1/dd:2",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(3) > dd": "page:/div:1/section:1/dl:1/dd:3",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(4) > dd": "page:/div:1/section:1/dl:1/dd:4",
     "[data-ark-block=\"disclosure\"] [data-ark-block=\"facts\"] > div:nth-of-type(5) > dd": "page:/div:1/section:1/dl:1/dd:5",
     "[data-ark-part=\"step\"]:nth-of-type(1) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:1/button:1",
     "[data-ark-part=\"step\"]:nth-of-type(2) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:2/button:1",
     "[data-ark-part=\"step\"]:nth-of-type(3) > .ark-steps__content": "page:/div:1/section:2/ol:1/li:3/button:1"
    },
    "how-check-pager": {
     ":scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)": "page:/nav:2/a:3",
     ":root": {
      "key": "page:/nav:2",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/how-deployment-works/work\"]": "page:/nav:2/a:2"
    },
    "how-check-figure": {
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > h2:nth-of-type(1)": "page:/div:1/section:1/h2:1",
     "figure": {
      "key": "page:/div:1/section:1",
      "self": true
     },
     "canvas": "page:/div:1/section:1/canvas:1",
     "p.mesh-story-cue": "page:/div:1/section:1/p:1"
    },
    "how-check-crumbs": {
     ":root": {
      "key": "page:/nav:1",
      "self": true
     },
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "how-check-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     }
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   }
  };

  /* The record's rows: [{ name, meaning, steps }] from the manifest's "[1,2] name: meaning" lines. */
  function rows(text) {
    return String(text).split('\n').map(function (line) {
      var steps = null, m = /^\[([\d,\s]+)\]\s*/.exec(line);
      if (m) { steps = m[1].split(',').map(Number); line = line.slice(m[0].length); }
      var cut = line.indexOf(': ');
      return cut < 0 ? null : { name: line.slice(0, cut), meaning: line.slice(cut + 2), steps: steps };
    }).filter(Boolean);
  }

  ArkUI.pageModules.howStory = { mount: function (host, page) {
    var id = page.split('/')[1], index = IDS.indexOf(id);
    if (index < 0) throw new Error('Unknown work story');
    function key(role) { return 'DEPLOYMENT.CHAPTER.' + id.toUpperCase() + '.' + role; }
    function copy(role) { return 'copy:' + key(role); }
    function words(role) { return ArkCopy.text(key(role)); }
    function chapter(i) { return { label: 'copy:DEPLOYMENT.SIMPLE.' + IDS[i].toUpperCase() + '.TITLE', href: 'route:how/' + IDS[i] }; }
    var patterns = PATTERNS[id];

    /* The record this chapter produces, drawn: its heading, its mesh and the mesh's cue. Its fields
       are the Evidence view's (the record is what the chapter proves). */
    var record = ArkUI.el('div', 'how-record');
    record.appendChild(ArkUI.el('h2', 'how-record-title', words(['JOB', 'JOIN', 'RESULT'][index])));
    var canvas = ArkUI.el('canvas', 'how-chapter-mesh'); canvas.setAttribute('aria-hidden', 'true'); record.appendChild(canvas);
    var cue = ArkUI.el('p', 'mesh-story-cue'); record.appendChild(cue);
    var fabric = ArkUI.createMeshFabric(canvas, { caption: cue, labelMin: 12 });
    var fields = rows(words('RECORD')).map(function (row) {
      return { term: row.name, value: row.meaning + (row.steps ? ' (step ' + row.steps.join(', ') + ')' : '') };
    });

    var def = {
      page: page, id: 'how-' + id, className: 'story-chapter story-chapter-' + id, titleId: 'how-' + id + '-title', was: WAS[page] || {}, insertWas: (WAS[page] || {}).insert,
      crumbs: [{ label: 'Home', href: 'route:zero' }, { label: ArkManifest.get('deployment').title, href: 'route:deployment' }, { label: 'copy:DEPLOYMENT.SIMPLE.' + id.toUpperCase() + '.TITLE' }],
      eyebrow: ArkUI.story.position(ArkCopy.text('DEPLOYMENT.SIMPLE.AGREEMENT.TITLE'), index, IDS.length),
      title: copy('TITLE'),
      /* Written for the earlier path: said under the depth control in every view (folded behind
         "Show the status" on a phone), with the way to today's model. */
      boundary: { tone: 'reference', body: 'copy:DEPLOYMENT.CHAPTER.BANNER', actions: [{ label: 'What is a resolver', href: ArkCopy.text('DEPLOYMENT.CHAPTER.BANNER.HREF'), tone: 'link' }] },
      boundaryFold: 'phone',
      depth: {
        focus: { text: copy('INTRO'), blocks: [{ block: 'facts', props: { label: 'Why it works this way', columns: 1, items: [1, 2, 3].map(function (n) { return { term: copy('WHY' + n + '.TITLE'), value: copy('WHY' + n + '.TEXT') }; }) } }] },
        context: { blocks: [{ block: 'steps', props: { label: 'How this part works', items: [1, 2, 3].map(function (n) { return { title: copy('CHOICE' + n), body: copy('DETAIL' + n) }; }) } }] },
        reference: { blocks: [
          { block: 'facts', props: { label: 'What it proves', columns: 1, items: [{ term: 'True after this step', value: words('NOW') }, { term: 'Not yet true', value: words('NOT') }] } },
          { block: 'eyebrow', props: { text: copy('RECORD.LABEL') } },
          /* The record's fields: two columns wide, folded behind a button on a phone (where one column of
             them ran the view past the fold), always a press away. */
          { block: 'disclosure', props: { foldBelow: 'phone', more: 'Show the record’s fields', less: 'Hide the record’s fields', blocks: [{ block: 'facts', props: { label: words('RECORD.LABEL'), columns: 3, items: fields } }] } },
          { block: 'actions', props: { items: [{ label: 'Explore the signed record', href: 'route:lifecycle/' + RECORDS[index], tone: 'link' }] } }
        ] }
      },
      figure: { slot: 'record', caption: copy('RECORD.LABEL'), more: 'Show the signed record', less: 'Hide the signed record' },
      slots: { record: record },
      /* Onward: the next part (the last returns to the lifecycle); the previous part and the
         lifecycle are one press away. */
      pager: {
        label: 'Continue this story',
        next: index < 2 ? chapter(index + 1) : { label: 'Back to the lifecycle', href: 'route:lifecycle' },
        relatedLabel: 'copy:DEPLOYMENT.SIMPLE.AGREEMENT.TITLE',
        related: (index > 0 ? [chapter(index - 1)] : []).concat(index < 2 ? [{ label: 'Agreement lifecycle', href: 'route:lifecycle' }] : [])
      },
      onFigureVisibility: function (figure, visible) { fabric.visible(visible); },
      dispose: function () { fabric.dispose(); }
    };
    var el = ArkUI.story.mount(def, null);
    /* Pointing at a step runs that step's pattern on the mesh; leaving returns to the chapter's
       own. (Every step's text is open: nothing needs choosing to be read.) */
    Array.prototype.forEach.call(el.querySelectorAll('[data-ark-part="step"]'), function (item, i) {
      item.addEventListener('pointerenter', function () { fabric.select(patterns[i], true); });
      item.addEventListener('pointerleave', function () { fabric.select(patterns[0], true); });
    });
    host.appendChild(el);
    fabric.select(patterns[0], false);
    return el;
  } };
})();
