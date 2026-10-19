/* LAW: /resolver-math may not hand-type the boundary it argues about.
 *
 * The page's claim is that the grammar is CLOSED in its positions and
 * UNBOUNDED in its payloads, and it puts counts behind that. A count
 * typed into a page drifts the moment somebody registers a letter or a
 * verb, and a drifted count is worse than none here, because the whole
 * argument is that the boundary is knowable. So:
 *
 *   1. the counts come from js/content/resolver-algebra.js, which is
 *      GENERATED from flux-spec/registry;
 *   2. this test regenerates it and fails on drift;
 *   3. the collision cases the registry documents by name are regression
 *      cases here, each carrying the reason it exists.
 *
 * Why (3) matters more than it looks: `TYPEGHOST` resolving SUCCESSFULLY
 * and wrongly is the entire argument for a closed position list. If a
 * plausible tidy-up ever made that case refuse instead, the page would
 * still render perfectly and the argument would be silently gone. Every
 * case below says what it is protecting.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'js', 'pages', 'resolver-math.js');
const DOC = path.join(ROOT, 'docs', 'resolver-math.md');
const DATA = path.join(ROOT, 'js', 'content', 'resolver-algebra.js');

const ALG = require(DATA);
const { build, restrict } = require(path.join(ROOT, 'js', 'content', 'resolver-block.js'));
const engine = build(ALG);
const resolve = engine.resolveBlock;

const page = fs.readFileSync(PAGE, 'utf8');
const catalog = fs.readFileSync(path.join(ROOT, 'js', 'pages', 'catalog.js'), 'utf8');
const doc = fs.readFileSync(DOC, 'utf8');

const eqScheduled = [];
let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  void name;
}

/* -------------------------------------------------------------------- */
/* 1. The generated census agrees with the registry                      */
/* -------------------------------------------------------------------- */

const gen = require(path.join(ROOT, 'scripts', 'gen-resolver-algebra.cjs'));

if (gen.registryAvailable()) {
  check('generated census matches flux-spec/registry', () => {
    const expected = gen.render(gen.build());
    const actual = fs.readFileSync(gen.OUT, 'utf8');
    assert.equal(
      actual,
      expected,
      'js/content/resolver-algebra.js has drifted from flux-spec/registry.\n' +
        '  remedy: node scripts/gen-resolver-algebra.cjs --write\n' +
        '  why it matters: /resolver-math states counts of what the grammar admits.\n' +
        '  A stale count there is a claim nobody can reproduce.'
    );
  });
} else {
  /* Not a pass. A refusal that names what it needs — the behaviour tests
   * below still run against the committed file, so this is a reduced
   * check, said out loud rather than counted as a full one. */
  console.log(
    'REDUCED: flux-spec/registry is not readable from this checkout, so the\n' +
      '  generated census could not be re-derived and compared.\n' +
      '  missing: ../flux-spec/registry/role-letters.json\n' +
      '  remedy:  check out flux-spec beside defxn and re-run.\n' +
      '  still checked: every behaviour case below, against the committed file.'
  );
}

/* -------------------------------------------------------------------- */
/* 2. The namespace is closed, and that is what closed means             */
/* -------------------------------------------------------------------- */

check('every letter of the 26 is accounted for', () => {
  const accounted = new Set([
    ...ALG.roles.registered.map((r) => r.letter),
    ...ALG.roles.reservedInvalid.map((r) => r.letter),
    ...ALG.roles.reservedTooling.map((r) => r.letter),
    ...ALG.roles.free
  ]);
  const missing = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((l) => !accounted.has(l));
  assert.deepEqual(
    missing,
    [],
    'unaccounted role letters: ' + missing.join(', ') +
      ' — an unaccounted letter is a latent silent-collision bug, which is the ' +
      'hazard the page tells readers is handled.'
  );
  assert.equal(accounted.size, 26, 'the namespace is 26 letters; got ' + accounted.size);
});

/* REGRESSION, 2026-10-18. specVersion 0.4.3 put longer labels (NAME,
 * TITLE, KK, KIND, CHAIN) into role-letters.json's `registered[]` beside the
 * single letters. The census copied all of them into `roles.registered`,
 * so the check above saw 31 "letters" and /resolver-math told readers the
 * grammar had 25 role letters. A label is a token that OPENS with a letter
 * of the namespace; it is not one. The split is by length — structure, not
 * a list of known labels — and it is checked against the registry itself,
 * so a label registered tomorrow is classified without anyone editing this. */
check('a longer label is never counted as a letter of the namespace', () => {
  const longIn = ALG.roles.registered.filter((r) => r.letter.length !== 1).map((r) => r.letter);
  assert.deepEqual(
    longIn, [],
    'roles.registered carries tokens longer than one letter: ' + longIn.join(', ') + '. ' +
      'They belong in roles.labels. Counted as letters they overflow the 26-letter namespace ' +
      'and inflate the "role letters" figure on the page.'
  );
  assert.ok(Array.isArray(ALG.roles.labels), 'the census has no roles.labels list');
  for (const l of ALG.roles.labels) {
    assert.ok(l.label.length > 1, `${l.label} is in roles.labels but is a single letter`);
    assert.ok(!('letter' in l), `${l.label} carries a "letter" field; a label is not a letter`);
    assert.equal(
      l.startsWith[0].token, l.label.charAt(0),
      `${l.label} must record the letter it opens with first — that is the token longest ` +
        'match reads it instead of'
    );
  }
  if (gen.registryAvailable()) {
    const reg = JSON.parse(fs.readFileSync(
      path.resolve(ROOT, '..', 'flux-spec', 'registry', 'role-letters.json'), 'utf8'));
    const longer = reg.registered.filter((e) => e.letter.length > 1).map((e) => e.letter);
    assert.deepEqual(
      ALG.roles.labels.map((l) => l.label), longer,
      'roles.labels disagrees with the registry\'s own multi-character entries'
    );
    assert.equal(
      ALG.roles.registered.length + ALG.roles.labels.length, reg.registered.length,
      'letters plus labels must account for every registered entry, none dropped'
    );
  }
});

check('at least one role absorbs, or the page overstates the hazard', () => {
  const absorbing = ALG.roles.registered.filter((r) => r.absorbing);
  assert.ok(
    absorbing.length > 0,
    'no role is marked absorbing, yet the page argues the closed position list exists ' +
      'because some roles swallow anything alphanumeric. If absorbing roles were ' +
      'removed from the grammar, rewrite the page rather than leaving the claim.'
  );
});

