/* DEFXN mockup: the network, read off the owner's network picture (601 x 436, 2026-10-23), which
   enriches the first ring illustration: a hub ring with the DEFXN mark at the centre, chains
   around it, a label for each chain kind, small cubes on stems, and dotted orbits. One home for
   it: the app builds it in 3D, and the small network map draws it flat.

   RINGS: centre x, centre y (middle of the tile band), outer width, tiles, tone in the picture:
     H the hub, T teal, L light gray, M mid gray, D dark gray.
   CUBES: x, y, tone. LABELS: the picture's callout spots this scene uses, kind and x, y.

   2026-10-23: each ring's kind is now set by hand in KIND below (owner: identity, resolver, token,
   pool and named network chains on home, each one clickable, each with an empty logo slot). The
   tone letters stay only for the picture they were read from.
   What the shapes mean is DEFXN's real model (brand brief, 2026-10-23, from
   docs/FXN-NODE-ARCHITECTURE-2026-10-23.md), not the picture's first labels:
     hub        DEFXN, the base chain kernel (owner, 2026-10-24: "DEFXN is not the chain. It is simply the
                base chain kernel, and it knows no currency. FXN is the first chain."). On home it is the
                logo in the ground; it has no coin and no ledger.
     network    the network chains on the kernel: FXN (the first chain, coin FXN), DeArk (DARO) and CR3TV (CR3)
     identity   every identity's own ledger chain (light and mid rings)
     token      every token's own history ledger; a token lives inside a chain (dark rings)
     resolver   the cubes: the programs that do the work, each run by the nodes that choose it
   No ring is a named real chain: the shapes show kinds, not live chains (nothing is live yet).
   The visitor's chain ("yours") is the identity ring nearest the hub: the one "Create your
   identity" makes. */
