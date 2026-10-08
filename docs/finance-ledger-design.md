# A finance resolver by construction

**Status:** design, 2026-10-07. Not implemented. This is the gate for the Rust
work in `defxn-defi-rs/dense-wire`; it names the grammar extension and the
resolver rules before any code is written.

**Problem it solves:** double-spend, MEV, and transaction privacy — not by
consensus mechanisms, but by making the bad states unrepresentable.

**Problem it does not solve:** issuance policy (who may originate value) and
counterparty discovery (how A finds B to transact with). Both stay explicit
decisions, named below.

## 1. The one-sentence design

Every identity owns a single append-only ledger of its own value-moves. A
spend is an append to the holder's own ledger, signed by the holder's own
key, at a position the holder's own previous append determined. There is no
global order and no shared mempool — the ledger is a tree of per-holder
chains, joined at the two points where a transfer touches two chains.

## 2. Why this makes double-spend unrepresentable

Position `n` on a holder's chain can hold exactly one record because:

1. The record at position `n` must carry the CID of the record at position
   `n-1` (hash chain, by construction).
2. Only the holder's key may sign a record claiming to extend their chain.

A holder who signs two different records both claiming position `n` has
produced **equivocation evidence**: two signed-by-them records with the same
`<prev_cid>` and the same `<position>` and different CIDs. Any observer who
holds both can prove the fraud with no further information. There is no
"which one wins" question for the resolver to answer: the holder has burned
their own chain by their own key, and the normal **freeze** rule
(`spec/agreement-fabric/08-conflict-as-data.md`) applies.

> This is the same insight that drives Nano, SCP's ledger-local ordering, and
> every certificate-equivocation detector: fork production is signature-level
> self-incrimination. We are using it as the primary mechanism rather than a
> safety net.

## 3. Why MEV disappears

MEV requires three things to exist together: (a) a public pending pool, (b) a
party that can reorder it before finalization, (c) extractable value from the
reordering. The chain-local design removes (a): there is no pool. A transfer
is a bilateral conversation; the only global object is the content-addressed
set of records, which is observable only *after* a transfer has already
appended to both holders' chains.

Front-running, sandwiching, and reorder attacks are not prevented — they are
unrepresentable, because there is no public queue to attack.

## 4. Why privacy falls out

An outside observer sees only the records their peers choose to expose
(because those peers need the records visible for their own chain to
verify). Holder A's chain is visible to A, to anyone A has transacted with,
and to equivocation watchers that A publishes to. It is not visible to the
general network.

## 5. Grammar extension

The registered grammar (`registry/role-letters.json`, spec 0.4.2) has exactly
one free top-level letter: **`J`**. Its shape is scoped per manifest type in
`manifest-types.json`, which is the hook we need.

### 5.1 New manifest type: `LEDGERENTRY` (`Y`-value `LEDGERENTRY`)

Registered fields:

| Letter | Role                         | Required | Notes                                                               |
| ------ | ---------------------------- | -------- | ------------------------------------------------------------------- |
| `G`    | Signer (holder's key)        | yes      | Must equal the chain's identity key.                                 |
| `Y`    | Type = `LEDGERENTRY`         | yes      |                                                                      |
| `V`    | Version                      | yes      |                                                                      |
| `M`    | Moment                       | yes      | Advisory; the chain decides order, not the clock.                   |
| `J`    | Chain position (decimal)     | yes      | Digits only. `J0` is genesis, `J1` is the next entry, etc.           |
| `H`    | Holder (`G`'s identity text) | yes      |                                                                      |
| `C[0]` | Previous entry CID           | yes      | On position 0 the sentinel `GENESIS0000000000` (17 alphanumeric chars, satisfies C's minLength 16). |
| `C[1+]`| Content refs (payload)       | yes      | What this entry asserts: a spend, a receipt, an issuance, a freeze.  |
| `S`    | Signature                    | yes      |                                                                      |

The resolver reads `J` as position+prev and nothing more. The *meaning* of
the entry — whether it spends input X, receives input Y, or publishes freeze
evidence — comes from the referenced content, not from `J` itself. One
letter, one job.

### 5.2 Reusing existing registered types

We do not need to invent new semantics for the entry payloads:

- **Spend** → the entry's `C` references an existing `CONSUMEDMARKER`
  (already registered). The chain says *when* the holder consumed the input;
  the marker says *which* input.
- **Receive** → the entry references the counterparty's `AGREEMENT` and
  binds it to this chain's position. This is the receipt step
  `prototype-to-production.md §1.3` currently flags as missing (`RECEIPT 0K`
  from the lifecycle spec). The chain gives it a natural home.
- **Issue** → an entry whose `C` is a `VALUEOBJECT` with `I0`, signed by a
  key the authority-policy admits. Issuance adds a new input to the
  issuer's chain; it does not create a new chain.
- **Freeze** → an entry whose `C` references a `CELLEQUIVOCATION` (already
  registered) built from two conflicting entries on another chain. Any
  holder may publish this; the referenced chain is burned from that
  position forward.

## 6. The resolver's job, in full

For each incoming `LEDGERENTRY`, the resolver runs *only* these checks, in
this order:

1. **Grammar admission.** `admit()` against the registered grammar. (Cheap;
   `defxn-defi-rs/dense-wire` already measures this at ~2% of CPU.)
2. **Signature.** Verify `S` under `G`. (Expensive; ~55% of CPU on dense-wire.)
3. **Chain head read.** Look up the holder's current chain head.
    - If this is position 0, the head must be absent; this entry becomes
      genesis.
    - Otherwise the head's CID must equal the entry's `prev`, and the
      head's position must equal `pos - 1`.
4. **Position-collision check** (equivocation detection). Any other entry
   seen with the same `(G, pos)` and a different CID is logged as
   `CELLEQUIVOCATION` evidence. The resolver still accepts the first-seen
   entry at its own log position; later observers who see both will freeze
   both.
5. **Payload-specific check.**
    - Spend: the referenced `CONSUMEDMARKER` must point at an input the
      chain can prove it owns (walk back along `J` entries until the input
      first appears, with no earlier spend between).
    - Receive: the referenced `AGREEMENT`'s second signature must cover
      *this* entry's position (so the counterparty signed into our chain).
    - Issue: `G` must be in the current authority-policy's issuance set.
    - Freeze: the two referenced entries must be genuine
      `(G', pos, prev)`-conflicting pairs; the resolver verifies both
      signatures.
6. **Append.** `put_if_absent` on `(G, pos)`. The only atomic operation on
   the whole path.

Step 6 is the one ordered operation in the system. It is ordered **per
holder**, not globally — one CPU-local mutex per chain is sufficient. There
is no cross-holder lock, no cross-shard coordination, nothing to block.

## 7. A transfer, concretely

A transfer from A to B of input `X` becomes exactly four appends — two on
each chain:

| Step | Chain | Entry                                                       |
| ---- | ----- | ----------------------------------------------------------- |
| 1    | A     | spend of `X` → `CONSUMEDMARKER` referenced at A's pos `n`   |
| 2    | A     | receipt of B's acceptance → `AGREEMENT` ref at A pos `n+1`  |
| 3    | B     | receive of `X` → `AGREEMENT` ref at B's pos `m`             |
| 4    | B     | issue of successor `VALUEOBJECT` to B at pos `m+1`          |

Only A can produce (1) and (2); only B can produce (3) and (4). The
`AGREEMENT`'s two chained signatures (the registered `S`-repeat rule) bind
A's pos `n+1` to B's pos `m` — the join. There is no step that both must
sign in the same byte-sequence, so no distributed commit protocol is
needed: each holder's append is local, and the agreement is already a
2-signature artifact.

## 8. What is *not* closed by this design

- **Issuance policy.** Who may append an issue entry is a monetary question.
  Named decisions in `prototype-to-production.md §0`: single genesis key, a
  roster, or the registered authority-policy document. Unchanged.
- **Equivocation discovery.** The resolver detects a fork only if it sees
  both halves. Without gossip, A can show B one entry at position `n` and C
  another, and neither B nor C can detect the fraud alone. The right
  transport is the Helia pinner already in `ark-miner-cli` (see `/stats`'s
  IPFS tile) — equivocation evidence is a 2-CID bundle, cheap to pin and
  cheap to re-announce. **Design decision owed:** when, and to whom, does a
  holder publish their chain head? Minimum useful rule: publish head after
  every receive from a counterparty, so no counterparty can be sold a
  stale-head story.
- **Chain compaction.** A chain only grows. A production design needs a
  snapshot-and-prune rule (checkpoint CID + prune everything before, keep a
  signed "chain begins at pos K with state S" entry). Not in v1.
- **Receiver refusal.** A payee who refuses to append step (3) breaks the
  transfer. The sender's step (1) is already on-chain and the input is
  burned. The lifecycle needs a timeout + refund entry; this maps to the
  `RECEIPT` closure the spec already names.
- **Discovery.** How does a sender *find* a recipient to form an intent
  with? Out of scope; `agreement-fabric/06-intent-mesh.md` is the existing
  answer.

## 9. Relationship to what already exists

- `spec/agreement-fabric/01-agreement-lifecycle.md` — the five existing
  manifest types (`INTENT`, `OFFER`, `AGREEMENT`, `FULFILLMENT`,
  `VALUEOBJECT`) are **unchanged**. A `LEDGERENTRY` is a *wrapper* that
  binds one of them to a holder's chain position.
- `spec/agreement-fabric/05-ephemeral-authority-cells.md` — authority cells
  and this chain are both local-ordering mechanisms. The chain is strictly
  simpler (one chain per holder, no cell lifecycle). A design decision owed:
  does the chain **replace** cells, or do cells remain for sub-identity
  roles? Default stance here: cells become a chain-position's internal
  shape, not a parallel system.
- `spec/agreement-fabric/08-conflict-as-data.md` — the freeze rule carries
  over verbatim. Freeze evidence just moves from `CELLEQUIVOCATION` on cells
  to `CELLEQUIVOCATION` on chain positions (same manifest type, same shape).
- `spec/agreement-fabric/10-transport-and-availability.md` — IPFS is where
  chain entries, consumed-markers, and equivocation bundles live. The
  resolver reads by CID; the pinner stores by CID. No change to the layer.

## 10. Implementation sequence

Each step produces an artifact that can be measured in isolation.

| # | Deliverable                                                     | Measures                                       |
| - | --------------------------------------------------------------- | ---------------------------------------------- |
| 1 | Register `LEDGERENTRY` and `J` shape in `flx/flux-spec`         | registry-conformance tests pass                |
| 2 | Vectors: one chain of five entries, one deliberate equivocation | vector tests pass, equivocation detected      |
| 3 | `dense-wire::chain` resolver: steps 1-6 of §6 on a single node  | throughput per core; parse vs sign split      |
| 4 | Attack suite: double-spend sequential + concurrent + cross-chain confusion + replay | zero accepted, zero crashes                   |
| 5 | IPFS gossip of chain heads + equivocation bundles via `ipfsPinner.addBytes` | time from fork to detection on 10 nodes       |
| 6 | Fleet run: full transfer (4 appends across 2 chains, 2 machines) | end-to-end throughput; replica-confirmed path |
| 7 | Soak + chaos: hours of load, kill one chain owner mid-run       | lost entries = 0; recovery clean              |

Step 1 blocks everything. Step 4 blocks step 6. Steps 5 and 7 can proceed
in parallel once 4 is clean.

## 11. What this changes in the pre-production checklist

Each line below answers an item in `prototype-to-production.md`:

- **§1.1 "No replica path over the wire"** — closed by step 6. The replica
  is the holder's own chain; `put_if_absent` on `(G, pos)` is the atomic
  step the current prototype lacks.
- **§1.1 "If a spend marker is lost, the same input can be spent again
  after restart"** — closed by construction: the spend is step (1) of the
  transfer, which is already an append to a signed hash-chain. Losing it
  means losing the chain head, which the chain owner can re-sign and
  recover from — and *they* are the only party who could sign a double
  spend regardless.
- **§1.2 "Batch signature verification is cofactored"** — unchanged. The
  resolver verifies entry-by-entry; batching remains an optional pool mode
  under the same caveat.
- **§1.3 "RECEIPT (`0K`) is not implemented"** — closed: receipt is a
  `LEDGERENTRY` of type receive on the payee's chain. The spec letter is
  no longer load-bearing.
- **§2.3 "A compatibility story for the live HTTP/JSON FXN registry"** —
  unchanged. The chain is a new path next to the certified fabric; it
  does not pretend to be a drop-in.

## 12. One decision owed from the owner before step 1

**Does `LEDGERENTRY` subsume `EphemeralAuthorityCell`, or sit alongside it?**

Subsume = fewer concepts, one chain per holder, cells become an entry
shape. Alongside = cells remain the sub-identity mechanism, chains govern
whole-identity value moves. Not an engineering question; it determines
what the registry carries from here forward.

My recommendation: **subsume**. Cells added a lifecycle (`CELLREQUEST` →
`CELLCERT` → `CONSUMEDMARKER`) to solve the same ordering problem a chain
solves with one letter and one `put_if_absent`. Keeping both is two bodies
of code for one job, and the law in `AGENTS.md` is clear: centralize,
don't duplicate.