/* -------------------------------------------------------------------- */
/* 3. The registry's own worked collisions, as regression cases          */
/* -------------------------------------------------------------------- */

/* Each case names the hazard it protects. Shape only — none of these
 * verifies a signature, and the page says so. */
const CASES = [
  {
    block: 'TYPEGHOST',
    state: 'hazard',
    protects:
      'THE case. `T` accepts any dash-free alphanumeric text, so TYPEGHOST resolves ' +
      'SUCCESSFULLY to an opaque Target and is wrong. This is why manifest types live ' +
      'on `Y`. If this ever starts refusing, the page keeps rendering and its central ' +
      'argument is gone.'
  },
  {
    block: 'NOTIFY',
    state: 'unreal',
    protects:
      '`N` is parked in tooling precisely because a "deny" role would resolve NOTIFY to ' +
      '{Denied:"OTIFY"}. The letter must refuse, by name.'
  },
  {
    block: 'QUERY',
    state: 'unreal',
    protects: 'structural rejection: `Q` is hex-of-UTF-8, and UERY is not hex.'
  },
  {
    block: 'UPDATE',
    state: 'unreal',
    protects:
      '`U` validates against a closed set, the strongest structural rejection available: ' +
      'PDATE is not a status.'
  },
  {
    block: 'LABEL',
    state: 'unreal',
    protects: '`L` is digits only, so ABEL is not a lattice point.'
  },
  {
    block: 'AREMIX',
    state: 'unreal',
    protects:
      'an unregistered verb THROWS rather than falling back to a default meaning. This is ' +
      'axiom 1 at the grammar layer, and it is what makes "expand the resolver, expand ' +
      'reality" a real statement rather than a slogan.'
  },
  {
    block: 'ZFOO',
    state: 'unreal',
    protects: '`Z` is reserved-invalid by the reference suite; registering it would make the ' +
      'superseded wordy grammar parse again.'
  },
  {
    block: 'ASEND',
    state: 'real',
    protects: 'the clean case still works — a test suite that only proves refusals proves ' +
      'the parser is broken.'
  },
  {
    block: 'AFOLLOW',
    state: 'real',
    protects:
      'FOLLOW was inexpressible until the social verb group was registered on 2026-08-14. ' +
      'The page dates that claim; this is the case behind it.'
  },
  {
    block: 'YGHOST',
    state: 'real',
    protects: '`Y` carries the manifest type specifically so nobody writes TYPE... and has ' +
      'it swallowed by `T`.'
  },
  {
    block: 'L418400',
    state: 'real',
    protects: 'a lattice point is NOT the decimal it looks like; the shape rule must accept ' +
      'the encoded integer.'
  },
  {
    block: 'Q636f6e63657074',
    state: 'real',
    protects: 'the unbounded half: an arbitrary string enters as hex of its UTF-8, which is ' +
      'how a 63-character alphabet carries an unbounded symbol space.'
  }
];

/* Longest match. These were all resolved by the FIRST CHARACTER until
 * 2026-10-18, which is wrong for every one of them, and quietly wrong for
 * the worst one: TITLE68656c6c6f "resolved" as an opaque Target, the exact
 * silent collision the explorer exists to show, produced by the explorer. */
CASES.push(
  {
    block: 'NAMEalice',
    state: 'real',
    label: 'NAME',
    protects: 'NAME is a registered label; read by its first character it was refused as the ' +
      'tooling letter N. A box takes the longest label it starts with.'
  },
  {
    block: 'TITLE68656c6c6f',
    state: 'real',
    label: 'TITLE',
    protects: 'read by its first character this SUCCEEDED as an opaque Target "ITLE68656c6c6f" — ' +
      'a silent collision, the one failure the page says is worse than a refusal.'
  },
  {
    block: 'TITLEfoo',
    state: 'unreal',
    label: 'TITLE',
    protects: 'once TITLE wins the match, its payload rule (hex of UTF-8) applies; T\'s ' +
      'absorbing rule must not quietly take the block back.'
  },
  {
    block: 'KKDAO1',
    state: 'real',
    label: 'KK',
    protects: 'the shipped sub-kind marker. K alone is reserved invalid; KK is a disjoint ' +
      'two-letter label and must resolve, or every live LedgerEntry kind reads as refused.'
  },
  {
    block: 'CHAINmychain1',
    state: 'real',
    label: 'CHAIN',
    protects: 'CHAIN\'s payload kind (lowercase-alphanumeric) had no rule in the engine; a label ' +
      'must be judged by its own rule, not reported as a gap.'
  }
);

for (const c of CASES) {
  check('block ' + c.block, () => {
    const r = resolve(c.block);
    assert.equal(
      r.state,
      c.state,
      `resolve(${c.block}) is "${r.state}", expected "${c.state}".\n` +
        `  protects: ${c.protects}\n` +
        `  got: ${r.head} ${JSON.stringify(r.lines[r.lines.length - 1] || [])}`
    );
    if (c.label) {
      const match = r.lines.find((l) => l[0] === 'Longest match');
      assert.ok(
        match && match[1].includes('Read as ' + c.label),
        `resolve(${c.block}) does not say it was read as ${c.label}. A reader must see WHICH ` +
          'label won, or a longest-match result is indistinguishable from a guess.'
      );
    }
  });
}

check('longest match names the payloads a label takes from a live letter', () => {
  for (const l of ALG.roles.labels) {
    const r = resolve(l.example);
    const match = (r.lines.find((x) => x[0] === 'Longest match') || [])[1] || '';
    const live = l.startsWith.filter((p) => p.status === 'registered' || p.status === 'label');
    for (const p of live) {
      assert.ok(
        match.includes('"' + l.label.slice(p.token.length) + '"'),
        `${l.label} opens with the registered ${p.token}, so no ${p.token} payload can begin ` +
          `with "${l.label.slice(p.token.length)}" any more. The verdict must say so: that ` +
          'trade is the collision audit, made visible.'
      );
    }
    if (!live.length) {
      assert.ok(/takes nothing away/.test(match),
        `${l.label} opens with a letter that cannot resolve; the verdict must say it costs no live role`);
    }
  }
});

