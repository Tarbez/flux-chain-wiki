'use strict';
/* run-tests-timeout-ms: 1500000 -- two server renders per route, 18 routes. */
/* The story pages (js/pages/story.js) as a crawler gets them: every block server-rendered and
   styled by the static stylesheets only (no style attribute on a block, no injected rule), every
   folded view in the HTML with its words, every id authored or Ark's reserved ark-r- kind, every
   aria reference resolving, and two renders byte-identical -- the same checks every Wave 3 page
   runs (tests/lib/block-page-checks.cjs). Run alone (owner test law); `node tests/story-ssr.cjs
   /lifecycle` checks one route. Regression for the story template: tests/story-blocks.cjs. */
const checks = require('./lib/block-page-checks.cjs');

const ROUTES = {
  '/concept': ['concept', 'concept-'],
  '/concept/purpose': ['concept/purpose', 'purpose-'], '/concept/depth': ['concept/depth', 'depth-'],
  '/concept/practice': ['concept/practice', 'practice-'], '/concept/notes': ['concept/notes', 'notes-'],
  '/concept/studio': ['concept/studio', 'studio-'], '/concept/spec': ['concept/spec', 'spec-'], '/dao': ['dao', 'dao-'],
  '/how-deployment-works': ['deployment', ['deploy-', 'deployment-']],
  '/how-deployment-works/ask': ['how/ask', 'how-ask-'], '/how-deployment-works/work': ['how/work', 'how-work-'], '/how-deployment-works/check': ['how/check', 'how-check-'],
  '/lifecycle': ['lifecycle', 'lifecycle-overview-'],
  '/lifecycle/intent': ['lifecycle/intent', 'lifecycle-intent-'], '/lifecycle/offer': ['lifecycle/offer', 'lifecycle-offer-'],
  '/lifecycle/agreement': ['lifecycle/agreement', 'lifecycle-agreement-'], '/lifecycle/fulfillment': ['lifecycle/fulfillment', 'lifecycle-fulfillment-'],
  '/lifecycle/receipt': ['lifecycle/receipt', 'lifecycle-receipt-']
};

(async () => {
  const lines = [];
  for (const route of Object.keys(ROUTES).filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r))) {
    const [page, idPrefix] = ROUTES[route];
    const { blocks, panels } = await checks.assertServerRender(route, page, { idPrefix });
    lines.push(`${route} ${blocks}/${panels}`);
  }
  console.log('PASS: every story page is server-rendered from blocks, styled statically, folded views present, ids and aria references sound, renders identical (blocks/tab panels: ' + lines.join(', ') + ').');
})().catch((error) => { console.error(error); process.exit(1); });
