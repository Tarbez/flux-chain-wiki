# Deprecated Concepts — Never Reintroduce

**Locked 2026-10-10.** This ledger is permanent. Enforced by
`defxn/tests/no-deprecated-vocabulary.cjs`, which fails if a live doc
reintroduces any term below.

The reason this exists: the work kept circling back to blockchain
thinking because the docs still carried blockchain vocabulary. Removing
the vocabulary removes the gravity. A comment is a convention; a failing
test is a law.

---

## The one path forward

1. **Two parties sign** their intent (Block 9 each).
2. **A resolver shard resolves** — verify signatures → check nonces →
   batch auction → AMM math.
3. **The shard signs the result** (Block 9). **This signature IS the
   truth.**
4. **Replicas store** the signed result. No re-verification. No
   re-execution. No consensus.
5. **Anyone can audit** by walking the signature chain.

Everything else is deprecated.

---

## Blockchain Thinking (Deprecated)

- Committees, validators, consensus rounds
- Block production, block time, finality
- TPS, accepted/s, admissions/s
- Replica apps, replica application
- Segment shipping, durability layers
- Per-record acks, 27× amplification
- Proof-of-work, proof-of-stake
- Gas fees, block rewards
- State roots, merkle trees (except where explicitly needed for signed
  manifests)

## FLX Thinking (Keep)

- Two parties sign
- Resolver shard resolves
- Shard signs the result
- Replicas store (no re-verification)
- Anyone can audit via signature chain
- Ed25519 signatures, batch verified
- FLX manifests, dense v3 grammar
- Hypercore for feeds, GUN for presence, IPFS for archive
- 20/30/50 for archive pinning, not feed replication
- Proof of Support for storage allocation, not consensus

---

## Why each deprecated term is wrong, not merely unfashionable

Vocabulary carries a model. Each of these imported an assumption that
does not hold here.

| Term | The assumption it smuggles in | What is true instead |
|---|---|---|
| committee, consensus round | that several parties must agree before a result is real | one shard signs; its signature IS the result |
| finality, block time | that truth arrives later, after rounds | truth exists the moment the shard signs |
| TPS, accepted/s, admissions/s | that swaps compete for block space and the rate is the product | swaps per batch auction and batch latency are the product |
| replica apps / replica application | that a replica re-executes | a replica **stores**; re-executing would make it an authority it is not |
| segment shipping, durability layer | that durability is a separate layer bolted beneath | the signed result is the unit; a feed carries it |
| per-record acks | that every record needs its own round trip | one signature per batch, one broadcast per batch |
| validator | that the storer judges | the storer stores; the auditor judges, later, from signatures |

## Measured consequences of the deprecated model

These are kept because they are the evidence for the deprecation, not
because the numbers are worth quoting again:

- Per-record acknowledgement cost **27×** against the batch boundary.
- A local append log inside the acknowledgement path cost **52.8×** and
  recovered nothing.
- A "replica applications/s" figure published on the site was
  **arithmetic**, not a measurement — logical ops × 4.

## Rule

Any doc that uses blockchain vocabulary (consensus, committee, validator,
TPS, block time, finality) is automatically wrong and must be rewritten.

Any work that reintroduces a deprecated concept is rejected.

Any resolver that does not publish its audit manifest is not registered.

(Note added 2026-10-19: "registered" in the line above means *audited* — it names the audit manifests in `docs/resolver-audit.md`. Since 2026-10-18 "registered" also names a resolver launched on the registry ledger; say "audited" for the first and "launched" for the second. See `docs/glossary.md`.)

## Quoting a deprecated term in order to retire it

A historical record may need to name what it retired. Put
`ALLOW-DEPRECATED-TERM` on that line. Do not use the token to keep a live
claim alive — if the sentence asserts a deprecated concept is current, it
is wrong regardless of the token.
