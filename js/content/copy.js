/* =====================================================================
   COPY TABLE
   ---------------------------------------------------------------------
   Every word a Flux pattern shows lives here and only here. A pattern
   holds a key (`-E-HOME.EYEBROW`), never the words, so nothing in a pattern
   looks like text you can edit in place, and the key still says what it is.
   Change the words in this table; change the layout in the pattern; change
   how a kind of thing looks in its resolver (js/resolvers/).

   A key reads AREA.ROLE in capitals: where the words appear and what they
   are (HOME.TITLE, NAV.THEORY). A key is recognised by that shape, not by a
   list, so a mistyped key is reported as a missing entry and a sentence
   is reported as words.

   A resolver declares which of its props are copy (`copy: ['eyebrow']`)
   and js/ark/runtime.js turns each key into its string once, in one place.
   A prop that is not a key is refused, and the refusal says what to do.

   Only patterns use keys. Text that is not written in a pattern (pages,
   articles) does not belong in this table.
   ===================================================================== */
var ArkCopy = (function () {
  'use strict';

  var table = {
    'HOME.EYEBROW': 'A multidisciplinary studio & school',
    'HOME.TITLE': 'Below the surface',
    'HOME.INTRO': 'We research the systems everyone else takes for granted, design the ones that don\'t exist yet, and refuse to ship anything we can\'t explain.',
    'HOME.STEP': 'INTO THE SUBS',
    'HOME.CTA.PRIMARY': 'Explore the experiments',
    'HOME.CTA.SECONDARY': 'Start a project',
    'NAV.THEORY': 'Frameworks & theories',
    'NAV.EXPERIMENTS': 'Experiments & prototypes',
    'NAV.ABOUT': 'About us & Foundation',
    'NAV.WORK': 'Work & case studies',
  };
  var KEY = /^[A-Z][A-Z0-9]*(\.[A-Z][A-Z0-9]*)+$/;

  function has(key) { return Object.prototype.hasOwnProperty.call(table, key); }
  function isKey(value) { return KEY.test(value); }

  /* key -> words. `where` and `prop` only shape the refusal. */
  function resolve(value, where, prop) {
    if (has(value)) return table[value];
    var label = where + ' prop "' + prop + '"';
    if (isKey(value)) {
      throw new Error('ArkCopy: ' + label + ' asks for ' + value + ', which has no entry. ' +
        'Add it to js/content/copy.js, or use a key that exists.');
    }
    throw new Error('ArkCopy: ' + label + ' is "' + value + '", but patterns hold copy keys, not words. ' +
      'Add the words to js/content/copy.js under a key shaped AREA.ROLE (for example HOME.TITLE) and write that key in the pattern.');
  }

  return { table: table, has: has, isKey: isKey, resolve: resolve };
})();
