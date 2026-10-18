#!/usr/bin/env node
/* Generates js/content/resolver-algebra.js from the flux-spec registry.
 *
 * WHY THIS IS GENERATED. /resolver-math makes a claim about which
 * dimensions of the grammar are closed and which are open, and backs it
 * with counts. Hand-typing those counts makes the page a second corpus
 * that drifts from the registry the moment anyone registers a letter or
 * a verb — and a drifted count on that page is worse than no count,
 * because the page's whole argument is that the boundary is knowable.
 * So the boundary is read from the files that define it.
 *
 * Sources (shared/flux-spec is the source of truth):
 *   flux-spec/registry/role-letters.json    — the 26-letter namespace, and
 *                                             the longer labels beside it
 *   flux-spec/registry/action-verbs.json    — what `A` can say
 *   flux-spec/registry/manifest-types.json  — what `Y` can be
 *
 * GUARDED. Without `--write` this verifies and exits non-zero on drift;
 * it never writes as a side effect of being run or imported. A
 * regenerator that writes when you only meant to look is how a derived
 * artifact silently becomes authored.
 *
 * Usage:
 *   node scripts/gen-resolver-algebra.cjs            # verify only
 *   node scripts/gen-resolver-algebra.cjs --write    # regenerate
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.resolve(ROOT, '..', 'flux-spec', 'registry');
const OUT = path.join(ROOT, 'js', 'content', 'resolver-algebra.js');

/* The registry lives in a sibling repo. It is not vendored, so a
 * checkout without it cannot regenerate — which must be said, not
 * guessed at. */
function registryAvailable() {
  return fs.existsSync(path.join(REGISTRY, 'role-letters.json'));
}

function readRegistry(name) {
  return JSON.parse(fs.readFileSync(path.join(REGISTRY, name), 'utf8'));
}

/* Only the fields the page actually resolves with. Copying the whole
 * registry entry would put its prose on a web page it was not written
 * for. */
function letterShape(entry, verbs) {
  const out = {
    letter: entry.letter,
    name: entry.name,
    group: entry.group,
    payload: entry.payload,
    profile: entry.profile || 'claim'
  };
  if (entry.pattern) out.pattern = entry.pattern;
  if (entry.minLength) out.minLength = entry.minLength;
  if (entry.evenLength) out.evenLength = true;
  if (entry.repeatable) out.repeatable = true;
  if (entry.values) out.values = entry.values.slice();
  if (entry.absorbing) out.absorbing = true;
  if (entry.verbsRef) out.verbs = verbs.slice();
  if (entry.flags) out.flags = Object.keys(entry.flags);
  if (entry.example) out.example = entry.example;
  return out;
}

