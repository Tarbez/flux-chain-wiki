/* /resolver-math: the foundational page.

   The equation is the page. It is not Ψ = ⟨s₁, …, sₙ⟩ — that is a shape,
   and a shape is a small thing to say. The equation is:

       what you define + what you define + … = what can be real

   Everything FLX can do is the sum of what somebody put in the dictionary.
   Nothing is in the result that was not defined into it, and whatever was
   never defined is not slow — it does not exist. So the page leads with
   that sum, computed from the live registry, and then lets a reader take
   terms out of it and watch capabilities disappear. The removal is real:
   the same resolver that resolves AFOLLOW is rebuilt without the verb
   group and refuses it.

   Rebuilt 2026-10-10 from a standalone HTML file that looked like it came
   from nowhere. Layout is ArkUI.dash, shared with /stats. Figures use the
   drafting primitives from js/ark/story-diagrams.js. Counts come from
   js/content/resolver-algebra.js (generated out of flux-spec/registry) and
   resolution from js/content/resolver-block.js, so a test can run every
   claim this page makes. Measured resolver limits mirror
   docs/resolver-audit.md.

   Dense on purpose: the earlier version was a long scroll, and a reader
   who has to travel to reach the point tends not to reach it. */
(function () {
  'use strict';

  var FROM = '/resolver-math';
  var D = null; // ArkUI.dash, read at mount so load order cannot matter

  /* The resolvers, built and not. Mirrors docs/resolver-audit.md. "NOT
     BUILT" is deliberately not zero: zero would mean measured and scored
     nothing, which is a stronger claim than we can make. */
  var RESOLVERS = [
    { name: 'DeFi-Swap-AMM', space: '2 signed swap intents → one cleared batch', limit: '256 swaps/batch · 13.874 ms · 153.7 batches/s', built: true },
    { name: 'Identity-Name-Ownership', space: '1 signed name record → ownership', limit: '0.0011 ms per resolution', built: true },
    { name: 'Device-Enrollment', space: '1 signed enroll or revoke → roster', limit: '0.0011 ms per resolution', built: true },
    { name: 'Grammar-Admission-Floor', space: '1 dense record → fields', limit: '715,955 records/s', built: true },
    { name: 'Stake-Position', space: '1 signed stake lock → position', limit: 'verifies its own signature · far slower', built: true },
    { name: 'Traffic-Gossip', space: '2 signed entries, same signer, same position → frozen fork', limit: 'verifies 2 signatures · relays to peers', built: true },
    { name: 'Liquidity-Add', space: '1 signed add intent → pool mint', limit: 'NOT BUILT', built: false },
    { name: 'Liquidity-Remove', space: '1 signed remove intent → pool burn', limit: 'NOT BUILT', built: false },
    { name: 'Lending', space: '2 signed loan intents → position', limit: 'NOT BUILT', built: false },
    { name: 'Borrowing', space: '2 signed borrow intents → collateral check', limit: 'NOT BUILT', built: false },
    { name: 'Liquidation', space: '1 signed liquidate intent → health check', limit: 'NOT BUILT', built: false },
    { name: 'Governance-Vote', space: '1 signed vote → tally', limit: 'NOT BUILT', built: false },
    { name: 'Treasury-Spend', space: 'N signed approvals → multisig', limit: 'NOT BUILT', built: false },
    { name: 'Group-Membership', space: '1 signed join or leave → roster', limit: 'NOT BUILT', built: false },
    { name: 'Content-Publish', space: '1 signed content → store and index', limit: 'NOT BUILT', built: false },
    { name: 'Claim-Sign-Then-Approve', space: '2 signed halves → both verified', limit: 'NOT BUILT', built: false },
    { name: 'Vault-Encrypt-Store', space: '1 signed store → encrypt and pin', limit: 'NOT BUILT', built: false },
    { name: 'Search', space: '1 signed query → lookup and rank', limit: 'NOT BUILT', built: false },
    { name: 'Geometric-6-Types', space: '1 signed query → compute', limit: 'NOT BUILT', built: false },
    { name: 'AI-TLM', space: '1 signed query → grounding gate and synthesis', limit: 'NOT BUILT', built: false }
  ];

  /* The four axioms, each tied to the test that holds it in place. The
     test name is shown because an axiom with no test behind it is
     decoration. */
  var AXIOMS = [
    {
      form: 'Imaginary × Imaginary = Imaginary',
      note: 'No resolution without a resolver.',
      text: 'An intent whose signature does not verify is not a weaker intent — it is not an ' +
            'intent. One forged signature fails the entire batch, and the shard deliberately ' +
            'does not hunt for the culprit: doing so would let one piece of imagination impose ' +
            'N verifications on the resolver. The same axiom holds one layer down, at the ' +
            'grammar: an unregistered verb throws rather than falling back to a default.',
      tests: ['a_forged_intent_fails_the_whole_batch']
    },
    {
      form: 'R × Imaginary = Reality',
      note: 'Resolution produces reality.',
      text: 'The resolver verifies, computes, and signs. The signature IS the truth — not a ' +
            'claim about it. Measured: the shard’s signature costs 0.3% of a batch; verifying ' +
            'the parties costs 75%. Making something real is nearly free. Establishing that ' +
            'the intents were real is the work.',
      tests: []
    },
    {
      form: 'Reality × Reality = Reality',
      note: 'Replicas store without change.',
      text: 'A replica stores the signed result without change and without re-verification. A ' +
            'replica that re-verified would be re-deciding, which would make it an authority ' +
            'it is not. Storing is the whole job.',
      tests: ['a_replica_stores_without_verifying']
    },
    {
      form: 'Imaginary × Reality = ∅',
      note: 'You cannot resolve into the past.',
      text: 'A replayed nonce is refused by name. A result commits to the ordered set of ' +
            'intents it resolved, so a batch reordered afterwards — every signature in it ' +
            'still genuine — does not audit clean.',
      tests: ['a_replayed_nonce_is_refused_and_named', 'a_reordered_batch_fails_the_audit']
    }
  ];

  /* What the algebra describes but the system does not do. Named, never
     reported as working and never as zero. */
  var GAPS = [
    {
      piece: 'A per-peer meaning table — two peers privately holding different meanings for one symbol at one position',
      state: 'Not built, partly on purpose',
      kind: 'notbuilt',
      need: 'The type-scoped form above is built and real. What does not exist is a per-peer ' +
            'override: the type-scoped shapes live in one shared registry every observer reads ' +
            'the same way. Two peers cannot privately disagree about what a type means — if ' +
            'they could, neither’s signature would mean anything to the other.'
    },
    {
      piece: 'Runtime self-registration — a record that defines a new dimension, so the grammar extends itself as it runs',
      state: 'Not built',
      kind: 'notbuilt',
      need: 'Registering a dimension today is a signed change to the registry, reviewed against ' +
            'absorbing roles for silent collisions. The review is the cost, and it is not zero. ' +
            'A self-registering record would have to carry that collision check, or it ' +
            're-introduces TYPEGHOST at runtime.'
    },
    {
      piece: 'Asking a human at parse time for a meaning the table lacks',
      state: 'Rejected, not pending',
      kind: 'rejected',
      need: 'Deliberately not a gap to close. Resolution has to be deterministic to be ' +
            'signable: two observers must get the same result from the same bytes, and a parse ' +
            'that stops to ask does not. An unresolved dimension refuses by name instead — ' +
            'that is axiom 1.'
    },
    {
      piece: '“Zero cost” for an unbounded space',
      state: 'Overstated',
      kind: 'overstated',
      need: 'A lookup is O(1) and a small record parses in O(n); that part holds. What is not ' +
            'free is admitting a new position, which costs a collision audit against every ' +
            'absorbing role. That is human review, and this grammar has already got it wrong ' +
            'once.'
    }
  ];

  /* Worked cases, taken from the registry's own notes rather than invented.
     The collisions matter more than the clean ones. */
  var EXAMPLES = [
    'ASEND', 'AFOLLOW', 'AREMIX', 'YGHOST', 'TYPEGHOST', 'NOTIFY',
    'UPENDING', 'UPDATE', 'Q636f6e63657074', 'QUERY', 'L418400', 'LABEL',
    'M1760000000', 'V3', 'Jfoo', 'ZFOO'
  ];

  /* A section opens in plain words and only then gets precise. The plain
     line is not decoration: it is the sentence a reader repeats to someone
     else, and if it cannot be written the section is probably confused. */
  function section(label, plain, note) { return D.sectionHead(label, note, plain); }

  /* ---- the figures -----------------------------------------------------
     Four drawings, because the words alone kept losing people. Each one
     shows a single thing and is built from the same drafting primitives
     the rest of the site's figures use (js/ark/story-diagrams.js), so a
     figure here is in the same hand as a figure on /concept.

     Every figure is data where data exists: figure 2 reads the real
     type-scoped letters out of the generated census rather than naming a
     case by hand, so it cannot describe a grammar we do not have. */

  function figure(caption, viewBox, build) {
    var fig = D.el('figure', 'rm-fig');
    var svg = ArkUI.drafting.svg(viewBox);
    build(ArkUI.drafting.into(svg), svg);
    fig.appendChild(svg);
    fig.appendChild(D.el('figcaption', 'rm-fig-caption', caption));
    return fig;
  }

  /* 1. A record is a row of boxes, and the dictionary is somewhere else. */
  function figureRecord() {
    var BOXES = [
      ['G', 'who', 'signed it'],
      ['Y', 'what kind', 'of thing'],
      ['M', 'when', 'it was made'],
      ['K', 'which', 'sub-kind'],
      ['C', 'the', 'address'],
      ['S', 'the', 'signature']
    ];
    return figure(
      'One record. Each box carries one letter and some packed text. The letter is a ' +
      'label that points at a dictionary kept outside the record — so the record never ' +
      'carries its own meaning around with it.',
      '0 0 520 186',
      function (d) {
        d.word(24, 16, 'ONE RECORD — SIX BOXES', 'drawing-title');
        BOXES.forEach(function (b, i) {
          var x = 24 + i * 68;
          d.box(x, 30, 60, 40);
          d.word(x + 30, 56, b[0], 'rm-fig-letter');
          d.word(x + 30, 86, b[1], 'rm-fig-small');
          d.word(x + 30, 97, b[2], 'rm-fig-small');
          if (i < BOXES.length - 1) d.path('M' + (x + 60) + ' 50h8');
        });
        /* The connector leaves the record at its edge and runs underneath
           the labels. Routed straight down from a box, it crossed its own
           caption and the figure read as a tangle. */
        d.box(160, 128, 240, 38, 'drawing-dashed');
        d.word(280, 145, 'THE DICTIONARY', 'rm-fig-mid');
        d.word(280, 157, 'lives out here, not in the record', 'rm-fig-small');
        d.path('M24 50H14V147H152', 'drawing-accent');
        d.path('M152 147l-8-4v8z', 'drawing-accent');
        d.word(20, 160, 'every letter points out here', 'rm-fig-small-left');
      }
    );
  }

  /* 2. A wish is not a fact until somebody signs it. */
  function figureSigning() {
    return figure(
      'Dashed means a wish; solid means a fact. Two people wanting the same trade changes ' +
      'nothing at all. One program works it out and signs its name, and the signature is ' +
      'the fact — not a vote about the fact, not a receipt for it.',
      '0 0 520 178',
      function (d) {
        d.word(24, 16, 'WISH × WISH = WISH', 'drawing-title');
        d.box(24, 32, 124, 42, 'drawing-dashed');
        d.word(86, 58, 'ALICE WANTS', 'rm-fig-mid');
        d.box(24, 102, 124, 42, 'drawing-dashed');
        d.word(86, 128, 'BOB WANTS', 'rm-fig-mid');

        d.path('M148 53C184 53 180 80 206 88', 'drawing-accent');
        d.path('M148 123C184 123 180 96 206 88', 'drawing-accent');

        d.box(206, 62, 110, 52, 'drawing-boundary');
        d.word(261, 84, 'RESOLVER', 'rm-fig-mid');
        d.word(261, 98, 'checks, works it out', 'rm-fig-small');

        d.path('M316 88h42', 'drawing-accent');
        d.path('M358 88l-9-4v8z', 'drawing-accent');

        d.box(362, 62, 134, 52);
        d.word(429, 84, 'SIGNED RESULT', 'rm-fig-mid');
        d.word(429, 98, 'this is the fact', 'rm-fig-small');
        d.dot(479, 72, 3);

        d.word(24, 166, 'DASHED = A WISH          SOLID = A FACT', 'rm-fig-small-left');
      }
    );
  }


  /* What the grammar can SAY, each proved by running a real block through a
     real engine. The point of the list is that it shrinks when you take a
     definition away — so every row names the definition it depends on, and
     the last two name a definition nobody ever made. */
  var CAPABILITIES = [
    { say: 'Send a message',            block: 'ASEND',           needs: 'messaging verbs' },
    { say: 'Follow someone',            block: 'AFOLLOW',         needs: 'social verbs' },
    { say: 'Cite a paper',              block: 'ACITE',           needs: 'social verbs' },
    { say: 'Register a name',           block: 'AREGISTER',       needs: 'registry verbs' },
    { say: 'Buy from a pool',           block: 'ABUY',            needs: 'AMM verbs' },
    { say: 'Add liquidity',             block: 'ALIQUIDITYADD',   needs: 'AMM verbs' },
    { say: 'Mint against a proof',      block: 'AMINT',           needs: 'chain verbs' },
    { say: 'Hold a position in a pool', block: 'Jfoo',            needs: 'type-scoped shapes' },
    { say: 'Mark a claim pending',      block: 'UPENDING',        needs: 'the U letter' },
    { say: 'Name what a claim is about', block: 'Q636f6e63657074', needs: 'the Q letter' },
    { say: 'Lend against collateral',   block: 'ALEND',           needs: 'a verb nobody defined' },
    { say: 'Split a payment',           block: 'ASPLIT',          needs: 'a verb nobody defined' }
  ];

  /* The terms a reader can take out of the sum. Each maps to a real
     restriction of the census, never to a pretend one. */
  var TERMS = [
    { id: 'messaging', label: 'messaging verbs', off: { verbGroups: ['messaging'] } },
    { id: 'social',    label: 'social verbs',    off: { verbGroups: ['social'] } },
    { id: 'registry',  label: 'registry verbs',  off: { verbGroups: ['registry'] } },
    { id: 'chain',     label: 'chain verbs',     off: { verbGroups: ['chain'] } },
    { id: 'amm',       label: 'AMM verbs',       off: { verbGroups: ['amm'] } },
    { id: 'scoped',    label: 'type-scoped shapes', off: { typeScoped: true } },
    { id: 'U',         label: 'the U letter',    off: { letters: ['U'] } },
    { id: 'Q',         label: 'the Q letter',    off: { letters: ['Q'] } }
  ];

  function tag(kind, text) {
    var t = D.el('span', 'rm-tag', text);
    t.dataset.kind = kind;
    return t;
  }

  /* A refusal the reader can act on, used when a generated file is
     missing: name the failure, the missing thing, and the remedy. */
  function unavailable(what, remedy) {
    var box = D.panel('dash-span-12', 'Unavailable', what);
    box.appendChild(D.el('p', 'dash-note', remedy));
    return box;
  }

  ArkUI.pageModules.resolverMath = {
    mount: function (host) {
      D = ArkUI.dash;
      var ALG = window.ArkResolverAlgebra;
      var ENGINE = window.ArkResolverBlock;
      var RESTRICT = window.ArkResolverRestrict;
      var REBUILD = window.ArkResolverBlockBuild;

      var built = D.shell({
        pageClass: 'resolver-math-page',
        shellClass: 'rm-shell',
        titleId: 'resolver-math-title',
        kicker: 'DEFXN · Foundational concept',
        title: 'Resolver Math',
        lede: 'Everything this system can do is the sum of what somebody defined. ' +
              'Nothing else is in there.',
        crumbs: [
          { label: '← Home', key: 'zero' },
          { label: 'What is a resolver?', key: 'resolver' },
          { label: 'Resolver Math' }
        ]
      });
      var shell = built.body;

      if (!ALG || !ENGINE) {
        var missing = !ALG ? 'js/content/resolver-algebra.js' : 'js/content/resolver-block.js';
        var g = D.el('div', 'dash-grid');
        g.appendChild(unavailable(
          'The grammar census did not load, so this page cannot show the sum it is about.',
          'Missing: ' + missing + '. Remedy: regenerate it with ' +
          '`node scripts/gen-resolver-algebra.cjs --write`, which reads flux-spec/registry.'));
        shell.appendChild(g);
        host.appendChild(built.page);
        return built.page;
      }

      var builtResolvers = RESOLVERS.filter(function (r) { return r.built; }).length;
      var notBuilt = RESOLVERS.length - builtResolvers;

      // ---- THE EQUATION, DRAWN --------------------------------------------------------
      /* The sum on the left; on the right, one cell for every single thing
         somebody defined — every role letter, every verb, every record
         type, every type-scoped shape, every resolver. The field is not
         decoration and not an estimate: you can count it, and the count
         IS the sum. (No figure is written here on purpose — this comment
         would go stale the day a verb is registered, and a stale comment
         misleads exactly like a stale number on the page.)

         It plays once on arrival and settles. Hovering a term lights only
         that term's cells, so a line like "record types" stops being an
         abstraction and becomes a visible block of that many things. The
         two cells at the end stay outlined and empty because nobody ever
         defined them. */
      var eq = D.el('div', 'rm-equation');
      eq.appendChild(D.el('p', 'rm-eq-kicker', 'The equation'));

      var terms = [
        { n: ALG.roles.registered.length, term: 'role letters', gloss: 'what a box can be' },
        { n: ALG.verbs.all.length, term: 'action verbs', gloss: 'what can be done' },
        { n: ALG.manifestTypes.count, term: 'record types', gloss: 'what a record is about' },
        { n: ALG.typeScoped.entries.length, term: 'type-scoped shapes', gloss: 'where meaning bends' },
        { n: builtResolvers, term: 'resolvers', gloss: 'what can be worked out and signed' }
      ];
      var defined = terms.reduce(function (a, t) { return a + t.n; }, 0);

      var eqBody = D.el('div', 'rm-eq-body');
      var sum = D.el('div', 'rm-eq-sum');
      var termRows = terms.map(function (t, i) {
        var row = D.el('div', 'rm-eq-row');
        row.dataset.term = String(i);
        row.appendChild(D.el('span', 'rm-eq-op', i === 0 ? '' : '+'));
        var swatch = D.el('span', 'rm-eq-swatch');
        swatch.dataset.term = String(i);
        var nCell = D.el('span', 'rm-eq-n', D.fmt(t.n));
        nCell.appendChild(swatch);
        row.appendChild(nCell);
        row.appendChild(D.el('span', 'rm-eq-term', t.term));
        row.appendChild(D.el('span', 'rm-eq-gloss', t.gloss));
        sum.appendChild(row);
        return row;
      });
      sum.appendChild(D.el('div', 'rm-eq-rule'));
      var total = D.el('div', 'rm-eq-row rm-eq-total');
      total.appendChild(D.el('span', 'rm-eq-op', '='));
      total.appendChild(D.el('span', 'rm-eq-term', 'everything that can be made real'));
      total.appendChild(D.el('span', 'rm-eq-gloss', 'today, on this registry'));
      sum.appendChild(total);
      eqBody.appendChild(sum);

      /* The field. One cell per definition, grouped in the order of the sum. */
      var COLS = 22, CELL = 8, STEP = 11;
      var field = D.el('div', 'rm-field');
      var fieldHead = D.el('p', 'rm-field-head');
      var fieldCount = D.el('strong', 'rm-field-count', '0');
      fieldHead.appendChild(fieldCount);
      fieldHead.appendChild(D.el('span', 'rm-field-of', ' definitions, one cell each'));
      field.appendChild(fieldHead);

      var rows = Math.ceil((defined + 4) / COLS);
      /* Built with drafting's node(), not drafting's svg(): that helper adds
         the `story-drawing` class, whose stylesheet sets fill:none on every
         rect at a higher specificity than a single class can override. This
         is a data field, not a drafting figure — it should not inherit the
         figure stroke language in the first place. */
      var fsvg = ArkUI.drafting.node('svg', {
        viewBox: '0 0 ' + (COLS * STEP) + ' ' + (rows * STEP + 2),
        class: 'rm-field-svg', 'aria-hidden': 'true', focusable: 'false'
      });
      var cells = [];
      var at = 0;
      terms.forEach(function (t, ti) {
        for (var k = 0; k < t.n; k += 1) {
          var c = ArkUI.drafting.node('rect', {
            x: (at % COLS) * STEP, y: Math.floor(at / COLS) * STEP,
            width: CELL, height: CELL, rx: 2, class: 'rm-cell'
          });
          c.setAttribute('data-term', String(ti));
          c.setAttribute('style', '--i:' + at);
          fsvg.appendChild(c);
          cells.push(c);
          at += 1;
        }
      });
      /* The two nobody defined, drawn in the same field so the absence is
         the same size as the presence. */
      at += 2; // a gap, so the two below read as separate from the sum
      var ghosts = ['lending', 'split payment'].map(function (name, k) {
        var c = ArkUI.drafting.node('rect', {
          x: ((at + k) % COLS) * STEP, y: Math.floor((at + k) / COLS) * STEP,
          width: CELL, height: CELL, rx: 2, class: 'rm-cell rm-cell-never'
        });
        c.setAttribute('data-never', name);
        fsvg.appendChild(c);
        return c;
      });
      field.appendChild(fsvg);
      field.appendChild(D.el('p', 'rm-field-foot',
        'Every cell is one real entry in flux-spec/registry. The two outlined at the end are ' +
        'the ones nobody ever added.'));
      eqBody.appendChild(field);
      eq.appendChild(eqBody);

      var zero = D.el('div', 'rm-eq-zero');
      [
        ['0', 'lending resolvers', 'so lending cannot happen'],
        ['0', 'split-payment verbs', 'so a split payment cannot be said at all']
      ].forEach(function (t) {
        var row = D.el('div', 'rm-eq-row');
        row.appendChild(D.el('span', 'rm-eq-op', '+'));
        row.appendChild(D.el('span', 'rm-eq-n', t[0]));
        row.appendChild(D.el('span', 'rm-eq-term', t[1]));
        row.appendChild(D.el('span', 'rm-eq-gloss', t[2]));
        zero.appendChild(row);
      });
      zero.appendChild(D.el('p', 'rm-eq-note', 'Not slowly. At all. A thing nobody defined is ' +
        'not a missing feature — it is a sentence the system cannot form.'));
      eq.appendChild(zero);

      /* Playing the sum. Five bounded steps, then still — no idle loop, and
         a reduced-motion or paused reader gets the finished field at once. */
      var reduceEq = typeof matchMedia === 'function'
        ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
      var eqTimers = [];
      function clearEq() { eqTimers.forEach(clearTimeout); eqTimers = []; }
      function settleEq() {
        clearEq();
        eq.dataset.played = 'true';
        fieldCount.textContent = D.fmt(defined);
        termRows.forEach(function (r) { r.dataset.in = 'true'; });
      }
      function playEq() {
        clearEq();
        delete eq.dataset.played;
        termRows.forEach(function (r) { delete r.dataset.in; });
        fieldCount.textContent = '0';
        if (reduceEq.matches) { settleEq(); return; }
        eq.classList.remove('rm-eq-run');
        void eq.offsetWidth;
        eq.classList.add('rm-eq-run');
        var running = 0;
        terms.forEach(function (t, i) {
          running += t.n;
          var upTo = running;
          eqTimers.push(setTimeout(function () {
            termRows[i].dataset.in = 'true';
            fieldCount.textContent = D.fmt(upTo);
            if (i === terms.length - 1) eq.dataset.played = 'true';
          }, 240 + i * 420));
        });
      }
      termRows.forEach(function (row, i) {
        row.addEventListener('pointerenter', function () { eq.dataset.only = String(i); });
        row.addEventListener('pointerleave', function () { delete eq.dataset.only; });
      });
      ghosts.forEach(function (g) { void g; });

      eq.appendChild(D.el('p', 'rm-eq-punch',
        'You are not discovering this. You are writing it.'));
      shell.appendChild(eq);
      playEq();

      // ---- THE BUILDER ---------------------------------------------------------------
      shell.appendChild(section('Take a term out and watch something stop existing',
        'Untick a definition. The list on the right is recomputed by the real resolver, ' +
        'rebuilt without that definition — nothing here is a mock-up.', null));

      var buildGrid = D.el('div', 'dash-grid');
      var controls = D.panel('dash-span-4 rm-builder', 'What you defined', null);
      var results = D.panel('dash-span-8 rm-says', 'What can therefore be said', null);
      var tally = D.el('p', 'rm-tally');
      results.appendChild(tally);
      var sayList = D.el('ul', 'rm-say-list');
      results.appendChild(sayList);

      var dropped = {};
      function currentEngine() {
        if (!RESTRICT || !REBUILD) return ENGINE;
        var off = { verbGroups: [], letters: [], typeScoped: false };
        TERMS.forEach(function (t) {
          if (!dropped[t.id]) return;
          if (t.off.verbGroups) off.verbGroups = off.verbGroups.concat(t.off.verbGroups);
          if (t.off.letters) off.letters = off.letters.concat(t.off.letters);
          if (t.off.typeScoped) off.typeScoped = true;
        });
        return REBUILD(RESTRICT(ALG, off));
      }

      /* The ceiling is what the FULL census can say, not the length of the
         list: two rows name verbs nobody ever defined, so twelve of twelve
         is not reachable and showing it as a shortfall would be wrong. */
      var ceiling = null;
      function countWith(engine) {
        return CAPABILITIES.filter(function (cap) {
          var st = engine.resolveBlock(cap.block).state;
          return st === 'real' || st === 'relative';
        }).length;
      }

      function renderSays() {
        var engine = currentEngine();
        if (ceiling === null) ceiling = countWith(ENGINE);
        var possible = 0;
        sayList.replaceChildren();
        CAPABILITIES.forEach(function (cap) {
          var r = engine.resolveBlock(cap.block);
          var ok = r.state === 'real' || r.state === 'relative';
          if (ok) possible += 1;
          var li = D.el('li', 'rm-say');
          li.dataset.state = ok ? 'yes' : 'no';
          li.appendChild(D.el('span', 'rm-say-mark', ok ? '✓' : '✗'));
          li.appendChild(D.el('span', 'rm-say-text', cap.say));
          li.appendChild(D.el('code', 'rm-say-block', cap.block));
          li.appendChild(D.el('span', 'rm-say-needs', ok ? cap.needs : 'needs ' + cap.needs));
          sayList.appendChild(li);
        });
        var never = CAPABILITIES.length - ceiling;
        tally.textContent = possible === ceiling
          ? possible + ' of ' + CAPABILITIES.length + ' things can be said. The other ' +
            (never === 1 ? 'one was' : never + ' were') + ' never defined, so no amount of ' +
            'ticking brings ' + (never === 1 ? 'it' : 'them') + ' back.'
          : possible + ' of ' + CAPABILITIES.length + ' things can be said — ' +
            (ceiling - possible) + ' fewer than a moment ago, because you took a definition ' +
            'out of the sum.';
        tally.dataset.state = possible === ceiling ? 'full' : 'reduced';
      }

      TERMS.forEach(function (t) {
        var row = D.el('label', 'rm-term');
        var box = D.el('input');
        box.type = 'checkbox';
        box.checked = true;
        box.addEventListener('change', function () {
          dropped[t.id] = !box.checked;
          renderSays();
        });
        row.appendChild(box);
        row.appendChild(D.el('span', 'rm-term-label', t.label));
        controls.appendChild(row);
      });
      controls.appendChild(D.el('p', 'dash-note',
        'Two rows on the right can never be ticked on: nobody ever defined them. That is ' +
        'the whole argument, and it is the only honest way to show it.'));

      buildGrid.appendChild(controls);
      buildGrid.appendChild(results);
      shell.appendChild(buildGrid);
      renderSays();

      // ---- THE FIGURES ---------------------------------------------------------------
      /* Two drawings, not four. The greedy-letter collision and the
         two-readers case are cut from here because the explorer below lets
         you type TYPEGHOST and get the live, real version of the first,
         and the observer table a few sections down shows every real case
         of the second — a static picture of a thing you can try yourself
         or see listed in full was the overload, not the illustration. */
      shell.appendChild(section('Two ideas this page cannot show any other way', null, null));
      var figGrid = D.el('div', 'dash-grid');
      [
        ['A record is a row of boxes', figureRecord],
        ['A wish is not a fact', figureSigning]
      ].forEach(function (pair) {
        var p = D.panel('dash-span-6 rm-figwrap', pair[0], null);
        p.appendChild(pair[1]());
        figGrid.appendChild(p);
      });
      shell.appendChild(figGrid);

      // ---- THE BOUNDARY: FIXED LETTERS, ONE THAT BENDS -------------------------------
      /* Two tables, one section: which dimension is closed (you can almost
         never add a letter) and the single place one letter's meaning
         depends on context instead of being fixed. Shown together because
         they are the same question — "what counts as fixed?" — answered
         twice, not two different questions. */
      shell.appendChild(section('What is fixed, and the one letter that bends',
        'You can define new things to say almost without limit. You can almost never define ' +
        'a new kind of box — except one, whose meaning depends on context.',
        'Each layer was decided by a hazard somebody hit, not by taste.'));

      var layerGrid = D.el('div', 'dash-grid');
      var layerPanel = D.panel('dash-span-12', null, null);
      layerPanel.appendChild(D.table(
        ['Dimension', 'Status', { text: 'Count', cls: 'dash-node-value' }, 'Why it is this way'],
        ENGINE.layers().map(function (row) {
          return [row.dim, { node: tag(row.kind, row.kind) },
                  { text: row.count, cls: 'dash-node-value' }, row.why];
        }), 'rm-layers'));
      layerPanel.appendChild(D.el('p', 'dash-note',
        'Closed in its positions, unbounded in its payloads — adding a position risks a ' +
        'silent collision; adding a payload is just a new address.'));
      layerGrid.appendChild(layerPanel);

      var scoped = ENGINE.observerTable();
      var scopedPanel = D.panel('dash-span-12', 'One letter, ten real cases', null);
      scopedPanel.appendChild(D.table(
        ['Letter', 'When the record is a…', '…it means', 'Defined in'],
        scoped.map(function (r) {
          return [{ text: r.letter, cls: 'rm-letter' },
                  r.type + (r.code ? ' (' + r.code + ')' : ''),
                  r.shape, { text: r.definedIn, cls: 'rm-source' }];
        }), 'rm-observers'));
      scopedPanel.appendChild(D.el('p', 'dash-note',
        'A type that declares no shape for a letter carries no meaning for it — undefined, ' +
        'not broken. The type letter Y is always fixed, so every reader agrees which case ' +
        'applies before anything else is interpreted.'));
      layerGrid.appendChild(scopedPanel);
      shell.appendChild(layerGrid);

      // ---- THE EXPLORER --------------------------------------------------------------
      shell.appendChild(section('Resolve a block yourself',
        'Type a box and watch what happens to it. The frightening ones are not the ' +
        'refusals — they are the ones that say “resolved” and are wrong.', null));
      var expGrid = D.el('div', 'dash-grid');
      var exp = D.panel('dash-span-12 rm-explorer', null, null);
      var label = D.el('label', 'rm-explorer-label', 'One role letter, then packed text');
      label.setAttribute('for', 'rm-block');
      exp.appendChild(label);
      var input = D.el('input', 'rm-input');
      input.id = 'rm-block';
      input.value = 'TYPEGHOST';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      exp.appendChild(input);
      var chips = D.el('div', 'rm-chips');
      exp.appendChild(chips);
      var verdict = D.el('div', 'rm-verdict');
      verdict.setAttribute('aria-live', 'polite');
      exp.appendChild(verdict);

      function renderBlock() {
        var r = ENGINE.resolveBlock(input.value);
        verdict.dataset.state = r.state;
        verdict.replaceChildren();
        verdict.appendChild(D.el('p', 'rm-verdict-head', r.head));
        var list = D.el('dl', 'rm-verdict-lines');
        r.lines.forEach(function (pair) {
          list.appendChild(D.el('dt', null, pair[0]));
          list.appendChild(D.el('dd', null, pair[1]));
        });
        verdict.appendChild(list);
      }
      EXAMPLES.forEach(function (ex) {
        var b = D.el('button', 'rm-chip', ex);
        b.type = 'button';
        b.addEventListener('click', function () { input.value = ex; renderBlock(); });
        chips.appendChild(b);
      });
      input.addEventListener('input', renderBlock);
      renderBlock();
      expGrid.appendChild(exp);
      shell.appendChild(expGrid);

      // ---- THE RULES, AND THE ALGEBRA ------------------------------------------------
      shell.appendChild(section('The four rules, and the test that would catch us breaking each',
        'Definitions decide what can be said. These decide what makes it true.', null));
      var ruleGrid = D.el('div', 'dash-grid');
      var rules = D.panel('dash-span-8', null, null);
      rules.appendChild(D.table(
        ['Rule', 'In short', 'What holds it in place'],
        AXIOMS.map(function (ax) {
          var tests = D.el('span', 'rm-tests');
          if (ax.tests.length) {
            ax.tests.forEach(function (n) { tests.appendChild(D.el('code', null, n)); });
          } else {
            tests.appendChild(D.el('span', 'dash-note', 'measured — BENCH-012'));
          }
          return [{ text: ax.form, cls: 'rm-axiom-form' }, ax.note, { node: tests }];
        }), 'rm-rules'));
      ruleGrid.appendChild(rules);

      /* The compact form, for anyone who wants it — a smaller statement than
         the sum above, and the one "imaginary x imaginary = imaginary" is
         one line of. This panel used to point at a longer plain-language
         section above it; that section was cut as part of the same pass
         that reduced this page, so the panel no longer refers back to it. */
      var algebra = D.panel('dash-span-4 rm-algebra', 'Written as algebra', null);
      [
        ['Ψ = ⟨s₁, s₂, …, sₙ⟩', 'a record is a row of symbols'],
        ['S(s, i, O) → m', 'meaning needs the symbol, its place, and who is reading'],
        ['S undefined → imaginary', 'undecided, not broken']
      ].forEach(function (line) {
        var row = D.el('div', 'rm-algebra-line');
        row.appendChild(D.el('code', 'rm-equation-form', line[0]));
        row.appendChild(D.el('p', 'rm-equation-gloss', line[1]));
        algebra.appendChild(row);
      });
      algebra.appendChild(D.el('p', 'dash-note',
        'A smaller statement than the sum above — “imaginary × imaginary = imaginary” is ' +
        'one line of it.'));
      ruleGrid.appendChild(algebra);
      shell.appendChild(ruleGrid);

      // ---- THE LIMITS ----------------------------------------------------------------
      shell.appendChild(section('What the sum adds up to today',
        builtResolvers + ' resolver' + (builtResolvers === 1 ? '' : 's') + ' exist' +
        (builtResolvers === 1 ? 's' : '') + '. ' + notBuilt + ' ' +
        (notBuilt === 1 ? 'is' : 'are') + ' declared and not built — named, because zero ' +
        'would mean “we measured it and it scored nothing”.', null));
      var limGrid = D.el('div', 'dash-grid');
      var kBuilt = D.stat('dash-span-3 is-lead', 'Resolvers built', String(builtResolvers), '',
        'each with a measured limit');
      var kNot = D.stat('dash-span-3', 'Declared, not built', String(notBuilt), '',
        'things that cannot be made real today');
      limGrid.appendChild(kBuilt.tile);
      limGrid.appendChild(kNot.tile);

      var limPanel = D.panel('dash-span-6', null, null);
      limPanel.appendChild(D.el('p', null,
        'Expanding a resolver does not make something faster. It makes it possible. A ' +
        'signed result is equally true whether it took 13 ms or 13 seconds — speed decides ' +
        'how much reality can be produced per second, not how real any of it is.'));
      var auditLink = D.el('p', 'dash-link-row');
      auditLink.appendChild(D.docLink('Read the resolver audit', 'docs/resolver-audit.md', FROM, 'dash-link'));
      limPanel.appendChild(auditLink);
      limGrid.appendChild(limPanel);

      var tablePanel = D.panel('dash-span-12', null, null);
      tablePanel.appendChild(D.table(
        ['Resolver', 'What it turns into a signed result', { text: 'Measured limit', cls: 'dash-node-value' }],
        RESOLVERS.map(function (r) {
          return [
            { text: r.name, cls: r.built ? '' : 'rm-row-unbuilt' },
            r.space,
            r.built ? { text: r.limit, cls: 'dash-node-value' } : { node: tag('notbuilt', 'not built') }
          ];
        }), 'rm-limits'));
      limGrid.appendChild(tablePanel);
      shell.appendChild(limGrid);

      // ---- WHAT THIS PAGE DOES NOT CLAIM ---------------------------------------------
      shell.appendChild(section('Where this page stops being true', null, null));
      var gapGrid = D.el('div', 'dash-grid');
      var gapPanel = D.panel('dash-span-12', null, null);
      gapPanel.appendChild(D.table(
        ['Piece of the idea', 'Status', 'What it would take'],
        GAPS.map(function (g) { return [g.piece, { node: tag(g.kind, g.state) }, g.need]; }),
        'rm-gaps'));
      gapPanel.appendChild(D.el('p', 'dash-note',
        'The resemblance to observation collapsing a superposition is an analogy and is ' +
        'used as one. Nothing here is measured in quantum terms.'));
      gapGrid.appendChild(gapPanel);
      shell.appendChild(gapGrid);

      // ---- KEEP READING --------------------------------------------------------------
      var readGrid = D.el('div', 'dash-grid');
      var read = D.panel('dash-span-12 rm-deeper', 'Keep reading', null);
      var links = D.el('div', 'dash-links');
      links.appendChild(D.docLink('Resolver math, in full', 'docs/resolver-math.md', FROM, 'dash-link'));
      links.appendChild(D.docLink('Resolver audit', 'docs/resolver-audit.md', FROM, 'dash-link'));
      links.appendChild(D.docLink('Deprecation ledger', 'docs/deprecated.md', FROM, 'dash-link'));
      links.appendChild(D.docLink('BENCH-012', 'docs/evidence/bench-012-defi-shard-signed-resolution.md', FROM, 'dash-link'));
      links.appendChild(D.pageLink('What is a resolver?', 'resolver', 'dash-link'));
      links.appendChild(D.pageLink('Fleet dashboard', 'stats', 'dash-link'));
      read.appendChild(links);
      read.appendChild(D.el('p', 'dash-note',
        'Two parties sign → a resolver shard resolves → the shard signs the result → ' +
        'replicas store → anyone audits. Census generated from ' + ALG.source +
        ' · spec version ' + ALG.specVersion));
      readGrid.appendChild(read);
      shell.appendChild(readGrid);

      host.appendChild(built.page);
      return built.page;
    }
  };
})();
