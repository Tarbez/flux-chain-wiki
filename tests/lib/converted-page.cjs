'use strict';
/* =====================================================================
   CONVERTED PAGE -- the checks every page converted to Ark blocks runs
   against the hand-built page it replaced (Wave 3, W3-GUIDE), written once
   for the guide and task pages (tests/resolver-guide-blocks.cjs,
   tests/task-pages-blocks.cjs):

     const converted = require('./lib/converted-page.cjs');
     const seen = await converted.check(route, { reshaped, retired, reworded, inspect });

   - every leaf the old page showed (its frozen census, tests/fixtures/
     layout-keys/) is in the new page's words -- validate the payload, not the
     pipeline -- unless `reworded` names it with the reason;
   - every old layout key still names an element with the same words, or is
     reshaped (pinned to its successor) / retired (nothing carries it) with the
     reason; a real saved edit on every live key lands;
   - no new element takes a retired key (it would inherit an edit saved for
     something else);
   - no block was refused, nothing is hidden by an inline style, every link
     opens a real address, the CMS anchor is there, one h1.
   Rules are given as [RegExp, reason] lists, so one reason covers a family of
   keys (five step rows, twenty pages) without listing each.
   ===================================================================== */
const assert = require('node:assert/strict');
const continuity = require('./layout-continuity.cjs');

const ICON = /\/(a|button):\d+\/svg:\d+(\/(path|circle|rect|line|polyline|g):\d+)*$/;
const ICON_REASON = 'an icon js/hero-motion.js drew inside an old hand-built link or button; Ark\'s blocks draw their own arrows (text)';

function rules(census, { reshaped = [], retired = [] } = {}) {
  const out = { reshaped: {}, retired: {} };
  for (const old of census) {
    if (ICON.test(old.key)) { out.retired[old.key] = ICON_REASON; continue; }
    const r = retired.find(([re]) => re.test(old.key));
    if (r) { out.retired[old.key] = r[1]; continue; }
    const s = reshaped.find(([re]) => re.test(old.key));
    if (s) out.reshaped[old.key] = s[1];
  }
  return out;
}

/* A leaf: its next row (the census is in document order, so a container's first child follows it)
   is not part of its words -- id-keyed containers share no key prefix with their children. */
function leaves(census) {
  return census.filter((old, i) => old.text && old.text.length < 160 && !(census[i + 1] && census[i + 1].text && old.text.includes(census[i + 1].text)));
}

async function check(route, { reshaped = [], retired = [], reworded = [], inspect } = {}) {
  const census = continuity.readCensus(route);
  const expect = rules(census, { reshaped, retired });
  const { keys, extra: seen } = await continuity.pageKeys(route, { inspect: async (window) => {
    const page = window.document.querySelector('[data-ark-page]:not([hidden])') || window.document.querySelector('[data-ark-page]');
    const own = (el) => { const copy = el.cloneNode(true); copy.querySelectorAll('[data-ark-part="term-tip"]').forEach((tip) => tip.remove()); return copy.textContent.replace(/\s+/g, ' '); };
    const common = {
      text: own(page),
      blocks: [...page.children].map((el) => el.getAttribute('data-ark-block') || (el.hasAttribute('data-ark-insert') ? 'insert' : el.id || el.tagName.toLowerCase())),
      refused: page.querySelectorAll('[data-ark-block-refused]').length,
      insert: page.querySelectorAll('[data-ark-insert="main"]').length,
      h1: [...page.querySelectorAll('h1')].map((h) => h.id),
      hiddenByStyle: [...page.querySelectorAll('[style*="display: none"], [style*="display:none"]')].filter((el) => !el.closest('[data-ark-slot]') && !el.closest('[data-account-auth]')).length, /* the shared sign-in bundle toggles its own parts with hidden + display (ark-ui 0.2.19 "keep me signed in", journey audit 2026-10-24) */
      badHrefs: [...page.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(\/|#|https?:\/\/)/.test(h)),
      terms: page.querySelectorAll('[data-ark-part="term"][data-term]').length
    };
    return Object.assign(common, inspect ? await inspect(window, page) : {});
  } });
  const lost = leaves(census).filter((old) => !reworded.some(([re]) => re.test(old.key)) && !continuity.loose(seen.text).includes(continuity.loose(old.text))).map((old) => old.key + ' "' + old.text + '"');
  assert.deepEqual(lost, [], route + ': every leaf of the old page (frozen census) is in the new page\'s words');
  assert.equal(seen.refused, 0, route + ': no block was refused');
  assert.equal(seen.insert, 1, route + ': the CMS insertion anchor is still there');
  assert.equal(seen.h1.length, 1, route + ': one h1');
  assert.equal(seen.hiddenByStyle, 0, route + ': nothing is hidden by an inline style');
  assert.deepEqual(seen.badHrefs, [], route + ': every link opens a real address');
  assert(keys.every((entry) => !/^id:ark-r-/.test(entry.key)), route + ': no generated (ark-r-) id became a layout key');
  /* an icon the page still draws (a live part kept whole, e.g. /explore's raw view) keeps its key */
  const present = new Set(keys.map((entry) => entry.key));
  for (const key of Object.keys(expect.retired)) if (expect.retired[key] === ICON_REASON && present.has(key)) delete expect.retired[key];
  const tally = continuity.assertContinuity(census, keys, expect);
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, route + ': every old key is accounted for');
  const taken = keys.filter((entry) => expect.retired[entry.key]).map((entry) => entry.key);
  assert.deepEqual(taken, [], route + ': no new element carries a retired key (it would take an edit saved for something else)');
  const landed = await continuity.assertSavedEditsLand(route, census, expect);
  assert.equal(landed, census.length - 1 - Object.keys(expect.retired).length, route + ': a saved frame on every old key but page:/ and the retired ones landed');
  return Object.assign(seen, { tally, landed });
}

module.exports = { check, rules, leaves, ICON };