function build() {
  const roles = readRegistry('role-letters.json');
  const actions = readRegistry('action-verbs.json');
  const types = readRegistry('manifest-types.json');

  const verbs = [];
  const verbGroups = {};
  for (const [group, list] of Object.entries(actions.groups)) {
    verbGroups[group] = list.slice();
    for (const verb of list) verbs.push(verb);
  }

  /* Letters and longer labels, told apart by STRUCTURE — the length of the
   * token — never by a list of known labels. Since specVersion 0.4.3 the
   * registry's `registered[]` holds both: single letters (the 26-letter
   * namespace) and longer labels such as NAME or KK, and a box takes the
   * LONGEST label it starts with. Counting a label as a letter is the
   * defect this split exists to prevent: it once made /resolver-math claim
   * 25 role letters and made the 26-letter check see 31. */
  const registered = roles.registered
    .filter((entry) => entry.letter.length === 1)
    .map((entry) => letterShape(entry, verbs));

  /* Every letter of the 26 is accounted for by construction in the
   * registry; assert it here rather than trusting it, because the
   * page's argument is that an unaccounted letter is a latent bug. Single
   * letters only: a longer label is not a letter of the namespace, it is
   * a token that opens WITH one. */
  const status = {};
  for (const r of registered) status[r.letter] = 'registered';
  for (const r of roles.reservedInvalid) status[r.letter] = 'reservedInvalid';
  for (const r of roles.reservedTooling) status[r.letter] = 'reservedTooling';
  for (const l of roles.free) status[l] = 'free';
  const missing = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    .split('')
    .filter((l) => !status[l]);
  if (missing.length) {
    throw new Error(
      'role-letters.json does not account for: ' + missing.join(', ') +
      ' — the namespace collides quietly, so an unaccounted letter is a ' +
      'latent silent-collision bug. Fix the registry, not this script.'
    );
  }

  /* Each longer label records every shorter token it starts with, and
   * what that token is. Longest-match reads the label first, so this is
   * exactly what the label takes precedence over: under a reserved letter
   * (NAME under N) it takes nothing from a live role; under a registered
   * one (TITLE under T) every payload of that letter beginning with the
   * rest of the label now belongs to the label instead. Derived here so
   * the page states that trade from the registry rather than from prose. */
  const longer = roles.registered.filter((entry) => entry.letter.length > 1);
  const labelTokens = longer.map((entry) => entry.letter);
  const labels = longer.map((entry) => {
    const shape = letterShape(entry, verbs);
    delete shape.letter;
    const opener = entry.letter.charAt(0);
    if (!status[opener]) {
      throw new Error(
        'role-letters.json registers the label ' + entry.letter + ', which opens with "' +
        opener + '" — not a letter of the 26-letter namespace, so no reader that falls ' +
        'back to the single letter can place it. Fix the registry, not this script.'
      );
    }
    const startsWith = [{ token: opener, status: status[opener] }];
    for (const other of labelTokens) {
      if (other !== entry.letter && entry.letter.startsWith(other)) {
        startsWith.push({ token: other, status: 'label' });
      }
    }
    startsWith.sort((a, b) => a.token.length - b.token.length);
    return Object.assign({ label: entry.letter }, shape, { startsWith });
  });

  /* Type-scoped letter shapes. This is the one place the grammar really
   * is observer-relative in the strong sense: a letter with no single
   * global shape may be given one PER manifest type, so the same letter
   * at the same position means different things to different readers.
   * The page argues from this, so it is read rather than described. */
  const scoped = [];
  for (const type of types.types) {
    const ext = type.letterExtensions;
    if (!ext) continue;
    for (const [letter, def] of Object.entries(ext)) {
      scoped.push({
        letter,
        type: type.name || type.type || type.code,
        code: type.code,
        shape: def.shape,
        definedIn: def.definedIn
      });
    }
  }

  return {
    specVersion: roles.specVersion,
    source: 'flux-spec/registry · role-letters.json, action-verbs.json, manifest-types.json',
    roles: {
      registered,
      labels,
      reservedInvalid: roles.reservedInvalid.map((r) => ({ letter: r.letter, reason: r.reason })),
      reservedTooling: roles.reservedTooling.map((r) => ({ letter: r.letter, reason: r.reason })),
      free: roles.free.slice(),
      freeNote: roles.freeNote
    },
    verbs: {
      all: verbs,
      groups: verbGroups,
      flags: Object.keys(actions.flags || {}),
      unregisteredThrows: actions.unregisteredVerbsThrow === true
    },
    manifestTypes: {
      count: types.types.length,
      openSet: types.openSet === true,
      openSetNote: types.openSetNote
    },
    typeScoped: {
      entries: scoped,
      /* Verbatim, because it is the rule that makes observer-relative
       * meaning safe between peers and the page quotes it as such. */
      note: types.letterExtensions && types.letterExtensions.note
    }
  };
}

function render(data) {
  const json = JSON.stringify(data, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');
  return `/* GENERATED — do not edit by hand.
   Run: node scripts/gen-resolver-algebra.cjs --write

   Source: ${data.source}
   Spec version: ${data.specVersion}

   This is the boundary /resolver-math argues about: which dimensions of
   the grammar are CLOSED (a position; adding one risks a silent
   collision) and which are OPEN (a payload; a name of a thing is an
   address, never a parameter). Every count on that page is read from
   here, so the page cannot drift from the registry without this file
   drifting first — which tests/resolver-algebra.cjs fails on. */
(function () {
  'use strict';
  var DATA = ${json};
  var api = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  api.ArkResolverAlgebra = Object.freeze(DATA);
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})();
`;
}

function main(argv) {
  const write = argv.includes('--write');

  if (!registryAvailable()) {
    console.error(
      'REFUSED: cannot regenerate.\n' +
      '  failure: the flux-spec registry is not readable.\n' +
      '  missing: ' + path.join(REGISTRY, 'role-letters.json') + '\n' +
      '  remedy:  check out flux-spec beside defxn, then re-run. The\n' +
      '           committed js/content/resolver-algebra.js is left\n' +
      '           untouched; it is not regenerated from a guess.'
    );
    return 2;
  }

  const next = render(build());
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

  if (current === next) {
    console.log('resolver-algebra.js is current.');
    return 0;
  }

  if (!write) {
    console.error(
      'DRIFT: js/content/resolver-algebra.js disagrees with the registry.\n' +
      '  remedy: node scripts/gen-resolver-algebra.cjs --write'
    );
    return 1;
  }

  fs.writeFileSync(OUT, next);
  console.log((current === null ? 'wrote ' : 'updated ') + path.relative(ROOT, OUT));
  return 0;
}

module.exports = { build, render, registryAvailable, OUT };

/* The import guard. A module whose top level does work runs that work on
 * require; this one writes files, so it runs only when invoked. */
if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
