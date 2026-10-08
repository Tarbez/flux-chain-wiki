/* Loaded only when this article is requested. */
LearningContent.load("a-resolver-by-construction", {
  "core": "The next finance resolver does not try to prevent double-spend. It makes it unrepresentable. Each identity owns an append-only chain of value moves; a second record at the same position on your chain is self-signed equivocation. The grammar extension is one letter under a new registered type; the resolver is six steps, one of which is ordered, and only per-holder. Measured today, one Mac core: 24,700 entries a second per-item, 41,762 with burst batch verify across 32 chains.",
  "relevance": "Read this to understand why the finance surface is going from 'a notebook that logs transfers' to 'a chain per identity, and the chain decides.'",
  "reviewed": "2026-10-07",
  "evidenceLabel": "The design document — LEDGERENTRY, J, and the resolver's six steps",
  "evidenceHref": "docs/finance-ledger-design.md",
  "relatedPage": "stats/ledger",
  "actionLabel": "Open /stats/ledger",
  "actionPage": "stats/ledger",
  "questions": [
    "What is wrong with 'prevent double-spend'?",
    "What is a chain here, really?",
    "What is the one new letter?",
    "What are the six resolver steps?",
    "What makes a record durable?",
    "How does equivocation become fraud?",
    "What is the transport?",
    "What stops MEV?",
    "What does this not solve?",
    "How did measurement move?",
    "What was measured?"
  ],
  "sections": [
    [
      "Preventing is the wrong verb",
      "Every chain built so far spends most of its design budget on preventing two users from spending the same input at the same time. Validators, mempools, consensus rounds, fork-choice rules — all of it is machinery to decide, in a race, which claim wins. The notebook had its own version of this: a local atomic 'has this input been spent?' marker, which could be lost on crash.",
      "A simpler question: what if there is no race? What if the ledger is shaped so a double-spend attempt cannot even be rendered as a well-formed record?"
    ],
    [
      "A chain per identity",
      "Give every identity its own append-only chain. A spend becomes one entry on your own chain, signed by your own key, at a position your own previous entry determined. Position 0 is genesis; position n must carry the content address of the entry at n-1.",
      "Only your key may sign at position n. The entry at n contains the hash of n-1. So position n can hold exactly one record — any other record claiming the same position must disagree with it in bytes, which means a different content address, which means you signed two different records at the same position. That is equivocation, and your own signatures prove it."
    ],
    [
      "One new letter",
      "The registered grammar already has fourteen core letters and the claim profile's seven more. There is exactly one free top-level letter: J. We registered a new manifest type, LEDGERENTRY, with code 1A under the agreement-fabric group, and declared that for this type J carries the decimal chain position: J0 for genesis, J1 for the next entry, and so on. The previous entry's CID goes in the first C reference.",
      "Everything else reuses what already exists. A spend references a CONSUMEDMARKER, a receive references an AGREEMENT, an issue references a VALUEOBJECT with I0, a freeze references a CELLEQUIVOCATION. Four payload shapes, all registered."
    ],
    [
      "The resolver, six steps, one ordered",
      "For each incoming LEDGERENTRY: run grammar admission (dumb split on dashes, each letter's resolver runs when it is reached). Verify the signature under G. Read the holder's chain head. Check whether anyone else has already filed something at this (G, pos). Run the payload-specific check. Append — which in this stack means push the content-addressed bytes to peers and wait for K-of-N acks before Ok comes back.",
      "The only ordered step is the last one: the atomic put_if_absent on (G, pos), per holder, not globally. If the required peer acks do not come back, the admit returns Replication {got_acks, need} and nothing in memory changes."
    ],
    [
      "Durability is replication, not disk",
      "An entry is durable when K of N peers hold its content-addressed CID. The chain head is gossiped so peers always know what to pull. A node that cold-starts can rebuild its chains by walking back from each chain's known head CID — the local on-disk cache is just a convenience that lets a reopened node skip the re-pull.",
      "Replay has two modes. Fast replay verifies each chain's head signature and uses the hash chain to establish every earlier entry — because once G is pinned, the only way to construct an entry whose C[0] matches the hash of a specific predecessor is for that predecessor to be the bytes the writer actually signed. Strict replay re-verifies every signature. Measured on 16 chains × 1,000 entries: fast replay is 279,149 entries/s, strict is 27,268 — about ten times faster for the same end state."
    ],
    [
      "Equivocation is caught by the holder's own key",
      "A holder who signs two different entries at the same chain position has produced evidence under their own key. receive_fork_evidence(a, b) checks that the pair is actually from one signer at one position with different content and verifies both signatures. On success the chain is frozen on that node from that position forward; any further append is refused. A peer gossiping both halves is how a third observer learns about a fork it never saw itself. No central authority involved."
    ],
    [
      "Transport, honestly",
      "The resolver has a line-framed TCP endpoint for machine-to-machine ingress. Each request is <TAG>\\t<MANIFEST>\\n; replies are OK\\t<CID> or ERR\\t<code>\\t<reason>. A GOSSIP tag submits fork evidence. The production transport is hypercore per chain (replication) + IPFS pin (CID catalog) + GUN discovery, not HTTP — because HTTP was the bottleneck in the previous generation. The TCP endpoint is for ops ingress and direct testing today."
    ],
    [
      "Equivocation is fraud by their own key",
      "A holder who signs two different entries claiming the same position has produced evidence — two signed-by-them records with the same prev CID, the same position, and different content addresses. Anyone who holds both can prove the fraud. The spec's freeze rule applies: the chain is burned from that position forward, by its owner's own signatures. The resolver detects a fork locally when it sees the second entry; the hard part is making sure a third observer sees both halves. That is a gossip problem, and IPFS (already wired in ark-miner-cli) is the right transport."
    ],
    [
      "MEV disappears structurally",
      "MEV needs three things: a public pending pool, a party that can reorder it before finalization, and extractable value from the reorder. The chain-local design removes the first one. There is no pool. A transfer is a bilateral conversation; the only global object is the content-addressed set of records, visible only after the fact. Front-running and sandwiching are not prevented. They are unrepresentable."
    ],
    [
      "What this does not solve",
      "Issuance policy, meaning who may originate value, is a monetary decision — one key, a roster, or a registered authority. Unchanged. Counterparty discovery, meaning how A finds B, is out of scope; the intent mesh is the existing answer. And a payee who refuses to accept their half of the transfer breaks the whole; a timeout + refund entry is on the open items list."
    ],
    [
      "Measured",
      "The resolver is implemented in dense-wire::chain. Release build, one M-series Mac core, 32 holders × 1,000 entries interleaved by round. Per-item verify: 40,486 nanoseconds per entry, which is 24,700 entries a second. Signature verification is still the whole mountain at 94.5%, so batching across chains is where the real win lives.",
      "Burst batch verify (one verify_batch call across 64 interleaved entries from different chains): 23,945 nanoseconds per entry, 41,762 entries a second — about 69 percent faster than per-item, same cofactored caveat as the transfer path. A single chain is strictly sequential, so the burst has to span many holders to pay. In production this is the natural shape.",
      "The attack suite: double-spend sequential, double-spend concurrent, cross-chain confusion, chain-break on wrong prev, equivocation, replay of same bytes, tampered signature. Seven of seven refused. Zero accepted. The fleet run and the IPFS-gossip test for equivocation are the next steps."
    ]
  ],
  "numbers": true
});
