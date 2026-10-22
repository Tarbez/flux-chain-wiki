/* /resolver-math: the foundational page, as a page of Ark blocks.

   The equation is the page. It is not Ψ = ⟨s₁, …, sₙ⟩ — that is a shape,
   and a shape is a small thing to say. The equation is:

       what you define + what you define + … = what can be real

   Everything FLX can do is the sum of what somebody put in the dictionary.
   Nothing is in the result that was not defined into it, and whatever was
   never defined is not slow — it does not exist. So the page leads with
   that sum, computed from the live registry, and then lets a reader take
   terms out of it and watch sayable things disappear. The removal is real:
   the same resolver that resolves AFOLLOW is rebuilt without the verb
   group and refuses it.

   Rebuilt 2026-10-10 from a standalone HTML file that looked like it came
   from nowhere. Figures use the drafting primitives from
   js/ark/story-diagrams.js. Counts come from js/content/resolver-algebra.js
   (generated out of flux-spec/registry) and resolution from
   js/content/resolver-block.js, so a test can run every claim this page
   makes. Measured resolver limits mirror docs/resolver-audit.md.

   Converted to data in DEFXN polish Wave 3 (W3-STATS). It was 8.54x the viewport on a desktop
   and 13.58x on a phone: the equation, then six sections of panels, tables and figures
   (docs/ux-audit/pages-ux-b.md /resolver-math P0). The equation stays first, as a live figure,
   under a hero that states the sum; the six sections were tabs (Remove a term · Two ideas · Fixed vs
   bends · Resolve a block · Rules and limits · What it adds up to). Since the first-visit audit
   2026-10-22 they are four views with plain names -- The equation (with the sum's three numbers after
   it) · Try it · How records work · Rules and limits -- and the equation's figure says "Data", not
   "Live". The equation, the builder, the explorer and the two drawings are this page's own live
   content, passed to Ark figures as slots with the same markup they had, so a CMS edit saved
   against them still lands; the panels, tables, stat tiles, section heads and shell are Ark's.

   Layout keys: tests/resolver-math-blocks.cjs holds the continuity of every old key
   (tests/fixtures/layout-keys/resolver-math.tsv). */