check('withholding a label sends its blocks back to the letter they open with', () => {
  const noName = build(restrict(ALG, { letters: ['NAME'] }));
  const r = noName.resolveBlock('NAMEalice');
  assert.equal(
    r.state, 'unreal',
    'with NAME withheld, NAMEalice must fall back to N and be refused. If it still resolves, ' +
      'restrict() is not restricting labels and the builder would show a sum it did not compute.'
  );
  assert.ok(/tooling/i.test(r.head), 'the fallback must be N\'s own refusal, by name');
});

/* -------------------------------------------------------------------- */
/* 3a. The built form of S(s, i, O) — type-scoped letters                */
/* -------------------------------------------------------------------- */

check('a type-scoped letter resolves to "depends on the observer", not to a refusal', () => {
  assert.ok(ALG.roles.free.length > 0, 'no free letter left; update this case deliberately');
  const letter = ALG.roles.free[0];
  const scoped = ALG.typeScoped.entries.filter((e) => e.letter === letter);
  assert.ok(
    scoped.length > 0,
    `${letter} is free and no type declares a shape for it, so the observer-relative claim ` +
      'on the page has nothing behind it. Either the registry changed or the page overstates.'
  );

  const r = resolve(letter + 'foo');
  assert.equal(
    r.state,
    'relative',
    `resolve(${letter}foo) is "${r.state}", expected "relative".\n` +
      '  protects: calling this a refusal was WRONG and shipped once. ' + letter +
      ' is the chain position on a LEDGERENTRY and a different shape on a POOL — it has no ' +
      'global meaning, which is not the same as having none.'
  );

  const text = JSON.stringify(r.lines);
  assert.ok(
    /S\(/.test(text),
    'the verdict must name the algebra term it is demonstrating; this is the one place the ' +
      'observer argument is built rather than described'
  );
  assert.ok(
    /\bY\b[^"]*global|global[^"]*\bY\b/.test(text),
    'the verdict must state why peers still agree: Y is always global, so a reader ' +
      'establishes which observer applies before interpreting anything relative. Without ' +
      'that sentence the page argues for private meanings, which would make signatures ' +
      'worthless between peers.'
  );
  assert.ok(
    /carries no meaning|undefined/i.test(text),
    'the verdict must say what happens for a type that declares no shape — S undefined, ' +
      'scoped. Otherwise observer-relativity reads as "anything goes".'
  );
});

check('the observer table is small enough to print, and is printed', () => {
  const rows = engine.observerTable();
  assert.ok(rows.length > 0, 'no type-scoped letters; the page section would be empty');
  assert.ok(
    rows.length < 40,
    'the page prints this table in full and calls it "deliberately tiny". At ' + rows.length +
      ' rows that is no longer honest — paginate it or rewrite the claim.'
  );
  for (const row of rows) {
    assert.ok(row.letter && row.type && row.shape, 'a type-scoped row is missing a field');
    assert.ok(
      row.definedIn,
      `${row.letter} on ${row.type} has no definedIn. An observer-relative meaning with no ` +
        'owning spec is unauditable — a reader cannot find out what it means.'
    );
  }
});

check('Y is never type-scoped, or the agreement argument collapses', () => {
  const yScoped = ALG.typeScoped.entries.filter((e) => e.letter === 'Y');
  assert.deepEqual(
    yScoped,
    [],
    'Y has become type-scoped. The page argues peers agree because the type letter is ' +
      'always global — if Y itself were relative, a reader could not establish which ' +
      'observer applies, and the whole section is wrong rather than merely stale.'
  );
});

check('a refused block never reports its rate or score as zero', () => {
  const refused = resolve('QUERY');
  const text = JSON.stringify(refused);
  assert.ok(
    !/\b0\b(?!x)/.test(text.replace(/[0-9a-f]{6,}/gi, '')),
    'a refusal must not carry a zero: zero means "measured, and scored nothing". ' +
      'An unresolved dimension is absent, which is a different and weaker claim.'
  );
});

check('shape resolution verifies no signature, and does not imply it did', () => {
  const r = resolve('ASEND');
  const text = JSON.stringify(r.lines).toLowerCase();
  assert.ok(
    text.includes('no signature has been checked'),
    'the "real" verdict must say that only shape was checked. Otherwise a reader takes ' +
      'a shape pass for an admitted, signed record.'
  );
});

/* -------------------------------------------------------------------- */
/* 4. It is a page OF this site, and reads the census rather than typing */
/* -------------------------------------------------------------------- */

/* The standalone resolver-math.html was correct and looked like it came
 * from nowhere: its own palette, no header, no breadcrumb, no way back.
 * These checks keep it a route of the site. */
check('the page is a registered route with its scripts declared', () => {
  const route = require('./lib/site-catalog.cjs').loadCatalog().catalog['resolver-math'];
  assert.ok(
    route && route.path === '/resolver-math',
    'js/pages/catalog.js has no /resolver-math route. Without it the page is unreachable ' +
      'through the site shell and the address falls back to the app shell.'
  );
  const entry = JSON.stringify(route);
  for (const script of [
    'js/ark/dash-kit.js',
    'js/content/resolver-algebra.js',
    'js/content/resolver-block.js',
    'js/pages/resolver-math.js'
  ]) {
    assert.ok(
      entry.includes(script),
      `the /resolver-math route does not load ${script}. The page-loader loads only what the ` +
        'catalog declares, so a missing script is a blank section at runtime.'
    );
  }
  assert.ok(
    route.module === 'resolverMath',
    "the route must name the module it mounts ('resolverMath')"
  );
  assert.ok(
    !route.hiddenFromNavigation && !!route.journey,
    'the page must stay in navigation; being unreachable is what made it feel like it ' +
      'dropped out of nowhere'
  );
});

check('there is no standalone copy of the page left behind', () => {
  assert.ok(
    !fs.existsSync(path.join(ROOT, 'resolver-math.html')),
    'resolver-math.html is back. Two copies of this page means one of them is stale and ' +
      'the clean path serves whichever the server finds first.'
  );
});

check('it sits in the same journey as "what is a resolver", not with the evidence', () => {
  // The menu's groups are derived from each page's journey (js/content/site-pages.js) since
  // 2026-10-19; the hand-written `understand` array in header.js is gone.
  const { sitePages } = require('./lib/site-catalog.cjs').loadCatalog();
  assert.equal(sitePages.journeyOf('resolver-math'), sitePages.journeyOf('resolver'),
    'resolver-math is not in the same journey as "what is a resolver". It is a foundational concept, not an evidence page.');
  assert.notEqual(sitePages.journeyOf('resolver-math'), 'prove', 'and it is not filed with the evidence');
});

check('it uses the shared dashboard kit, not a private layout', () => {
  assert.ok(
    /ArkUI\.dash/.test(page),
    'the page does not use ArkUI.dash. It would then carry its own panel, grid and table ' +
      'builders, which is how two pages that should look identical drift apart.'
  );
  for (const shared of ['dash-shell', 'dash-grid', 'dash-panel', 'dash-section']) {
    assert.ok(
      page.includes(shared) || /D\.(shell|panel|sectionHead|table|stat)\(/.test(page),
      `the page should compose the shared ${shared} vocabulary`
    );
  }
  assert.ok(
    /content-layer-path/.test(fs.readFileSync(path.join(ROOT, 'js', 'ark', 'dash-kit.js'), 'utf8')),
    'the shared shell must render the breadcrumb; arriving with no way back is the ' +
      'complaint this page was rebuilt to fix'
  );
});

check('the page does not hand-type the registry counts', () => {
  /* The real numbers today. If the registry changes, the generated file
   * changes and the page follows; a literal here would not. */
  const typed = [
    String(ALG.roles.registered.length) + ' registered',
    String(ALG.roles.labels.length) + ' longer labels',
    String(ALG.roles.registered.length + ALG.roles.labels.length) + ' role letters',
    String(ALG.verbs.all.length) + ' verbs',
    String(ALG.manifestTypes.count) + ' catalogued'
  ];
  for (const literal of typed) {
    assert.ok(
      !page.includes(literal),
      `js/pages/resolver-math.js contains the literal "${literal}". That count must be ` +
        'rendered from js/content/resolver-algebra.js, or it drifts from the registry silently.'
    );
  }
});

check('the page states the not-built pieces instead of implying them', () => {
  for (const needed of ['Not built', 'Rejected, not pending', 'Overstated']) {
    assert.ok(
      page.includes(needed),
      `the page must carry the "${needed}" status. The algebra it describes is larger than ` +
        'what exists; each gap is named, never reported as working and never as zero.'
    );
  }
});

check('the page keeps the four axioms tied to named tests', () => {
  for (const named of [
    'a_forged_intent_fails_the_whole_batch',
    'a_replica_stores_without_verifying',
    'a_replayed_nonce_is_refused_and_named',
    'a_reordered_batch_fails_the_audit'
  ]) {
    assert.ok(page.includes(named), `axiom evidence lost: ${named} is no longer cited`);
  }
});

/* -------------------------------------------------------------------- */
/* 4b. The equation is operable: remove a term, lose a capability        */
/* -------------------------------------------------------------------- */

/* The page's whole claim is that what exists is the SUM of what somebody
 * defined. An interactive widget could fake that with a lookup table. It
 * does not: it rebuilds the real resolver from a census with parts
 * withheld. These checks hold that honest — if `restrict` ever stopped
 * actually restricting, the page would still animate convincingly and
 * would be lying. */
check('removing a verb group really makes its capabilities inexpressible', () => {
  const full = engine;
  assert.equal(full.resolveBlock('AFOLLOW').state, 'real', 'AFOLLOW resolves today');
  assert.equal(full.resolveBlock('ABUY').state, 'real', 'ABUY resolves today');

  const noSocial = build(restrict(ALG, { verbGroups: ['social'] }));
  assert.equal(
    noSocial.resolveBlock('AFOLLOW').state, 'unreal',
    'with the social verbs withheld, AFOLLOW must stop resolving. If it still resolves, the ' +
      'builder on the page is theatre: it would show capabilities vanishing while the ' +
      'grammar underneath never changed.'
  );
  assert.equal(
    noSocial.resolveBlock('ASEND').state, 'real',
    'withholding the social verbs must not take the messaging verbs with it — a restriction ' +
      'that removes too much proves nothing either'
  );

  const noAmm = build(restrict(ALG, { verbGroups: ['amm'] }));
  assert.equal(noAmm.resolveBlock('ABUY').state, 'unreal', 'ABUY needs the AMM verbs');
  assert.equal(noAmm.resolveBlock('AFOLLOW').state, 'real', 'the AMM verbs are not the social ones');
});

check('removing the type-scoped shapes takes the bending letter with them', () => {
  const letter = ALG.roles.free[0];
  assert.equal(engine.resolveBlock(letter + 'foo').state, 'relative',
    `${letter} depends on the record type today`);
  const flat = build(restrict(ALG, { typeScoped: true }));
  assert.equal(
    flat.resolveBlock(letter + 'foo').state, 'unreal',
    `with no type-scoped shapes defined, ${letter} must carry no meaning anywhere. ` +
      'Observer-relative meaning is itself something somebody defined — it is a term of the ' +
      'sum, not a property of the universe.'
  );
});

check('a letter nobody defined is absent in both directions', () => {
  /* Both ends of the claim: ALEND fails because no verb was defined, and it
   * keeps failing no matter what else is on, because nothing in the sum
   * adds up to it. */
  assert.equal(engine.resolveBlock('ALEND').state, 'unreal',
    'lending has no verb, so it cannot be said — this is the page\'s headline zero');
  assert.equal(engine.resolveBlock('ASPLIT').state, 'unreal',
    'split payments have no verb either');
  const everything = build(restrict(ALG, {}));
  assert.equal(
    everything.resolveBlock('ALEND').state, 'unreal',
    'with every definition present, lending is STILL unsayable. That is the point: it is ' +
      'missing from the dictionary, not throttled by anything.'
  );
});

/* -------------------------------------------------------------------- */
/* 5. The page RENDERS it — not just "the data is correct somewhere"     */
/* -------------------------------------------------------------------- */

/* A passing engine test with a blank page is the defect this guards:
 * every number could be right and the reader still sees empty tables. So
 * mount the real page module against a small DOM and assert on what a
 * visitor would actually read. */
check('the page module mounts and renders every section', () => {
  const vm = require('node:vm');

  const scheduled = new Map();
  let clockId = 0;

  class Node {
    constructor(tag) {
      this.tagName = tag; this.className = ''; this.children = []; this.dataset = {};
      this.attrs = {}; this.listeners = {}; this.style = { setProperty() {} };
      this._text = ''; this.value = ''; this.type = ''; this.hidden = false;
    }
    get offsetWidth() { return 1; }
    get classList() {
      const self = this;
      return {
        add(...n) { self.className = (self.className + ' ' + n.join(' ')).trim(); },
        remove(...n) { self.className = self.className.split(' ').filter((c) => !n.includes(c)).join(' '); },
        contains(n) { return self.className.split(' ').includes(n); }
      };
    }
    appendChild(c) { this.children.push(c); c.parent = this; return c; }
    replaceChildren(...c) { this.children = c; }
    /* SVG sets class and data-* through setAttribute, so mirror them the
       way a real element does — otherwise every <rect> is invisible to a
       class or dataset lookup and a check silently passes on nothing. */
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'class') this.className = String(v);
      if (k.startsWith('data-')) {
        this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
      }
    }
    getAttribute(k) { return this.attrs[k]; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
    all() { return [this].concat(...this.children.map((c) => c.all())); }
    find(cls) { return this.all().filter((n) => String(n.className).split(' ').includes(cls)); }
  }

  const document = {
    createElement: (t) => new Node(t),
    createElementNS: (_ns, t) => new Node(t),
    createTextNode: (t) => { const n = new Node('#text'); n.textContent = String(t); return n; }
  };
  const sandbox = {
    document, console, Date, Math, Number, String, encodeURIComponent,
    /* The equation plays on mount, so every sandbox needs a clock and a
       motion query. A bounded, settling play is the house contract. */
    setTimeout: (fn, ms) => { eqScheduled.push({ fn, ms }); return eqScheduled.length; },
    clearTimeout: () => {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    ArkUI: {
      pageModules: {},
      pageCatalog: {
        zero: { path: '/' }, resolver: { path: '/what-is-a-resolver' },
        stats: { path: '/stats' }, reference: { path: '/reference' },
        'resolver-math': { path: '/resolver-math' }
      },
      route: { href: (p) => p }
    }
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  for (const file of [
    path.join(ROOT, 'js', 'ark', 'dash-kit.js'),
    path.join(ROOT, 'js', 'ark', 'story-diagrams.js'),
    DATA,
    path.join(ROOT, 'js', 'content', 'resolver-block.js'),
    PAGE
  ]) vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);

  const module = ctx.ArkUI.pageModules.resolverMath;
  assert.ok(module, 'the page module did not register as ArkUI.pageModules.resolverMath');

  const host = new Node('main');
  const el = module.mount(host);
  assert.ok(el && el.dataset, 'mount() must return its page element, or the router throws');
  assert.equal(host.children[0], el, 'the returned element is the one mounted');

  /* Part of the site, not an island: breadcrumb, kicker, title, lede. */
  const crumbs = el.find('content-layer-path');
  assert.equal(crumbs.length, 1, 'the page must render the site breadcrumb');
  assert.ok(
    crumbs[0].textContent.includes('Home'),
    'the breadcrumb must offer a way back; arriving with no way back is what made this page ' +
      'feel like it dropped out of nowhere'
  );
  assert.equal(el.find('dash-shell').length, 1, 'the page must use the shared dashboard shell');
  assert.ok(el.find('dash-kicker').length, 'the shared header kicker is missing');
  assert.ok(el.find('dash-h1').length, 'the shared header title is missing');
  assert.ok(el.find('dash-section-title').length >= 6, 'the page lost its section structure');
  assert.ok(el.find('rm-say').length >= 10, 'the builder lists what can be said; it is ' +
    'the page\'s one interactive proof that the result is a sum of definitions');

  /* The algebra, and every table that carries the argument. */
  assert.equal(el.find('rm-equation-form').length, 3, 'the algebra renders three lines');

  function rowsOf(cls) {
    const t = el.find(cls)[0];
    assert.ok(t, `no ${cls} table rendered`);
    return t.all().filter((n) => n.tagName === 'tbody').flatMap((b) => b.children);
  }

  const expectedLayers = engine.layers().length;
  assert.ok(expectedLayers >= 4, 'the census lost a dimension; it should have at least four');
  assert.equal(
    rowsOf('rm-layers').length, expectedLayers,
    `the census must render all ${expectedLayers} dimensions. An empty table reads as ` +
      '"nothing here".'
  );
  assert.equal(
    rowsOf('rm-observers').length, engine.observerTable().length,
    'the observer table must render every type-scoped letter. This is the only place the ' +
      'page shows S(s, i, O) actually built, so a blank table turns a demonstration into an ' +
      'assertion.'
  );

  /* Counted from the page's own list, so adding a resolver cannot leave a
   * stale number here. */
  const declaredCount = (page.match(/\{ name: '/g) || []).length;
  const unbuiltCount = (page.match(/built: false/g) || []).length;
  assert.ok(declaredCount >= 20, 'the resolver list shrank unexpectedly');
  assert.ok(el.find('rm-limits')[0], 'the measured-limits table did not render');

  const layerText = el.find('rm-layers')[0].textContent;
  for (const needed of ['closed', 'open', 'unbounded', 'relative']) {
    assert.ok(
      layerText.includes(needed),
      `the census must show the "${needed}" status; the page's whole claim is that some ` +
        'dimensions are closed and others are not'
    );
  }
  assert.ok(
    layerText.includes(String(ALG.verbs.all.length)),
    'the rendered census must carry the live verb count from the generated file'
  );

  /* The explorer, with its default case resolved. */
  const verdict = el.find('rm-verdict')[0];
  assert.ok(verdict, 'the block explorer did not render');
  /* The explorer opens on TYPEGHOST deliberately: the silent collision is
   * the case worth landing on, and a reader who changes nothing still sees
   * the one result that is alarming. */
  assert.equal(
    verdict.dataset.state, 'hazard',
    'the explorer should open on the collision case, not a clean one. Got: ' + verdict.dataset.state
  );
  assert.ok(
    verdict.textContent.includes('opaque Target'),
    'the explorer must render its default resolution. Got: ' + verdict.textContent.slice(0, 120)
  );
  assert.ok(
    el.find('rm-chip').length >= 8,
    'the worked examples must be one-click chips, or nobody tries the collision cases — ' +
      'which are the point'
  );

  /* Not built is listed by name, in the same table as the built ones, so
   * the absence is as visible as the presence. */
  const limitRows = el.find('rm-limits')[0].all()
    .filter((n) => n.tagName === 'tbody').flatMap((b) => b.children);
  assert.equal(
    limitRows.length, declaredCount,
    `the limits table must list every resolver, built or not; got ${limitRows.length} of ` +
      `${declaredCount}. Hiding the unbuilt ones is how "not built" quietly becomes "zero".`
  );
  /* Scoped to the limits table: the gaps table lower down carries its own
   * not-built tags and they are a different claim. */
  const limitTags = el.find('rm-limits')[0].all()
    .filter((n) => String(n.className).split(' ').includes('rm-tag') && n.dataset.kind === 'notbuilt');
  assert.equal(
    limitTags.length, unbuiltCount,
    `every unbuilt resolver must carry a "not built" tag rather than an empty cell; ` +
      `${limitTags.length} of ${unbuiltCount} did`
  );

  assert.ok(
    el.textContent.includes('flux-spec/registry'),
    'the page must say where its census came from'
  );
});

/* A missing generated file must be said out loud on the page, not left as
 * empty tables that read as "there is nothing here". */
check('the page refuses by name when the census did not load', () => {
  const vm = require('node:vm');
  class Node {
    constructor(tag) {
      this.tagName = tag; this.className = ''; this.children = []; this.dataset = {};
      this.attrs = {}; this.listeners = {}; this.style = { setProperty() {} }; this._text = '';
    }
    get offsetWidth() { return 1; }
    get classList() {
      const self = this;
      return {
        add(...n) { self.className = (self.className + ' ' + n.join(' ')).trim(); },
        remove(...n) { self.className = self.className.split(' ').filter((c) => !n.includes(c)).join(' '); },
        contains(n) { return self.className.split(' ').includes(n); }
      };
    }
    appendChild(c) { this.children.push(c); return c; }
    replaceChildren(...c) { this.children = c; }
    /* SVG sets class and data-* through setAttribute, so mirror them the
       way a real element does — otherwise every <rect> is invisible to a
       class or dataset lookup and a check silently passes on nothing. */
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'class') this.className = String(v);
      if (k.startsWith('data-')) {
        this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
      }
    }
    addEventListener() {}
    set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
    all() { return [this].concat(...this.children.map((c) => c.all())); }
    find(cls) { return this.all().filter((n) => String(n.className).split(' ').includes(cls)); }
  }
  const sandbox = {
    document: {
      createElement: (t) => new Node(t),
      /* The figures are SVG, drawn with js/ark/story-diagrams.js's primitives. */
      createElementNS: (_ns, t) => new Node(t),
      createTextNode: (t) => { const n = new Node('#text'); n.textContent = String(t); return n; }
    },
    console, Date, Math, Number, String, encodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    ArkUI: { pageModules: {}, pageCatalog: { zero: { path: '/' }, resolver: { path: '/r' } }, route: { href: (p) => p } }
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ark', 'dash-kit.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ark', 'story-diagrams.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(PAGE, 'utf8'), ctx);   // no algebra, no engine

  const host = new Node('main');
  const el = ctx.ArkUI.pageModules.resolverMath.mount(host);
  assert.ok(el, 'the page must still mount without its data, not throw');
  const text = el.textContent;
  assert.ok(/did not load/i.test(text), 'the page must state the failure');
  assert.ok(/resolver-algebra\.js/.test(text), 'the page must name the missing file');
  assert.ok(/gen-resolver-algebra/.test(text), 'the page must name the remedy');
  assert.equal(el.find('rm-layers').length, 0, 'no empty census table is rendered instead');
});

/* -------------------------------------------------------------------- */
/* 6. It explains itself before it formalises itself                     */
/* -------------------------------------------------------------------- */

/* The page opened with Ψ = ⟨s₁, s₂, …⟩ and people bounced off it. The
 * plain version is not a nice-to-have bolted on the side: it is the part
 * most readers will ever read, so it goes FIRST and it stays there. A
 * tidy-up that moves the algebra back to the top would look like an
 * improvement and undo the whole point. */
check('the page opens on the sum of definitions, and no symbol opens it', () => {
  const vm = require('node:vm');
  class Node {
    constructor(tag) {
      this.tagName = tag; this.className = ''; this.children = []; this.dataset = {};
      this.attrs = {}; this.listeners = {}; this.style = { setProperty() {} }; this._text = '';
      this.value = ''; this.type = '';
    }
    get offsetWidth() { return 1; }
    get classList() {
      const self = this;
      return {
        add(...n) { self.className = (self.className + ' ' + n.join(' ')).trim(); },
        remove(...n) { self.className = self.className.split(' ').filter((c) => !n.includes(c)).join(' '); },
        contains(n) { return self.className.split(' ').includes(n); }
      };
    }
    appendChild(c) { this.children.push(c); return c; }
    replaceChildren(...c) { this.children = c; }
    /* SVG sets class and data-* through setAttribute, so mirror them the
       way a real element does — otherwise every <rect> is invisible to a
       class or dataset lookup and a check silently passes on nothing. */
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'class') this.className = String(v);
      if (k.startsWith('data-')) {
        this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
      }
    }
    addEventListener() {}
    set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
    all() { return [this].concat(...this.children.map((c) => c.all())); }
    find(cls) { return this.all().filter((n) => String(n.className).split(' ').includes(cls)); }
  }
  const sandbox = {
    document: {
      createElement: (t) => new Node(t),
      /* The figures are SVG, drawn with js/ark/story-diagrams.js's primitives. */
      createElementNS: (_ns, t) => new Node(t),
      createTextNode: (t) => { const n = new Node('#text'); n.textContent = String(t); return n; }
    },
    console, Date, Math, Number, String, encodeURIComponent,
    setTimeout: (fn, ms) => { eqScheduled.push({ fn, ms }); return eqScheduled.length; },
    clearTimeout: () => {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    ArkUI: {
      pageModules: {},
      pageCatalog: { zero: { path: '/' }, resolver: { path: '/r' }, stats: { path: '/s' }, reference: { path: '/ref' } },
      route: { href: (p) => p }
    }
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const file of [
    path.join(ROOT, 'js', 'ark', 'dash-kit.js'),
    path.join(ROOT, 'js', 'ark', 'story-diagrams.js'), DATA,
    path.join(ROOT, 'js', 'content', 'resolver-block.js'),
    path.join(ROOT, 'js', 'content', 'registry-snapshot.js'), PAGE
  ]) vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  const SNAP = ctx.ArkRegistrySnapshot;

  const el = ctx.ArkUI.pageModules.resolverMath.mount(new Node('main'));
  const flat = el.all();

  /* The equation is the first thing on the page and must be the SUM —
   * what you define, added up — not the symbolic form. The symbolic form
   * is a smaller statement and it is what people bounced off.
   *
   * There is no separate "plain version" section any more — it was cut
   * 2026-10-10 as information overload once the field and the builder
   * started carrying that explanation visually and interactively. This
   * is checked below (the section is gone, and nothing still points at
   * it); what survives here is just the ordering claim: the sum still
   * leads, and the symbolic form is still a side panel, not the opener. */
  const firstEquation = flat.findIndex((n) => String(n.className).split(' ').includes('rm-equation'));
  const firstAlgebra = flat.findIndex((n) => String(n.className).split(' ').includes('rm-algebra'));
  assert.ok(firstEquation >= 0, 'the equation is gone');
  assert.ok(firstAlgebra >= 0, 'the symbolic form is gone; it belongs on the page, just not first');
  assert.ok(
    firstEquation < firstAlgebra,
    'Ψ = ⟨s₁, s₂, …⟩ has moved back above the sum. That is how this page read when people ' +
      'laughed at it. The sum of definitions leads; the symbolic form is a side panel for ' +
      'anyone who wants it.'
  );

  const openingText = el.find('rm-equation')[0].textContent;
  for (const symbol of ['Ψ', '⟨', 'S(s', '∅']) {
    assert.ok(
      !openingText.includes(symbol),
      `the opening equation contains "${symbol}". It is meant to be readable at a glance by ` +
        'someone who has never seen this before.'
    );
  }

  /* The field: one cell per definition, counted — not a texture that
     merely looks dense. If it ever stops matching the sum, the page is
     showing a picture of an argument instead of the argument. */
  const fieldCells = el.find('rm-cell').filter((c) => !String(c.className).includes('rm-cell-never'));
  const builtResolvers = (page.match(/built: true/g) || []).length;
  assert.ok(builtResolvers > 0, 'the page lists no built resolvers');
  /* Since 2026-10-19 the resolver term of the sum is the resolver CHAINS (native + bridge) plus
     the capabilities they are built from, both read from the generated registry snapshot. The
     audited-family count (built: true rows above) is a different list -- it once stood in for
     "resolvers" here, and two such counts circulated on the site at once. */
  assert.ok(SNAP && SNAP.counts, 'the page context loads js/content/registry-snapshot.js');
  const perTerm = [ALG.roles.registered.length, ALG.roles.labels.length, ALG.verbs.all.length,
                   ALG.manifestTypes.count, ALG.typeScoped.entries.length,
                   SNAP.counts.nativeResolverChains + SNAP.counts.bridgeChains, SNAP.counts.capabilities];
  const summed = perTerm.reduce((a, n) => a + n, 0);
  assert.equal(
    fieldCells.length, summed,
    `the field draws ${fieldCells.length} cells but the sum is ${summed}. Every cell is ` +
      'supposed to be one real registry entry; a field that does not match the sum is ' +
      'decoration pretending to be evidence.'
  );
  for (let t = 0; t < perTerm.length; t += 1) {
    assert.ok(
      fieldCells.some((c) => c.dataset.term === String(t)),
      `term ${t} has no cells, so hovering it would light nothing`
    );
  }
  perTerm.forEach((n, t) => {
    assert.equal(
      fieldCells.filter((c) => c.dataset.term === String(t)).length, n,
      `term ${t} should contribute exactly ${n} cells`
    );
  });

  /* The two nobody defined are drawn as holes in the same field, at the
     same size. Leaving them out is how "not built" becomes "not a thing". */
  const never = el.find('rm-cell-never');
  assert.equal(never.length, 2, 'the undefined pair must occupy the field too, not be omitted');
  for (const g of never) {
    assert.ok(g.dataset.never, 'each undefined cell names what is missing');
  }

  /* The play is bounded and settles — the house contract for motion. */
  assert.ok(eqScheduled.length > 0, 'the equation must play rather than appear fully formed');
  assert.ok(
    eqScheduled.length <= 12,
    `the play scheduled ${eqScheduled.length} timers; it is five steps and must not loop`
  );
  for (const t of eqScheduled) {
    assert.ok(t.ms < 6000, 'no step may be parked beyond a few seconds');
  }

  /* The sum must be made of live registry terms, not typed figures. */
  const sumRows = el.find('rm-eq-row');
  assert.ok(sumRows.length >= 7, `the sum has only ${sumRows.length} rows; it needs its terms, ` +
    'a total, and the terms nobody ever defined');
  for (const n of [ALG.roles.registered.length, ALG.roles.labels.length, ALG.verbs.all.length,
                   ALG.manifestTypes.count, ALG.typeScoped.entries.length]) {
    assert.ok(
      openingText.includes(String(n)),
      `the sum is missing the live term ${n}. Every term has to come from the generated ` +
        'census, or the equation is a drawing of an equation.'
    );
  }
  assert.ok(
    /\b0\b/.test(el.find('rm-eq-zero')[0].textContent),
    'the sum must carry the terms nobody defined as 0 ALONGSIDE the rest. That is the only ' +
      'honest way to show that an undefined thing is absent rather than slow.'
  );

  /* 2026-10-10: the standalone eight-sentence short version was cut as
   * information overload, once the field and the builder started doing
   * that explanatory work visually and interactively instead of in a
   * third block of prose. This is a deliberate removal, not an oversight
   * — guard it the same way the codebase guards every other deliberate
   * removal, so a well-meaning "let's add a plain-language recap" pass
   * doesn't quietly reintroduce the overload it replaced. */
  assert.equal(
    el.find('rm-plain').length, 0,
    'the standalone short-version cards are back. The field and the builder already carry ' +
      'that explanation; a third restatement is the overload this page was trimmed of.'
  );
  assert.ok(
    !page.includes('eight sentences'),
    'the page still promises "eight sentences" somewhere, but the short version is gone — ' +
      'this is a dangling reference, not a feature'
  );

  /* The record figure draws real boxes, so every label in it must be one the
   * explorer on the same page resolves. It drew `K` until 2026-10-18 — a
   * reserved-invalid letter the explorer refuses by name; the shipped
   * sub-kind marker is the two-letter label KK. */
  const known = new Set([
    ...ALG.roles.registered.map((r) => r.letter),
    ...ALG.roles.labels.map((l) => l.label)
  ]);
  const drawn = el.find('rm-fig-letter').map((n) => n.textContent.trim());
  assert.ok(drawn.length > 0, 'the record figure draws no box labels');
  for (const token of drawn) {
    assert.ok(
      known.has(token),
      `the record figure draws a box labelled "${token}", which is not a registered letter or ` +
        'label. The explorer below would refuse it; a figure may not show a record the page\'s ' +
        'own resolver rejects.'
    );
  }

  /* The drawings. Two now, not four: the greedy-letter collision and the
   * two-readers case were cut 2026-10-10 because they duplicate content
   * that already exists elsewhere on the page in a stronger form — the
   * explorer below lets a reader type TYPEGHOST and get the live result,
   * and the observer table above lists every real two-readers case, not
   * just one. A static picture of a thing you can try yourself, or see
   * listed in full two sections away, was the overload. What remains
   * (the record shape, and signing) is content nothing else on the page
   * draws. Each must still carry a caption: a drawing nobody can read
   * aloud helps only the person who already understood. */
  const figs = el.find('rm-fig');
  assert.equal(
    figs.length, 2,
    `${figs.length} figures render; the page should carry exactly the two that nothing else ` +
      'on it shows (the record shape, and signing) — not fewer, and not the two that were ' +
      'deliberately cut for duplicating the explorer and the observer table.'
  );
  for (const f of figs) {
    const caption = f.all().filter((n) => String(n.className).split(' ').includes('rm-fig-caption'));
    assert.equal(caption.length, 1, 'every figure needs exactly one caption');
    assert.ok(
      caption[0].textContent.trim().length > 60,
      'a figure caption is too short to stand on its own. The drawing is for the reader who ' +
        'did not follow the words, so the caption has to say what the drawing says.'
    );
  }
  assert.ok(
    !figs.some((f) => f.textContent.includes('READ ME FIRST')),
    'the two-readers figure is back; it duplicates the full observer table and was cut on ' +
      'purpose — the table already shows every real case, not just one'
  );
  assert.ok(
    !page.includes('TYPEGHOST') || figs.every((f) => !f.all().some((n) =>
      String(n.className).split(' ').includes('rm-fig-letter') && n.textContent === 'T')),
    'the greedy-letter figure is back; the explorer below already lets a reader try ' +
      'TYPEGHOST live, which is the stronger version of the same demonstration'
  );

  /* The boundary table and the observer table were merged into one
   * section 2026-10-10 — they are the same question ("what counts as
   * fixed?") asked twice, not two different questions, and each used to
   * carry its own lede and note repeating the other's point. Checked by
   * position: both tables must exist, and no section heading may fall
   * between them, or the merge has quietly split back into two. */
  const layersIdx = flat.findIndex((n) => String(n.className).split(' ').includes('rm-layers'));
  const observersIdx = flat.findIndex((n) => String(n.className).split(' ').includes('rm-observers'));
  assert.ok(layersIdx >= 0, 'the fixed-vs-open dimension table is gone');
  assert.ok(observersIdx >= 0, 'the ten-case observer table is gone');
  const headingBetween = flat
    .slice(Math.min(layersIdx, observersIdx), Math.max(layersIdx, observersIdx))
    .some((n) => String(n.className).split(' ').includes('dash-section-title'));
  assert.ok(
    !headingBetween,
    'a section heading now sits between the dimension table and the observer table — they ' +
      'were merged into one section on purpose, because they answer the same question twice'
  );

  /* Every remaining section still opens in plain words — fewer sections
   * now, so fewer plain ledes, but the discipline itself (say it plainly,
   * then get precise) was not part of the overload and stays. */
  assert.equal(
    el.find('dash-section-plain').length, 5,
    'the count of plain-opened sections changed. If a section was added or removed, update ' +
      'this to match; if this drifted on its own, a section silently lost its plain lede.'
  );
});

check('the doc and the page agree on the algebra', () => {
  for (const needed of ['S(s, i, O)', 'imaginary', 'observer']) {
    assert.ok(doc.includes(needed), `docs/resolver-math.md is missing "${needed}"`);
  }
  /* The 594,371 figure is checked against the DOC's raw text (it is
   * genuinely hand-written prose there) and against the ENGINE's
   * generated row text (the authority for what the page renders) — not
   * against the page module's raw JS source, which no longer hand-types
   * this number on purpose: it comes from js/content/resolver-block.js's
   * layers(), the same discipline every other count on this page follows. */
  const payloadsRow = engine.layers().find((l) => /Payload/i.test(l.dim));
  assert.ok(payloadsRow, 'the payloads dimension is gone from the generated census');
  assert.ok(
    /594,371/.test(doc) && /594,371/.test(payloadsRow.why),
    'the embedded-vs-addressed measurement is the evidence for the unbounded half; the doc ' +
      'and the generated layer row must both carry it'
  );
});

check('the doc names what is not built', () => {
  assert.ok(
    /not built/i.test(doc),
    'docs/resolver-math.md must name the unbuilt parts of the algebra'
  );
  /* "zero cost" may appear only on a line that retires it. A page that
   * repeats the claim approvingly anywhere would be asserting that
   * admitting a new position is free, which it is not — it costs a
   * collision audit, and that has been got wrong once already. */
  const RETIRES = /half right|overstat|not free|not zero|is the cost/i;
  doc.split('\n').forEach((line, i) => {
    if (!/zero cost/i.test(line)) return;
    assert.ok(
      RETIRES.test(line),
      `docs/resolver-math.md:${i + 1} repeats "zero cost" without retiring it on the ` +
        'same line. Admitting a new position costs a collision audit.\n      ' + line.trim()
    );
  });
});

console.log(`ok resolver-algebra — ${checks} checks`);
