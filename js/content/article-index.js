/* The article index, in reading order. admin.html rewrites this list; edit it by hand only to reorder. */
LearningContent.define([
  {
    "slug": "why-the-chain-was-retired",
    "title": "From one chain to one per identity",
    "category": "HISTORY / 001",
    "minutes": "3 MIN READ",
    "summary": "How the block chain gave way to the agreement fabric, and then to one grammar chain per identity, with the measurements behind the current design.",
    "reviewed": "2026-10-08"
  },
  {
    "slug": "one-substrate-many-networks",
    "title": "One substrate, many networks",
    "category": "NETWORKS / 002",
    "minutes": "2 MIN READ",
    "summary": "What the network directory isolates today, how the shared substrate differs from a network, and which named examples still need live evidence.",
    "reviewed": "2026-09-30"
  },
  {
    "slug": "governance-without-a-validator-set",
    "title": "Governance without a standing signer set",
    "category": "AUTHORITY / 003",
    "minutes": "2 MIN READ",
    "summary": "The documented distinction between ephemeral authority cells, substrate policy, and a network DAO—with production activation still unverified.",
    "reviewed": "2026-09-30"
  },
  {
    "slug": "how-we-got-fast-and-what-we-got-wrong",
    "title": "How we got fast, and everything we got wrong",
    "category": "BENCHMARKS / 004",
    "minutes": "8 MIN READ",
    "summary": "From under 7 transfers a second to about 25,000 across ten machines in one working session: every step, every dead end, and what the final number does and does not mean.",
    "reviewed": "2026-10-07"
  },
  {
    "slug": "the-grammar-does-almost-no-work",
    "title": "The grammar does almost no work",
    "category": "GRAMMAR / 005",
    "minutes": "5 MIN READ",
    "summary": "What a DEFXN transfer looks like on the wire, how a parser that only knows the dash can still reject bad input, and why the speed comes from somewhere else.",
    "reviewed": "2026-10-07"
  },
  {
    "slug": "a-resolver-by-construction",
    "title": "A finance resolver by construction",
    "category": "DESIGN / 006",
    "minutes": "6 MIN READ",
    "summary": "The next finance resolver does not try to prevent double-spend — it makes it unrepresentable. Each identity owns an append-only chain of value moves; a second record at the same position is self-signed equivocation. One new letter, six resolver steps, 51,065 ops/s of hot admission measured locally.",
    "reviewed": "2026-10-07"
  },
  {
    "slug": "the-chain-prototype-is-the-chosen-path",
    "title": "The chain prototype is the chosen path",
    "category": "BENCHMARKS / 007",
    "minutes": "6 MIN READ",
    "summary": "Six public nodes ran 3.76 million signed operations in five minutes with zero failures (12,403 a second, a metric family since retired). The older 79,654 ops/s figure is a short-burst peak; the live monitor shows the latest hourly capacity sample.",
    "reviewed": "2026-10-08"
  }
]);