(function () {
  'use strict';

  var FROM = '/resolver-math';
  var D = null; // ArkUI.dash (el, fmt), read at mount so load order cannot matter

  /* The resolver FAMILIES the audit covers, built and not. Mirrors
     docs/resolver-audit.md (generated in defxn-defi-rs). This is not the count
     of resolver chains launched on the network: that one comes from
     js/content/registry-snapshot.js (a resolver is now a chain of its own, since
     2026-10-18), and the two are labelled apart wherever both appear. "NOT
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

  /* ---- the drawings ---------------------------------------------------
     Two, because the words alone kept losing people. Each shows a single thing and is built from
     the same drafting primitives the rest of the site's figures use (js/ark/story-diagrams.js), so
     a drawing here is in the same hand as one on /concept. Ark's figure frames each one and
     carries its caption. */
  function drawing(viewBox, build) {
    var svg = ArkUI.drafting.svg(viewBox);
    build(ArkUI.drafting.into(svg), svg);
    return svg;
  }
  var CAPTION_RECORD = 'One record. Each box opens with a label — usually one letter, sometimes a few — and ' +
      'then some packed text. The label points at a dictionary kept outside the record — ' +
      'so the record never carries its own meaning around with it.';
  var CAPTION_SIGNING = 'Dashed means a wish; solid means a fact. Two people wanting the same trade changes ' +
      'nothing at all. One program works it out and signs its name, and the signature is ' +
      'the fact — not a vote about the fact, not a receipt for it.';

  /* 1. A record is a row of boxes, and the dictionary is somewhere else. */
  function figureRecord() {
    var BOXES = [
      ['G', 'who', 'signed it'],
      ['Y', 'what kind', 'of thing'],
      ['M', 'when', 'it was made'],
      /* KK, not K: K alone is reserved invalid and the explorer below
         refuses it. The shipped sub-kind marker is the two-letter label
         KK, read by longest match — a box label is not always one letter. */
      ['KK', 'which', 'sub-kind'],
      ['C', 'the', 'address'],
      ['S', 'the', 'signature']
    ];
    return drawing(
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
    return drawing(
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

  /* The terms of the sum, from the census (and the registry snapshot, when it loaded: absent, its
     two terms are left out of the sum rather than counted as zero). */
  function sumTerms(ALG, SNAP) {
    return [
    { n: ALG.roles.registered.length, term: 'role letters', gloss: 'what a box can be' },
    /* Longer labels are counted apart from letters, by the census's own
       split. Before that split this line counted every registered
       token as a "role letter" and overstated the namespace's
       registered letters by the number of longer labels. (No figure
       here on purpose; the test forbids typed counts in this file.) */
    { n: (ALG.roles.labels || []).length, term: 'longer labels', gloss: 'a box named by more than one letter' },
    { n: ALG.verbs.all.length, term: 'action verbs', gloss: 'what can be done' },
    { n: ALG.manifestTypes.count, term: 'record types', gloss: 'what a record is about' },
    { n: ALG.typeScoped.entries.length, term: 'type-scoped shapes', gloss: 'where meaning bends' },
    SNAP ? { n: SNAP.counts.nativeResolverChains + SNAP.counts.bridgeChains, term: 'resolver chains', gloss: 'what can be worked out and signed' } : null,
    SNAP ? { n: SNAP.counts.capabilities, term: 'capabilities', gloss: 'the mechanisms resolvers are built from' } : null
  ].filter(Boolean);
  }

  /* ---- the equation, drawn (slot "equation") ------------------------------------------------ */
  function equation(ALG, SNAP) {
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

    var terms = sumTerms(ALG, SNAP);
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
    playEq();
    return eq;

  }

  /* ---- the builder (slot "builder"): take a term out, watch something stop existing ---------- */
  function builder(ALG, ENGINE, RESTRICT, REBUILD) {
    var buildGrid = D.el('div', 'rm-build');
    var controls = D.el('section', 'rm-builder');
    controls.appendChild(D.el('p', 'rm-build-head', 'What you defined'));
    var results = D.el('section', 'rm-says');
    results.appendChild(D.el('p', 'rm-build-head', 'What can therefore be said'));
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
    controls.appendChild(D.el('p', 'rm-build-foot',
      'Two rows on the right can never be ticked on: nobody ever defined them. That is ' +
      'the whole argument, and it is the only honest way to show it.'));

    buildGrid.appendChild(controls);
    buildGrid.appendChild(results);
    renderSays();
    return buildGrid;

  }

  /* ---- the explorer (slot "explorer"): resolve a block yourself ------------------------------- */
  function explorer(ALG, ENGINE) {
    var expGrid = D.el('div', 'rm-explore');
    var exp = D.el('section', 'rm-explorer');
    var label = D.el('label', 'rm-explorer-label',
      'One role label — usually a single letter — then packed text');
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
    /* The longer labels' own registry examples join the chips, read
       from the census, so every label the grammar has can be tried —
       TITLE68656c6c6f is the one that shows longest-match taking a
       payload away from T. */
    EXAMPLES.concat((ALG.roles.labels || []).map(function (l) { return l.example; })
      .filter(Boolean)).forEach(function (ex) {
      var b = D.el('button', 'rm-chip', ex);
      b.type = 'button';
      b.addEventListener('click', function () { input.value = ex; renderBlock(); });
      chips.appendChild(b);
    });
    input.addEventListener('input', renderBlock);
    renderBlock();
    expGrid.appendChild(exp);
    return expGrid;

  }

  /* `was`: the layout key each element had on the old page, by spec entry. HAND are the pins words
     alone cannot choose: each live scene (the equation, the builder, the explorer, the two
     drawings) is pinned whole to the element it was -- its markup is unchanged, so one pin keeps
     every key inside it -- and each section that became a tab panel keys the panel alone
     (`self`). DERIVED is what tests/lib/layout-continuity.cjs derived on top of them.
     tests/resolver-math-blocks.cjs lists every reshaped or retired key with its reason. */
  var P = 'page:/div:1';
  var HAND = {
    'rm-crumbs': { ':root': { key: 'page:/nav:1', self: true } },
    'rm-hero': {
      ':root': { key: P + '/header:1', self: true }
    },
    'rm-views': {
      /* four views since the first-visit audit 2026-10-22: an old section that shares a view keys
         the disclosure that opens it (the resolve scene's, fixed-or-bends'); the totals section's
         head is retired (tests/resolver-math-blocks.cjs), its note and table keep their keys */
      '[data-ark-slot="equation"]': P + '/div:1',
      'tabs-content#2': { key: P + '/div:2', self: true }, '[data-ark-slot="builder"]': P + '/div:3',
      'disclosure#3': { key: P + '/div:8', self: true }, '[data-ark-slot="explorer"]': P + '/div:9',
      'tabs-content#3': { key: P + '/div:4', self: true }, 'accordion': { key: P + '/div:5', self: true },
      'accordion-item': { key: P + '/div:5/section:1', self: true }, 'figure#4': { key: P + '/div:5/section:1/figure:1', self: true },
      '[data-ark-slot="record"]': P + '/div:5/section:1/figure:1/svg:1',
      'accordion-item#2': { key: P + '/div:5/section:2', self: true }, 'figure#5': { key: P + '/div:5/section:2/figure:1', self: true },
      '[data-ark-slot="signing"]': P + '/div:5/section:2/figure:1/svg:1',
      'disclosure#4': { key: P + '/div:6', self: true }, 'table-wrap': P + '/div:7/section:1/div:1',
      'accordion-item#4': { key: P + '/div:7/section:2', self: true }, 'table-wrap#2': P + '/div:7/section:2/div:1',
      'tabs-content#4': { key: P + '/div:10', self: true }, 'table-wrap#3': P + '/div:11/section:1/div:1',
      'accordion-item#5': { key: P + '/div:11/section:2', self: true },
      'accordion-item#6': { key: P + '/div:14', self: true }, 'table-wrap#4': P + '/div:15/section:1/div:1',
      'disclosure#6': { key: P + '/div:13/section:1', self: true },
      'actions': { key: P + '/div:13/section:1/p:2', self: true }, 'table-wrap#5': P + '/div:13/section:2/div:1'
    },
    insert: { key: P + '/div:17', self: true },
    'rm-onward': { ':root': { key: P + '/div:16/section:1', self: true }, ':scope > div:nth-of-type(1) > ul:nth-of-type(1)': { key: P + '/div:16/section:1/div:1', self: true } }
  };
  var DERIVED = {
    'rm-crumbs': {
      'breadcrumb-item': 'page:/nav:1/a:1',
      'breadcrumb-item#2': 'page:/nav:1/a:2',
      'breadcrumb-item#3': 'page:/nav:1/span:1'
    },
    'rm-views': {
      'figure-caption#2': P + '/div:2/h2:1',
      'figure-description#2': P + '/div:2/p:1',
      ':scope > div:nth-of-type(4) > p:nth-of-type(1)': P + '/div:4/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:6/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:6/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:7/section:2/p:2',
      'figure-caption#3': P + '/div:8/h2:1',
      'figure-description#3': P + '/div:8/p:1',
      'disclosure-panel#5': P + '/div:10/p:1',
      'disclosure-panel#6': { key: P + '/div:12', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:12/h2:1',
      ':scope > div:nth-of-type(5) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:12/p:1',
      'accordion-trigger#6': P + '/div:14/h2:1',
      'accordion-trigger': P + '/div:5/section:1/p:1',
      'accordion-trigger#2': P + '/div:5/section:2/p:1',
      'accordion-content#3': P + '/div:7/section:1/p:1',
      'accordion-trigger#4': P + '/div:7/section:2/p:1',
      'accordion-trigger#5': P + '/div:11/section:2/p:1',
      /* the sum's three numbers, which were the hero's details, follow the equation as Ark facts */
      'fact#2': { key: P + '/div:13/article:1', self: true },
      'fact-term#2': P + '/div:13/article:1/p:1',
      'fact-value#2': P + '/div:13/article:1/p:2',
      'fact#3': { key: P + '/div:13/article:2', self: true },
      'fact-term#3': P + '/div:13/article:2/p:1',
      'fact-value#3': P + '/div:13/article:2/p:2',
      'fact#4': P + '/div:11/section:2/div:1',
      'fact#5': P + '/div:11/section:2/div:2',
      'fact#6': P + '/div:11/section:2/div:3',
      ':scope > div:nth-of-type(5) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:11/section:2/p:2',
      ':scope > div:nth-of-type(5) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/div:13/section:1/p:1',
      ':scope > div:nth-of-type(5) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:15/section:1/p:1',
      'figure-description': P + '/div:16/section:1/p:2',
      'figure-caption#4': P + '/div:5/section:1/figure:1/figcaption:1',
      'figure-caption#5': P + '/div:5/section:2/figure:1/figcaption:1',
      'fact-value#4': P + '/div:11/section:2/div:1/p:1',
      'fact-value#5': P + '/div:11/section:2/div:2/p:1',
      'fact-value#6': P + '/div:11/section:2/div:3/p:1',
      'button': P + '/div:13/section:1/p:2/a:1',
      'button#2': P + '/div:13/section:1/p:2/a:2',
      'button#3': P + '/div:16/section:1/div:1/a:3'
    },
    'rm-hero': {
      'eyebrow': P + '/header:1/div:1/p:1',
      'hero-lede': P + '/header:1/div:1/p:2'
    },
    'rm-onward': {
      ':scope > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:16/section:1/p:1',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(3) > a:nth-of-type(1)': P + '/div:16/section:1/div:1/a:1',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(4) > a:nth-of-type(1)': P + '/div:16/section:1/div:1/a:2',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(5) > a:nth-of-type(1)': P + '/div:16/section:1/div:1/a:4',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)': P + '/div:16/section:1/div:1/a:5',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(6) > a:nth-of-type(1)': P + '/div:16/section:1/div:1/a:6',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)': P + '/div:16/section:1/div:1/a:7'
    }
  };
  var WAS = {};
  Object.keys(HAND).concat(Object.keys(DERIVED)).forEach(function (id) { WAS[id] = Object.assign({}, DERIVED[id], HAND[id]); });

  function textOf(ax) { return ax.tests.length ? ax.tests.join(', ') : 'measured — BENCH-012'; }

  function spec(ALG, ENGINE, SNAP) {
    var builtResolvers = RESOLVERS.filter(function (r) { return r.built; }).length;
    var notBuilt = RESOLVERS.length - builtResolvers;
    var defined = sumTerms(ALG, SNAP).reduce(function (a, t) { return a + t.n; }, 0);
    return [
      { block: 'breadcrumb', id: 'rm-crumbs', was: WAS['rm-crumbs'], props: { label: 'Your place', items: [
        { label: 'Home', href: 'route:zero' }, { label: 'What is a resolver?', href: 'route:resolver' }, { label: 'Resolver Math' }] } },
      /* The answer: the sum in one sentence. Its three numbers follow the equation they count
         (first-visit audit 2026-10-22: shown first, they had to be decoded before the page said
         what it shows). */
      { block: 'hero', id: 'rm-hero', was: WAS['rm-hero'], props: {
        eyebrow: 'DEFXN · Foundational concept', title: 'Resolver Math', density: 'compact',
        lede: 'Everything this system can do is the sum of what somebody defined. Nothing else is in there.' } },
      /* Four views with plain names (first-visit audit 2026-10-22: seven tabs, "Two ideas", "Fixed vs
         bends", "Resolve a block", before the reader knew what the page shows). Nothing is dropped:
         the two live scenes share "Try it", the two drawings and the fixed-or-bends table share "How
         records work", and the rules share their view with the totals they limit. */
      { block: 'tabs', id: 'rm-views', was: WAS['rm-views'], props: { label: 'Resolver math views', items: [
        /* The equation is the page, so it is the first view. On a phone it folds behind one press:
           drawn out it is a screen and a half there. Its kind is data: a count read from the
           registry census, not a live reading (it carried a "Live" badge until 2026-10-22). */
        { value: 'equation', label: 'The equation', blocks: [
          { block: 'disclosure', props: { foldBelow: 'phone', more: 'Show the equation: ' + D.fmt(defined) + ' definitions', less: 'Fold the equation', blocks: [
            { block: 'figure', props: { kind: 'data', slot: 'equation',
              caption: 'The sum, counted from the registry: one cell for every definition. Point at a term to light its cells.',
              description: 'Two parties sign → a resolver shard resolves → the shard signs the result → replicas store → anyone audits. Census generated from ' + ALG.source + ' · spec version ' + ALG.specVersion } }
          ] } },
          { block: 'facts', props: { label: 'What the sum comes to today', columns: 3, items: [
            { term: 'Definitions in the sum', value: D.fmt(defined) },
            { term: 'Audited families built', value: builtResolvers + ' · each with a measured limit' },
            { term: 'Declared, not built', value: notBuilt + ' · things that cannot be made real today' }
          ] } }
        ] },
        /* The two scenes a reader runs: the second is a press away at every width (both open ran past
           the fold budget on a desktop). */
        { value: 'try', label: 'Try it', blocks: [
          { block: 'disclosure', props: { foldBelow: 'phone', more: 'Take a term out', less: 'Fold it', blocks: [
            { block: 'figure', props: { kind: 'live', slot: 'builder',
              caption: 'Take a term out and watch something stop existing',
              description: 'Untick a definition. The list on the right is recomputed by the real resolver, rebuilt without that definition — nothing here is a mock-up.' } }
          ] } },
          { block: 'disclosure', props: { foldBelow: 'always', more: 'Resolve a block yourself', less: 'Fold it', blocks: [
            { block: 'figure', props: { kind: 'live', slot: 'explorer',
              caption: 'Resolve a block yourself',
              description: 'Type a box and watch what happens to it. The frightening ones are not the refusals — they are the ones that say “resolved” and are wrong.' } }
          ] } }
        ] },
        { value: 'records', label: 'How records work', content: 'Two ideas this page cannot show any other way', blocks: [
          { block: 'accordion', props: { label: 'Two ideas', defaultOpen: ['record'], items: [
            { value: 'record', title: 'A record is a row of boxes', blocks: [{ block: 'figure', props: { kind: 'illustration', slot: 'record', caption: CAPTION_RECORD } }] },
            { value: 'signing', title: 'A wish is not a fact', blocks: [{ block: 'figure', props: { kind: 'illustration', slot: 'signing', caption: CAPTION_SIGNING } }] }
          ] } },
          /* what is fixed and what bends: its table and its letter, one press away (open, the view ran to
             1.8 screens at 1440) */
          { block: 'disclosure', props: { foldBelow: 'always', more: 'What is fixed, and what bends', less: 'Fold it',
            content: 'What is fixed, and the one letter that bends\n\nYou can define new things to say almost without limit. You can almost never define a new kind of box — except one, whose meaning depends on context.', blocks: [
          { block: 'table', props: { caption: 'Each layer was decided by a hazard somebody hit, not by taste.', maxHeight: 'compact',
            columns: [{ key: 'dim', label: 'Dimension' }, { key: 'kind', label: 'Status' }, { key: 'count', label: 'Count', numeric: true }, { key: 'why', label: 'Why it is this way' }],
            rows: ENGINE.layers().map(function (row) { return { dim: row.dim, kind: row.kind, count: row.count, why: row.why }; }) } },
          { block: 'accordion', props: { label: 'The letter that bends', items: [
            { value: 'positions', title: 'Why the positions are closed',
              content: 'Closed in its positions, unbounded in its payloads — adding a position risks a silent collision; adding a payload is just a new address.' },
            { value: 'observers', title: 'One letter, ten real cases',
              content: 'A type that declares no shape for a letter carries no meaning for it — undefined, not broken. The type letter Y is always fixed, so every reader agrees which case applies before anything else is interpreted.',
              blocks: [{ block: 'table', props: { caption: 'One letter, ten real cases', maxHeight: 'compact',
                columns: [{ key: 'letter', label: 'Letter', mono: true }, { key: 'type', label: 'When the record is a…' }, { key: 'shape', label: '…it means' }, { key: 'definedIn', label: 'Defined in', mono: true }],
                rows: ENGINE.observerTable().map(function (r) { return { letter: r.letter, type: r.type + (r.code ? ' (' + r.code + ')' : ''), shape: r.shape, definedIn: r.definedIn }; }) } }] }
          ] } }
          ] } }
        ] },
        { value: 'rules', label: 'Rules and limits', blocks: [
          { block: 'disclosure', props: { foldBelow: 'phone', more: 'What the rules decide', less: 'Fold it', content: 'Definitions decide what can be said. These decide what makes it true.' } },
          { block: 'table', props: { caption: 'The four rules, and the test that would catch us breaking each', maxHeight: 'compact',
            columns: [{ key: 'form', label: 'Rule', mono: true }, { key: 'note', label: 'In short' }, { key: 'tests', label: 'What holds it in place', mono: true }],
            rows: AXIOMS.map(function (ax) { return { form: ax.form, note: ax.note, tests: textOf(ax) }; }) } },
          { block: 'accordion', props: { label: 'The algebra, and where it stops', items: [
            { value: 'algebra', title: 'Written as algebra',
              content: 'A smaller statement than the sum above — “imaginary × imaginary = imaginary” is one line of it.',
              blocks: [{ block: 'facts', props: { label: 'Written as algebra', columns: 1, items: [
                { term: 'Ψ = ⟨s₁, s₂, …, sₙ⟩', value: 'a record is a row of symbols' },
                { term: 'S(s, i, O) → m', value: 'meaning needs the symbol, its place, and who is reading' },
                { term: 'S undefined → imaginary', value: 'undecided, not broken' }
              ] } }] },
            { value: 'stops', title: 'Where this page stops being true',
              content: 'The resemblance to observation collapsing a superposition is an analogy and is used as one. Nothing here is measured in quantum terms.',
              blocks: [{ block: 'table', props: { caption: 'Where this page stops being true', maxHeight: 'compact',
                columns: [{ key: 'piece', label: 'Piece of the idea' }, { key: 'state', label: 'Status' }, { key: 'need', label: 'What it would take' }],
                rows: GAPS.map(function (g) { return { piece: g.piece, state: g.state, need: g.need }; }) } }] }
          ] } },
          /* what the sum adds up to: the audited families and their measured limits */
          { block: 'disclosure', props: { foldBelow: 'always', more: 'What these numbers mean', less: 'Fold it',
            content: 'What the sum adds up to today\n\n' + builtResolvers + ' audited resolver famil' + (builtResolvers === 1 ? 'y has' : 'ies have') + ' a measured limit. ' + notBuilt + ' ' +
              (notBuilt === 1 ? 'is' : 'are') + ' declared and not built — named, because zero would mean “we measured it and it scored nothing”.' +
              (SNAP ? ' Resolver chains are a separate count: ' + SNAP.counts.nativeResolverChains + ' native and ' + SNAP.counts.bridgeChains + ' bridge chains in source (snapshot ' + SNAP.source.commitDate + ').' : '') +
              '\n\nExpanding a resolver does not make something faster. It makes it possible. A signed result is equally true whether it took 13 ms or 13 seconds — speed decides how much reality can be produced per second, not how real any of it is.',
            blocks: [{ block: 'actions', props: { label: 'The audit and the chains', items: [
              { label: 'Read the resolver audit', href: 'doc:docs/resolver-audit.md', tone: 'link' },
              { label: 'Resolvers and capabilities', href: 'route:resolvers', tone: 'link' },
              { label: 'Deprecation ledger', href: 'doc:docs/deprecated.md', tone: 'link' }
            ] } }] } },
          { block: 'table', props: { caption: 'Resolver families (audited): what each turns into a signed result, and its measured limit', maxHeight: 'compact',
            columns: [{ key: 'name', label: 'Resolver family (audited)' }, { key: 'space', label: 'What it turns into a signed result' }, { key: 'limit', label: 'Measured limit', numeric: true }],
            rows: RESOLVERS.map(function (r) { return { name: r.name, space: r.space, limit: r.built ? r.limit : 'not built' }; }) } }
        ] }
      ] } },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'rm-onward', was: WAS['rm-onward'], props: { label: 'Keep reading', relatedLabel: 'Keep reading', related: [
        { label: 'Browse resolvers', href: 'route:resolvers' },
        { label: 'What is a resolver?', href: 'route:resolver' },
        { label: 'Resolver math, in full', href: 'doc:docs/resolver-math.md' },
        { label: 'Resolver audit', href: 'doc:docs/resolver-audit.md' },
        { label: 'BENCH-012', href: 'doc:docs/evidence/bench-012-defi-shard-signed-resolution.md' },
        { label: 'Fleet dashboard', href: 'route:stats' }
      ] } }
    ];
  }

  /* A census file that did not load: a refusal that names the failure, the missing thing and the
     remedy -- never a sum with a term silently missing. */
  function unavailable(missing) {
    return [
      { block: 'breadcrumb', id: 'rm-crumbs', props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Resolver Math' }] } },
      { block: 'hero', id: 'rm-hero', props: { eyebrow: 'DEFXN · Foundational concept', title: 'Resolver Math', density: 'compact',
        lede: 'Everything this system can do is the sum of what somebody defined. Nothing else is in there.' } },
      { block: 'callout', id: 'rm-unavailable', props: { tone: 'warning', title: 'Unavailable',
        body: 'The grammar census did not load, so this page cannot show the sum it is about.',
        missing: missing + '.', remedy: 'Regenerate it with `node scripts/gen-resolver-algebra.cjs --write`, which reads flux-spec/registry.' } },
      { insert: 'main' }
    ];
  }

  ArkUI.pageModules.resolverMath = {
    spec: spec,
    mount: function (host) {
      D = ArkUI.dash;
      var ALG = window.ArkResolverAlgebra;
      var ENGINE = window.ArkResolverBlock;
      // Resolver chains and capabilities, generated by scripts/snapshot-registry.mjs. Absent
      // (not loaded) leaves those terms out of the sum rather than counting them as zero.
      var SNAP = window.ArkRegistrySnapshot || null;
      var RESTRICT = window.ArkResolverRestrict;
      var REBUILD = window.ArkResolverBlockBuild;
      var options = { page: 'resolver-math', className: 'resolver-math-page', titleId: 'resolver-math-title', terms: 'first-use' };
      if (!ALG || !ENGINE) return ArkUI.page(unavailable(!ALG ? 'js/content/resolver-algebra.js' : 'js/content/resolver-block.js'), host, options);
      options.slots = {
        equation: function () { return equation(ALG, SNAP); },
        builder: function () { return builder(ALG, ENGINE, RESTRICT, REBUILD); },
        explorer: function () { return explorer(ALG, ENGINE); },
        record: figureRecord,
        signing: figureSigning
      };
      return ArkUI.page(spec(ALG, ENGINE, SNAP), host, options);
    }
  };
})();