(function () {
  var W = 601, H = 436;
  var RINGS = [
    [300, 185, 200, 16, 'H'],
    [57, 100, 88, 12, 'L'], [192, 55, 92, 12, 'L'], [287, 75, 68, 10, 'D'], [127, 148, 52, 10, 'T'],
    [367, 22, 56, 10, 'D'], [466, 102, 136, 16, 'T'], [552, 156, 44, 8, 'D'], [536, 222, 100, 12, 'L'],
    [55, 225, 86, 12, 'M'], [190, 290, 102, 14, 'T'], [435, 280, 76, 12, 'T'], [500, 350, 86, 12, 'M'],   /* 11 grew into FXN's ring; 12 stepped out of its way (2026-10-24) */
    [86, 358, 76, 12, 'D'], [362, 368, 64, 10, 'D']
  ];
  /* what each ring is (owner, 2026-10-23: "identity chains, resolver chains, token chains, pool
     chains, and other network chains such as CR3TV and DeArk"). The brief draws a token as a
     ledger inside a network chain, not a chain of its own (owner decision, 2026-10-15), so tokens
     are named "token ledgers". A pool signs its swap results on its own chain
     (dense-wire/docs/design/swap-fill-record.md, "the pool chain"). A resolver has its own chain
     (brief, section 2). The two named networks are the brief's own: DeArk (coin DARO) and CR3TV
     (coin CR3); FXN, the first chain, is the third network ring (coin FXN), with FXN's ledger inside it.
     The hub is DEFXN, the base chain kernel: it knows no currency (owner, 2026-10-24). Every other ring
     shows a kind, not a live chain. */
  /* Chains inside chains (owner, 2026-10-23: "a token is a chain inside a chain; drawing every
     chain as its own ring defeats the idea"). FXN lives on the FXN chain, DARO on
     DeArk, CR3 on CR3TV; a network's ledger holds the balances of its own coin; "a token lives
     inside one native chain"; a pool signs its swap results on its own chain. So the three network
     chains are the big rings, and inside each sit its coin's ledger (round its centre), its token
     ledgers and a pool that trades two of them. Identity and resolver chains stand outside, each a
     ring of its own. Which tokens and pools a network holds is not data: these show the idea. */
  var KIND = ['hub', 'identity', 'identity', 'resolver', 'resolver', 'identity', 'network', 'resolver', 'identity',
    'identity', 'network', 'network', 'identity', 'identity', 'resolver'];
  /* the hub is the kernel: no coin. FXN is the first chain (first: true) */
  var NAMED = { 0: { id: 'defxn', name: 'DEFXN', coin: null, kernel: true }, 11: { id: 'fxn', name: 'FXN', coin: 'FXN', first: true },
    6: { id: 'deark', name: 'DeArk', coin: 'DARO' }, 10: { id: 'cr3tv', name: 'CR3TV', coin: 'CR3' } };
  /* the chains inside: parent ring, kind, angle (degrees; 90 faces the camera, so they sit on the
     far half, clear of the front tiles), distance from the parent's centre and size (shares of the
     parent's radius), tiles, and for a ledger its id and coin */
  var CHILDREN = [
    [11, 'ledger', 0, 0, .46, 10, 'fxn-ledger', 'FXN'],
    [11, 'token', 222, .76, .15, 6], [11, 'pool', 270, .78, .13, 6], [11, 'token', 318, .76, .15, 6],
    [6, 'ledger', 0, 0, .46, 10, 'daro-ledger', 'DARO'],
    [6, 'token', 222, .76, .14, 6], [6, 'pool', 270, .78, .12, 6], [6, 'token', 318, .76, .14, 6],
    [10, 'ledger', 0, 0, .46, 10, 'cr3-ledger', 'CR3'],
    [10, 'token', 222, .76, .15, 6], [10, 'pool', 270, .78, .13, 6], [10, 'token', 318, .76, .15, 6]
  ];
  var PARENT = KIND.map(function () { return -1; });
  CHILDREN.forEach(function (ch, j) {
    var i = KIND.length; KIND.push(ch[1]); PARENT.push(ch[0]);
    if (ch[1] === 'ledger') NAMED[i] = { id: ch[6], name: ch[7] + ' ledger', coin: ch[7] };
  });
  /* every ring keeps an empty slot at its centre for a logo. To show one: put the file in
     logos/ and name it here by the ring's id, for example deark: 'logos/deark.png'. */
  var LOGOS = { defxn: null, fxn: null, deark: null, cr3tv: null };
  var count = {};
  var IDS = KIND.map(function (kd, i) {
    if (NAMED[i]) return NAMED[i].id;
    count[kd] = (count[kd] || 0) + 1;
    return kd + '-' + count[kd];
  });
  var CUBES = [
    [205, 15, 'L'], [325, 92, 'L'], [468, 43, 'L'], [183, 108, 'T'], [57, 163, 'L'],
    [128, 243, 'L'], [470, 172, 'L'], [300, 277, 'L'], [361, 316, 'L'], [166, 400, 'D']
  ];
  /* the callout spots: a label for each kind, each with a leader to the nearest ring of its kind;
     "computers" names the cubes on stems: the computers that keep a copy (the lede's last line) */
  var LABELS = [
    ['identity', 57, 44], ['network', 530, 44], ['resolver', 58, 284], ['token', 232, 404], ['pool', 470, 420], ['computers', 418, 206]
  ];
  var NAMES = { fxn: 'FXN chain', identity: 'Identity chains', network: 'Network chains', token: 'Token ledgers', resolver: 'Resolver chains',
    pool: 'Pool chains', ledger: 'Coin ledgers', computers: 'Computers' };
  var HUB = 0, MINE = -1, bd = Infinity;
  RINGS.forEach(function (r, i) {
    var d = Math.hypot(r[0] - RINGS[HUB][0], r[1] - RINGS[HUB][1]);
    if (KIND[i] === 'identity' && d < bd) { bd = d; MINE = i; }
  });

  window.DEFXN_NETWORK = { W: W, H: H, RINGS: RINGS, CUBES: CUBES, LABELS: LABELS, NAMES: NAMES, KIND: KIND, HUB: HUB, MINE: MINE,
    IDS: IDS, NAMED: NAMED, LOGOS: LOGOS, CHILDREN: CHILDREN, PARENT: PARENT,
    /* the ring a ring id names on the ring page: any ring but yours (which has a page of its own), else DeArk */
    ringIndex: function (id) { var i = IDS.indexOf(id); return i >= 0 && i !== MINE ? i : IDS.indexOf('deark'); } };
})();
