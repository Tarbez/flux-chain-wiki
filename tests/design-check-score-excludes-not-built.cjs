'use strict';
/* The Design tips never score a rule they could not measure (js/admin/design-check.js).

   Why this exists (AGENTS.md "Never report a capability that does not exist as 0"; W3-EDITOR
   2026-10-19 design check): rule 14 (who the site is for) reads a field no draft stores and reports
   `notBuilt`; a colour rule whose every candidate sits on an image reports `unmeasured`. Counted as
   failures, they would make a page read "7/14" for work that does not exist, and that number gets
   quoted. The badge is passes / MEASURED rules, its tip count excludes both states, and the list
   names each one ("not built", "not measured") instead of a red mark. Runs the real scoring tail
   and list renderer, cut from design-check.js, over a synthetic reading. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const src = fs.readFileSync('js/admin/design-check.js', 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a); assert(a >= 0 && b > a, `design-check.js still has ${from.trim()} .. ${to.trim()}`); return src.slice(a, b); };

const { window } = new JSDOM('<body><button id="btnCheck"><b id="scoreBadge"></b></button></body>');
const doc = window.document, $ = (id) => doc.getElementById(id);
const reading = [
  { law: 'Hierarchy', title: 'One H1', status: 'pass', detail: 'ok' },
  { law: 'Buttons', title: 'No ghost buttons', status: 'fail', detail: '2 outline-only buttons' },
  { law: 'Scanning', title: 'Easy to scan', status: 'warn', detail: 'long paragraphs' },
  { law: 'Contrast', title: 'Text is easy to read', status: 'unmeasured', detail: 'All text sits on images.' },
  { law: 'Audience', title: 'Designed for the visitor', status: 'notBuilt', detail: 'Not built: no draft stores an audience.' },
  { law: 'Search', title: 'Ready for search results', status: 'pass', detail: 'ok' },
];

/* the scoring tail of runChecks(): from the reading to the badge */
{
  const tail = cut('    lastChecks = out;', '    return out;\n  }');
  const state = { cmsCurrentRoute: '/x' }, scoreByRoute = Object.create(null);
  const score = new Function('out', '$', 'state', 'scoreByRoute', 'let lastChecks;\n' + tail + '\nreturn { lastChecks };');
  score(reading, $, state, scoreByRoute);
  assert.equal($('scoreBadge').dataset.score, '2/4', 'the score is passes / measured rules: not built and unmeasured are excluded from BOTH numbers (not 2/6, not 0 for the missing rule)');
  assert.equal($('scoreBadge').textContent, '2', 'the badge counts tips: the measured warn and fail only');
  assert.match($('btnCheck').getAttribute('aria-label'), /2 of 4 measured rules pass/);
  assert.match($('btnCheck').title, /2 not measured \(see the list\)/, 'the tooltip says how many rules were not measured, instead of hiding them in the score');
  assert.equal(scoreByRoute['/x'], 2);
  /* a reading where nothing could be measured is 0/0, never 0/2 */
  $('scoreBadge').dataset.score = '';
  score(reading.filter((c) => c.status === 'notBuilt' || c.status === 'unmeasured'), $, state, scoreByRoute);
  assert.equal($('scoreBadge').dataset.score, '0/0', 'nothing measured is 0 of 0 measured, not a failure');
  assert.equal($('scoreBadge').textContent, '0', 'and no tips');
}

/* the popover's list: each unmeasured rule is named for what it is, not marked as a failure */
{
  const list = cut("    const head = document.createElement('div'); head.className = 'checkhead';", '    p.appendChild(ul);\n');
  const h = (tag, props) => { const n = doc.createElement(tag); Object.entries(props || {}).forEach(([k, v]) => { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }); return n; };
  const render = new Function('checks', 'p', 'h', 'ic', 'state', 'applyFix', 'closePop', 'postCmsSelectKey', 'document', list + '\n    p.appendChild(ul);');
  const p = doc.createElement('div');
  render(reading, p, h, (name) => `<i data-ic="${name}"></i>`, { lastChecksSettled: true }, () => {}, () => {}, () => {}, doc);
  assert.match(p.querySelector('.checkhead p').textContent, /^2 of 4 measured rules pass · 2 not measured$/, 'the head says passes of measured, and how many were not measured');
  const items = [...p.querySelectorAll('li.' + 'notBuilt, li.unmeasured')];
  assert.equal(items.length, 2);
  const audience = p.querySelector('li.notBuilt'), contrast = p.querySelector('li.unmeasured');
  assert.match(audience.querySelector('b').textContent, /· not built$/, 'a rule with nothing built behind it is labelled "not built"');
  assert.match(contrast.querySelector('b').textContent, /· not measured$/, 'a rule that could not be measured is labelled "not measured"');
  for (const li of items) {
    assert.equal(li.querySelector('.st i').dataset.ic, 'info', 'its mark is informational, never the failure cross');
    assert(!li.querySelector('.acts'), 'it offers no Fix or Show: there is nothing measured to fix');
  }
  assert.equal(p.querySelector('li.fail .st i').dataset.ic, 'close', 'a measured failure keeps its cross');
  assert.match(audience.querySelector('p').textContent, /Not built/, 'the detail names what is missing');
  /* the stylesheet draws both states as "nothing here yet" (--hidden), never a score colour */
  const css = fs.readFileSync('css/studio-embed.css', 'utf8');
  assert.match(css, /\.checks li\.notBuilt \.st, #studioRoot \.checks li\.unmeasured \.st \{ background: hsl\(var\(--hidden\)\); \}/, 'notBuilt and unmeasured share the --hidden mark');
}
console.log('PASS: the Design tips score passes / measured rules; not-built and unmeasured rules are named, excluded from the score, and never drawn as failures.');
