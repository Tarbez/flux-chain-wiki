/* /lifecycle and its five stages: one request (copying a dataset snapshot) followed through five
   signed records, on the story template (js/pages/story.js). The words are this file's own
   (ArkUI.lifecycleContent; js/lattice.js reads them too) -- it carries no manifest, and adding one
   now would grow a JSON-in-JS store (docs/ux-audit/components.md R12). Regression:
   tests/story-blocks.cjs (the page as data, continuity of every saved layout key). */
(function () {
  'use strict';

  ArkUI.lifecycleContent = {
    intent: {
      lead: 'Example: you ask someone to copy one named snapshot of a dataset.',
      heading: 'Say what you need.',
      body: 'The client signs an intent that identifies the snapshot, desired outcome, and applicable constraints. It lands on the client’s own chain, admitted like any record, and later records can refer to it by CID instead of relying on a conversation or a shared queue.',
      note: 'What is still not true: no provider has committed, no work has occurred, and no result has been checked.',
      facts: [
        ['Who writes it', 'The client requesting replication.'],
        ['References', 'The dataset snapshot and applicable request policy.'],
        ['Becomes true', 'One signed, addressable request exists.'],
        ['Next', 'A provider offer references this intent CID.']
      ]
    },
    offer: {
      lead: 'A provider offers to copy the snapshot and explains the proposed terms.',
      heading: 'Consider their proposal.',
      body: 'The provider signs an offer that references the intent CID. The terms stay attached to the request they answer, so the client can inspect capability, constraints, and proposed evidence before accepting anything.',
      note: 'What is still not true: a signed offer is a proposal, not a shared agreement or proof of capacity.',
      facts: [
        ['Who writes it', 'The provider proposing the work.'],
        ['References', 'The client intent CID.'],
        ['Becomes true', 'One attributable proposal exists for that request.'],
        ['Next', 'The participants accept matching terms.']
      ]
    },
    agreement: {
      lead: 'You and the provider record the same accepted terms for the job.',
      heading: 'Agree on what comes next.',
      body: 'The signed agreement links the accepted intent and offer. It defines what fulfillment will be checked against while unrelated agreements continue independently.',
      note: 'What is still not true: accepted terms do not prove the replication happened or that downstream settlement occurred.',
      facts: [
        ['Who writes it', 'The participating client and provider.'],
        ['References', 'The accepted intent and offer CIDs.'],
        ['Becomes true', 'The participants have one inspectable set of terms.'],
        ['Next', 'The provider performs and documents the work.']
      ]
    },
    fulfillment: {
      lead: 'The provider shares the result and the evidence required by the agreed terms.',
      heading: 'Open the result package.',
      body: 'The fulfillment record references the agreement and carries the result evidence defined by its terms. The work remains attached to the request, provider, and policy that gave it meaning.',
      note: 'What is still not true: submission is not acceptance, semantic truth, or proof of every downstream effect.',
      facts: [
        ['Who writes it', 'The provider that performed the work.'],
        ['References', 'The agreement CID and result artifacts.'],
        ['Becomes true', 'A signed result is available for checking.'],
        ['Next', 'The applicable checker and authority evaluate it.']
      ]
    },
    receipt: {
      lead: 'The checking participant records the outcome under the identified rules and authority.',
      heading: 'Read the checking decision.',
      body: 'The receipt links the fulfillment to the agreement, offer, and intent. An auditor can follow one continuous path from request to verification across the participants’ own chains; the agreements resolver reads the links.',
      note: 'What is still not true: a receipt is not universal truth, legally binding settlement, treasury settlement, or production-readiness evidence.',
      facts: [
        ['Who writes it', 'The participant responsible for the verification outcome.'],
        ['References', 'The fulfillment and its linked agreement history.'],
        ['Becomes true', 'One policy-bound verification outcome is recorded.'],
        ['Result', 'An inspectable intent-to-receipt evidence trail.']
      ]
    }
  };

  /* `was`: the layout key each element had on the old page, by block id, so a CMS edit saved
     against it still lands. Derived by tests/lib/layout-continuity.cjs from each route's frozen
     census (tests/fixtures/layout-keys/lifecycle*.tsv); never typed. */
  var WAS = {
   "lifecycle": {
    "lifecycle-overview-crumbs": {
     ":root": "page:/nav:1",
     "breadcrumb-item": "page:/nav:1/a:1",
     "breadcrumb-item#2": "page:/nav:1/span:1"
    },
    "lifecycle-overview-figure": {
     "disclosure-trigger": "page:/div:1/button:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > strong:nth-of-type(1)": "page:/div:1/figure:1/strong:1",
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)": "page:/div:1/figure:1/p:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2)": "page:/div:1/figure:1/div:2",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(1)": "page:/div:1/figure:1/div:1/span:1",
     "canvas": "page:/div:1/figure:1/canvas:1",
     ".lifecycle-object": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     ".lifecycle-fabric-top": "page:/div:1/figure:1/div:1"
    },
    "lifecycle-overview-depth": {
     "tabs-content": "page:/div:1/div:1/div:1",
     "tabs-trigger#3": "page:/div:1/div:1/nav:1/button:3",
     "tabs-list": {
      "key": "page:/div:1/div:1/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/div:1/nav:1/button:1",
     "tabs-trigger#2": "page:/div:1/div:1/nav:1/button:2"
    },
    "lifecycle-overview-hero": {
     "eyebrow": "page:/div:1/div:1/p:1",
     "hero-title": "page:/div:1/div:1/h1:1"
    },
    "lifecycle-overview-boundary": {
     ":root": "page:/div:1/div:1/aside:1",
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1"
    },
    "lifecycle-overview-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "lifecycle-overview-pager": {
     "[data-ark-part=\"pager-related\"]": {
      "key": "page:/nav:2",
      "self": true
     },
     ":root": {
      "key": "page:/nav:3",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/intent\"]": "page:/nav:2/a:1",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/offer\"]": "page:/nav:2/a:2",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/agreement\"]": "page:/nav:2/a:3",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/fulfillment\"]": "page:/nav:2/a:4",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/receipt\"]": "page:/nav:2/a:5",
     "pager-next": "page:/nav:3/a:1"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "lifecycle/intent": {
    "lifecycle-intent-crumbs": {
     ":root": "page:/nav:1",
     "breadcrumb-item": "page:/nav:1/a:1",
     "breadcrumb-item#2": "page:/nav:1/a:2",
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "lifecycle-intent-figure": {
     "disclosure-trigger": "page:/div:1/button:1",
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)": "page:/div:1/figure:1/div:2",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > nav:nth-of-type(1)": "page:/div:1/figure:1/nav:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)": "page:/div:1/figure:1/p:2",
     "canvas": "page:/div:1/figure:1/canvas:1",
     ".stage-scene": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-kind": "page:/div:1/figure:1/div:1",
     "p.mesh-story-cue": "page:/div:1/figure:1/p:1"
    },
    "lifecycle-intent-hero": {
     "hero-title": "page:/div:1/div:1/h1:1",
     "eyebrow": "page:/div:1/div:1/p:1"
    },
    "lifecycle-intent-depth": {
     "tabs-trigger#3": "page:/div:1/div:1/nav:1/button:3",
     "tabs-list": {
      "key": "page:/div:1/div:1/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/div:1/nav:1/button:1",
     "tabs-trigger#2": "page:/div:1/div:1/nav:1/button:2",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "fact-value": "page:/div:1/div:1/div:1/p:2",
     "[data-ark-part=\"tabs-content\"] > p": "page:/div:1/div:1/div:1/p:1"
    },
    "lifecycle-intent-boundary": {
     ":scope > div:nth-of-type(1)": "page:/div:1/div:1/aside:1",
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1"
    },
    "lifecycle-intent-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "lifecycle-intent-pager": {
     "[data-ark-part=\"pager-related\"]": {
      "key": "page:/nav:2",
      "self": true
     },
     ":root": {
      "key": "page:/nav:3",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/offer\"]": "page:/nav:2/a:2",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/agreement\"]": "page:/nav:2/a:3",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/fulfillment\"]": "page:/nav:2/a:4",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/receipt\"]": "page:/nav:2/a:5",
     "pager-next": "page:/nav:3/a:1"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "lifecycle/offer": {
    "lifecycle-offer-crumbs": {
     ":root": "page:/nav:1",
     "breadcrumb-item": "page:/nav:1/a:1",
     "breadcrumb-item#2": "page:/nav:1/a:2",
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "lifecycle-offer-figure": {
     "disclosure-trigger": "page:/div:1/button:1",
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)": "page:/div:1/figure:1/div:2",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > nav:nth-of-type(1)": "page:/div:1/figure:1/nav:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)": "page:/div:1/figure:1/p:2",
     "canvas": "page:/div:1/figure:1/canvas:1",
     ".stage-scene": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-kind": "page:/div:1/figure:1/div:1",
     "p.mesh-story-cue": "page:/div:1/figure:1/p:1"
    },
    "lifecycle-offer-hero": {
     "hero-title": "page:/div:1/div:1/h1:1",
     "eyebrow": "page:/div:1/div:1/p:1"
    },
    "lifecycle-offer-depth": {
     "tabs-trigger#3": "page:/div:1/div:1/nav:1/button:3",
     "tabs-list": {
      "key": "page:/div:1/div:1/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/div:1/nav:1/button:1",
     "tabs-trigger#2": "page:/div:1/div:1/nav:1/button:2",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "fact-value": "page:/div:1/div:1/div:1/p:2",
     "[data-ark-part=\"tabs-content\"] > p": "page:/div:1/div:1/div:1/p:1"
    },
    "lifecycle-offer-boundary": {
     ":scope > div:nth-of-type(1)": "page:/div:1/div:1/aside:1",
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1"
    },
    "lifecycle-offer-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "lifecycle-offer-pager": {
     "[data-ark-part=\"pager-related\"]": {
      "key": "page:/nav:2",
      "self": true
     },
     ":root": {
      "key": "page:/nav:3",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/intent\"]": "page:/nav:2/a:1",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/agreement\"]": "page:/nav:2/a:3",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/fulfillment\"]": "page:/nav:2/a:4",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/receipt\"]": "page:/nav:2/a:5",
     "pager-next": "page:/nav:3/a:2"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "lifecycle/agreement": {
    "lifecycle-agreement-crumbs": {
     ":root": "page:/nav:1",
     "breadcrumb-item": "page:/nav:1/a:1",
     "breadcrumb-item#2": "page:/nav:1/a:2",
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "lifecycle-agreement-figure": {
     "disclosure-trigger": "page:/div:1/button:1",
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)": "page:/div:1/figure:1/div:2",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > nav:nth-of-type(1)": "page:/div:1/figure:1/nav:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)": "page:/div:1/figure:1/p:2",
     "canvas": "page:/div:1/figure:1/canvas:1",
     ".stage-scene": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-kind": "page:/div:1/figure:1/div:1",
     "p.mesh-story-cue": "page:/div:1/figure:1/p:1"
    },
    "lifecycle-agreement-hero": {
     "hero-title": "page:/div:1/div:1/h1:1",
     "eyebrow": "page:/div:1/div:1/p:1"
    },
    "lifecycle-agreement-depth": {
     "tabs-trigger#3": "page:/div:1/div:1/nav:1/button:3",
     "tabs-list": {
      "key": "page:/div:1/div:1/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/div:1/nav:1/button:1",
     "tabs-trigger#2": "page:/div:1/div:1/nav:1/button:2",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "fact-value": "page:/div:1/div:1/div:1/p:2",
     "[data-ark-part=\"tabs-content\"] > p": "page:/div:1/div:1/div:1/p:1"
    },
    "lifecycle-agreement-boundary": {
     ":scope > div:nth-of-type(1)": "page:/div:1/div:1/aside:1",
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1"
    },
    "lifecycle-agreement-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "lifecycle-agreement-pager": {
     "[data-ark-part=\"pager-related\"]": {
      "key": "page:/nav:2",
      "self": true
     },
     ":root": {
      "key": "page:/nav:3",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/intent\"]": "page:/nav:2/a:1",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/offer\"]": "page:/nav:2/a:2",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/fulfillment\"]": "page:/nav:2/a:4",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/receipt\"]": "page:/nav:2/a:5",
     "pager-next": "page:/nav:3/a:2"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "lifecycle/fulfillment": {
    "lifecycle-fulfillment-crumbs": {
     ":root": "page:/nav:1",
     "breadcrumb-item": "page:/nav:1/a:1",
     "breadcrumb-item#2": "page:/nav:1/a:2",
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "lifecycle-fulfillment-figure": {
     "disclosure-trigger": "page:/div:1/button:1",
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)": "page:/div:1/figure:1/div:2",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > nav:nth-of-type(1)": "page:/div:1/figure:1/nav:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)": "page:/div:1/figure:1/p:2",
     "canvas": "page:/div:1/figure:1/canvas:1",
     ".stage-scene": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-kind": "page:/div:1/figure:1/div:1",
     "p.mesh-story-cue": "page:/div:1/figure:1/p:1"
    },
    "lifecycle-fulfillment-hero": {
     "hero-title": "page:/div:1/div:1/h1:1",
     "eyebrow": "page:/div:1/div:1/p:1"
    },
    "lifecycle-fulfillment-depth": {
     "tabs-trigger#3": "page:/div:1/div:1/nav:1/button:3",
     "tabs-list": {
      "key": "page:/div:1/div:1/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/div:1/nav:1/button:1",
     "tabs-trigger#2": "page:/div:1/div:1/nav:1/button:2",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "fact-value": "page:/div:1/div:1/div:1/p:2",
     "[data-ark-part=\"tabs-content\"] > p": "page:/div:1/div:1/div:1/p:1"
    },
    "lifecycle-fulfillment-boundary": {
     ":scope > div:nth-of-type(1)": "page:/div:1/div:1/aside:1",
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1"
    },
    "lifecycle-fulfillment-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "lifecycle-fulfillment-pager": {
     "[data-ark-part=\"pager-related\"]": {
      "key": "page:/nav:2",
      "self": true
     },
     ":root": {
      "key": "page:/nav:3",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/intent\"]": "page:/nav:2/a:1",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/offer\"]": "page:/nav:2/a:2",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/agreement\"]": "page:/nav:2/a:3",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/receipt\"]": "page:/nav:2/a:5",
     "pager-next": "page:/nav:3/a:2"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   },
   "lifecycle/receipt": {
    "lifecycle-receipt-crumbs": {
     ":root": "page:/nav:1",
     "breadcrumb-item": "page:/nav:1/a:1",
     "breadcrumb-item#2": "page:/nav:1/a:2",
     "breadcrumb-item#3": "page:/nav:1/span:1"
    },
    "lifecycle-receipt-figure": {
     "disclosure-trigger": "page:/div:1/button:1",
     "figure-caption": "page:/div:1/figure:1/figcaption:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)": "page:/div:1/figure:1/div:2",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > nav:nth-of-type(1)": "page:/div:1/figure:1/nav:1",
     ":scope > div:nth-of-type(1) > figure:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)": "page:/div:1/figure:1/p:2",
     "canvas": "page:/div:1/figure:1/canvas:1",
     ".stage-scene": {
      "key": "page:/div:1/figure:1",
      "self": true
     },
     "figure-kind": "page:/div:1/figure:1/div:1",
     "p.mesh-story-cue": "page:/div:1/figure:1/p:1"
    },
    "lifecycle-receipt-hero": {
     "hero-title": "page:/div:1/div:1/h1:1",
     "eyebrow": "page:/div:1/div:1/p:1"
    },
    "lifecycle-receipt-depth": {
     "tabs-trigger#3": "page:/div:1/div:1/nav:1/button:3",
     "tabs-list": {
      "key": "page:/div:1/div:1/nav:1",
      "self": true
     },
     "tabs-trigger": "page:/div:1/div:1/nav:1/button:1",
     "tabs-trigger#2": "page:/div:1/div:1/nav:1/button:2",
     "tabs-content": {
      "key": "page:/div:1/div:1/div:1",
      "self": true
     },
     "fact-value": "page:/div:1/div:1/div:1/p:2",
     "[data-ark-part=\"tabs-content\"] > p": "page:/div:1/div:1/div:1/p:1"
    },
    "lifecycle-receipt-boundary": {
     ":scope > div:nth-of-type(1)": "page:/div:1/div:1/aside:1",
     "alert-title": "page:/div:1/div:1/aside:1/strong:1",
     "alert-description": "page:/div:1/div:1/aside:1/p:1"
    },
    "lifecycle-receipt-body": {
     ":root": {
      "key": "page:/div:1",
      "self": true
     },
     ".story-main": {
      "key": "page:/div:1/div:1",
      "self": true
     }
    },
    "lifecycle-receipt-pager": {
     "[data-ark-part=\"pager-related\"]": {
      "key": "page:/nav:2",
      "self": true
     },
     ":root": {
      "key": "page:/nav:3",
      "self": true
     },
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/intent\"]": "page:/nav:2/a:1",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/offer\"]": "page:/nav:2/a:2",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/agreement\"]": "page:/nav:2/a:3",
     "[data-ark-part=\"pager-related\"] a[href$=\"/lifecycle/fulfillment\"]": "page:/nav:2/a:4",
     "pager-next": "page:/nav:3/a:2"
    },
    "insert": {
     "key": "page:/div:2",
     "self": true
    }
   }
  };

  function two(n) { return String(n).padStart(2, '0'); }

  /* The overview's illustration: the agreements resolver's fabric, one reference trail for five
     records. Pointing at or focusing a stage (How it works, the pager) previews that record on it. */
  function trailFigure() {
    var box = ArkUI.el('div', 'lifecycle-object');
    var top = ArkUI.el('div', 'lifecycle-fabric-top'); top.appendChild(ArkUI.el('span', '', 'AGREEMENTS RESOLVER')); box.appendChild(top);
    var count = ArkUI.el('strong', 'lifecycle-fabric-count', '05'); box.appendChild(count);
    var mesh = ArkUI.el('canvas', 'lifecycle-fabric-mesh'); mesh.setAttribute('aria-hidden', 'true'); box.appendChild(mesh);
    var preview = ArkUI.el('p', 'lifecycle-fabric-preview', 'Each signed record adds a reference to the same agreement.'); box.appendChild(preview);
    var foot = ArkUI.el('div', 'lifecycle-fabric-foot'); foot.appendChild(ArkUI.el('span', '', 'Dataset snapshot')); foot.appendChild(ArkUI.el('span', '', 'References persist')); box.appendChild(foot);
    var fabric = ArkUI.createMeshFabric(mesh, { labelMin: 12 }), shown = 'receipt', caption = null;
    function paint(stage, at, title, text) {
      if (shown === stage && at) return;
      shown = stage; fabric.select(stage, !!at);
      count.textContent = at; preview.textContent = text;
      if (caption) caption.textContent = title;
    }
    var all = 'Five records. One reference trail.';
    return {
      element: box, caption: all,
      bind: function (page) { caption = page.querySelector('[data-ark-part="figure-caption"] p'); },
      preview: function (stage) {
        var i = ArkUI.lifecycleStages.findIndex(function (s) { return s.id === stage; });
        paint(stage, two(i + 1), ArkUI.lifecycleStages[i].title + ' / same snapshot', ArkUI.lifecycleContent[stage].facts[2][1]);
      },
      reset: function () { paint('receipt', '', all, 'Each signed record adds a reference to the same agreement.'); count.textContent = '05'; },
      start: function () { fabric.select('receipt', false); },
      visible: function (on) { fabric.visible(on); },
      dispose: function () { fabric.dispose(); }
    };
  }

  ArkUI.pageModules.lifecycle = {
    mount: function (host, page) {
      var id = page.split('/')[1] || '';
      if (id && !ArkUI.lifecycleContent[id]) throw new Error('Unknown lifecycle stage: ' + id);
      var stages = ArkUI.lifecycleStages, index = Math.max(0, stages.findIndex(function (s) { return s.id === id; }));
      var stage = stages[index], copy = ArkUI.lifecycleContent[stage.id];
      var guide = { label: 'Read the agreement guide', href: 'doc:docs/protocol/agreements.md', tone: 'link' };
      /* Block ids carry the stage: two stages are mounted at once while one hands over to the next. */
      var prefix = 'lifecycle-' + (id || 'overview');
      var picture = id ? ArkUI.createStageScene(id, copy) : trailFigure();
      /* The five stages, as links: the pager's related row (the old trail). */
      var related = stages.filter(function (s) { return s.id !== id; }).map(function (s) { return { label: s.title, href: 'route:lifecycle/' + s.id }; });
      /* Out of the lifecycle, not only along it: the ways on from this page's journey (ArkUI.nextSteps, js/ark/page-kit.js),
         in sight in The idea. Before, the only exits were the other stages (docs/ux-audit/ledger.md, lifecycle next steps). */
      var ways = ArkUI.nextSteps(page), onward = ways.length ? [{ block: 'actions', props: { label: 'Where next', items: ways } }] : [];
      var def = {
        page: page, id: prefix, className: 'story-lifecycle', titleId: prefix + '-title', was: WAS[page] || {}, insertWas: (WAS[page] || {}).insert,
        crumbs: [{ label: 'Home', href: 'route:zero' }].concat(id ? [{ label: 'Agreement lifecycle', href: 'route:lifecycle' }, { label: stage.title }] : [{ label: 'Agreement lifecycle' }]),
        eyebrow: id ? ArkUI.story.position('Agreement lifecycle', index, stages.length) : 'One snapshot / five signed records',
        title: id ? copy.heading : 'From request to receipt.',
        /* The idea is the short answer: the example, then what becomes true. How it works opens one
           fact at a time, as the old fact chips did (an accordion now: one ARIA model, one look). */
        depth: id ? {
          focus: { text: copy.lead, blocks: [{ block: 'facts', props: { label: stage.title, columns: 1, items: [{ term: copy.facts[2][0], value: copy.facts[2][1] }] } }].concat(onward) },
          /* "Becomes true" is the idea's answer and "References" opens the evidence: each fact is
             shown once, labelled, where it answers its view's question. */
          context: { blocks: [{ block: 'accordion', props: { label: 'Inspect ' + stage.title, defaultOpen: ['why'], items: [
            { value: 'why', title: 'Why it matters', content: copy.body },
            { value: 'who', title: copy.facts[0][0], content: copy.facts[0][1] },
            { value: 'next', title: copy.facts[3][0] === 'Next' ? 'What follows' : copy.facts[3][0], content: copy.facts[3][1] }
          ] } }] },
          reference: { text: 'The diagram does not supply real CIDs or result artifacts. Inspect actual signed records before drawing a verification conclusion.',
            blocks: [{ block: 'facts', props: { label: stage.title + ' evidence', columns: 1, items: [{ term: copy.facts[1][0], value: copy.facts[1][1] }] } }, { block: 'actions', props: { items: [guide] } }] }
        } : {
          focus: { text: 'A client asks a provider to replicate one named dataset snapshot. Each party writes its signed records to its own FXN chain, and the agreements resolver connects the request, terms, work, and policy-bound verification. Each stage answers a different question.\n\nEach record sits on its writer’s own chain and refers to the preceding request or result by CID. The chain admits it on grammar, signature and position alone; the agreements resolver reads what the links mean. Choose a stage to inspect what becomes true and what remains unproven.', blocks: onward },
          context: { blocks: [{ block: 'accordion', props: { label: 'Agreement stages', items: stages.map(function (s, i) {
              var c = ArkUI.lifecycleContent[s.id];
              return { value: s.id, title: two(i + 1) + ' · ' + s.title, content: c.facts[2][1] + '\n\n' + c.note, blocks: [{ block: 'actions', props: { items: [{ label: 'Open ' + s.title, href: 'route:lifecycle/' + s.id, tone: 'link' }] } }] };
            }) } }] },
          reference: { text: 'The canonical agreement guide describes the record types and their reference chain. This is an illustrative walkthrough, not a live agreement or a verified production run.', blocks: [{ block: 'actions', props: { items: [guide] } }] }
        },
        boundary: id
          ? { tone: 'info', title: 'Not yet established', body: copy.note.replace('What is still not true: ', '').replace(/^./, function (c) { return c.toUpperCase(); }) }
          : { tone: 'drift', title: 'Status / Partial', body: 'Implemented in source. Full public production automation and economic settlement remain unverified.' },
        figure: { slot: 'illustration', caption: id ? picture.title : picture.caption },
        slots: { illustration: picture.element },
        /* Onward: the next stage (the main path), and every other stage one press away -- the old
           five-stage trail. The previous stage is among them. */
        pager: {
          label: 'Continue the story',
          next: !id ? { label: 'Follow ' + stage.title, href: 'route:lifecycle/' + stage.id }
            : stages[index + 1] ? { label: 'Continue to ' + stages[index + 1].title, href: 'route:lifecycle/' + stages[index + 1].id }
            : { label: 'Return to the full trail', href: 'route:lifecycle' },
          relatedLabel: id ? 'The other stages' : 'The five stages',
          related: related
        },
        onFigureVisibility: function (figure, visible) { picture.visible(visible); },
        dispose: function () { picture.dispose(); }
      };
      var el = ArkUI.story.mount(def, null);
      el.dataset.stage = id || 'overview';
      if (picture.bind) picture.bind(el);
      /* Preview a stage on the illustration from any link or step that names it. */
      function previewOn(node, stageId) {
        var show = function () { picture.preview(stageId); };
        var back = function () { if (id) picture.preview(id); else picture.reset(); };
        node.addEventListener('pointerenter', show); node.addEventListener('focus', show);
        node.addEventListener('pointerleave', back); node.addEventListener('blur', back);
      }
      Array.prototype.forEach.call(el.querySelectorAll('#' + prefix + '-pager a[data-scene-link^="lifecycle/"]'), function (a) { previewOn(a, a.getAttribute('data-scene-link').split('/')[1]); });
      if (!id) Array.prototype.forEach.call(el.querySelectorAll('[data-ark-part="accordion-trigger"]'), function (button, i) { previewOn(button, stages[i].id); });
      host.appendChild(el);
      picture.start();
      return el;
    }
  };
})();
