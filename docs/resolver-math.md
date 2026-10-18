# Resolver Math — why FLX works

```
  what you define
+ what you define
+ what you define
+ …
─────────────────
= everything that can be real
```

That is the equation. Everything this system can do is the **sum of what
somebody put in the dictionary** — the letters and longer labels, the
verbs, the record types, the rules, the resolvers. Nothing is in the result that was not
defined into it, and whatever was never defined is not slow. It does not
exist.

Today, from the live registry:

| | term | what it buys |
|---:|---|---|
| 20 | role letters | what a box can be |
| 5 | longer labels | a box named by more than one letter |
| 18 | action verbs | what can be done |
| 93 | record types | what a record is about |
| 10 | type-scoped shapes | where meaning bends |
| 5 | resolvers | what can be worked out and signed |
| **=** | | **everything FLX can make real today** |
| 0 | lending resolvers | so lending cannot happen |
| 0 | split-payment verbs | so a split payment cannot be said at all |

The live figures are rendered on [/resolver-math](/resolver-math) from the
generated census; the table above is a snapshot and the page is the
source. Take a term out there and capabilities disappear — computed by
rebuilding the real resolver without that definition, never by a lookup
table.

**You are not discovering this. You are writing it.**

---

## The symbolic form, which says less

```
Ψ = ⟨s₁, s₂, s₃, …, sₙ⟩     a record is a row of symbols; n is not fixed
S(s, i, O) → m              meaning needs the symbol, its place, and who is reading
S undefined → imaginary     undecided, not broken
```

Nothing in `Ψ` carries its own meaning. A symbol is an **address**, not a
value: `what` becomes `W392`, a reference into a shared table, and the
table is not inside the record. The same bytes therefore mean different
things to different observers — a property of the design, not a defect
in it.

`imaginary × imaginary = imaginary` is one line of this: two undecided
things multiplied stay undecided. It is true, and it is a much smaller
statement than the sum above.

The **resolver** is the operator that converts imaginary intents into a
real signed result. The **signed result is the reality of the
imagination.**

**Your resolver's limits are your limitations.**

---

## The observer is not a person

In the general algebra `O` is "whoever is looking". Here it is concrete
and it is not a human: **`O` is which resolver you hand the record to.**
A ledger entry is agnostic grammar — only the signature and the chain
position are universal, and every other letter is interpreted by the
resolver registered against that type. The same signed record handed to
a different resolver resolves to a different thing, or to nothing.

This is where observer-relativity stops being philosophy and starts
costing something. If every observer may invent meanings privately, two
peers resolve the same bytes differently and **neither signature means
anything to the other.** What prevents that is not a rule against
imagination; it is that `O` publishes its table, signed, so anyone can
tell which observer produced a result. That is why every resolver in the
[resolver audit](resolver-audit.md) carries a signed manifest, and why
one that does not publish its manifest is not registered.

An unbounded space of meanings needs a *pinned* observer to be worth
anything.

---

## Where the boundary actually is

"Infinite dimensions, zero cost" is half right, and the wrong half is the
expensive half. The grammar is **closed in its positions and unbounded in
its payloads.** Each layer below was decided by a hazard somebody hit,
not by taste.

| Dimension | Status | Why |
|---|---|---|
| **Positions** — the role label opening a block | **closed** | Every letter of the 26 is accounted for as registered, reserved-invalid, reserved-tooling or free. An unaccounted letter is a latent silent-collision bug. Beside the letters sit longer labels, and a block takes the **longest** label it starts with; a label is not a letter of the namespace and is never counted as one. |
| **Verbs** — what the Action role can say | **closed** | An unregistered verb throws rather than resolving to a default. The list must stay prefix-free, or a future `SENDER` misparses as `SEND` plus garbage. |
| **Manifest types** — what a record is about | **open set** | A catalog, not a gate. Nothing refuses a type outside it; a product with a domain the core has never heard of registers its own at runtime. |
| **Meaning per observer** — a letter whose shape depends on the record's type | **relative** | The one strongly observer-relative dimension, and deliberately tiny. See below. |
| **Payloads** — the content of a block | **unbounded** | Any UTF-8 string enters as hex of its bytes, so the wire alphabet stays at 63 characters while the symbol space has no bound. |

Live counts are not written here on purpose. They are generated from
`flux-spec/registry` into `js/content/resolver-algebra.js` and rendered
on [/resolver-math](/resolver-math); a count typed into a doc
drifts the moment somebody registers a letter.

Both halves are necessary. Unbounded in both would mean no two observers
agree. Closed in both would mean every new name needs a schema change.

### Why a position cannot be invented freely

Some roles **absorb**. `T` accepts any dash-free alphanumeric text, so
nothing alphanumeric placed after it can ever be rejected. Add a role
letter without checking and an existing letter swallows the new tokens
and resolves them *successfully, to the wrong thing.* The registry's own
worked example is `TYPEGHOST`, which is why manifest types live on `Y`
and not on `T`. The same hazard parked `N` in tooling rather than leaving
it free: a "deny" role would resolve `NOTIFY` to `{Denied:"OTIFY"}`.

**A silent collision is worse than a refusal.** The refusal names what it
needs; the collision signs something nobody meant.

### Longer labels move the same hazard, they do not remove it

Not every box opens with a single letter. The registry also holds longer
labels — `NAME`, `TITLE`, `KK` and others — and a block takes the
**longest** label it starts with, so `NAMEalice` is read as `NAME`, not
as the tooling letter `N`. Where a label opens with a reserved letter
(`NAME` under `N`, `KK` under `K`) it takes nothing from a live role.
Where it opens with a registered one it takes payloads away from it:
since `TITLE` exists, no `T` value can begin with `ITLE`, because that
text now opens `TITLE` instead. Read by first character alone,
`TITLE68656c6c6f` resolved *successfully* as an opaque Target — the
`TYPEGHOST` collision again, one prefix longer. Which labels exist, and
which letter each one takes from, is derived from the registry and
rendered on [/resolver-math](/resolver-math); it is not listed here.

### Why a payload can be anything

`-` is the only delimiter and the only non-alphanumeric character a
pattern may contain, so the wire alphabet is 63 characters. An arbitrary
string enters as hex of its UTF-8, which keeps the alphabet tiny while
the symbol space stays unbounded. Measured in the same grammar's
learning work: **244 symbols are embedded** (closed: structure and
function words) against **594,371 addressed** (open: every name of a
thing). Counting the addressed half as though each needed a learned row
is the mistake — a store reference is not a weight.

---

## Observer-relative meaning, built — for exactly one letter

The strong form of `S(s, i, O)` — the same symbol at the same position
meaning different things to different readers — is not a thought
experiment here. It is implemented for a deliberately tiny slice of the
namespace: a letter with **no single global shape** may be given one
*per manifest type*.

`J` is that letter. It is the one letter still free at the top level,
and it means a different thing depending on what the record is about —
the chain position on a `LEDGERENTRY`, a different shape on a `POOL`.
The live table is rendered on
[/resolver-math](/resolver-math) from the registry; it is not
copied here, for the same reason the counts are not.

**And here is the rule that makes it safe.** The type letter `Y` is
always global, never type-scoped. A reader therefore establishes *which
observer applies* from a position every peer agrees on, **before**
interpreting anything observer-relative. Pick the type first and the
block resolves one way and only one way.

That is the whole answer to "how do two peers agree when meaning is
relative": **the observer's identity itself is not relative.**

A type that declares no shape for `J` carries **no meaning for it** —
exactly as unresolved as an unregistered letter. That is `S` returning
undefined, per observer instead of globally. Imaginary, scoped.

---

## The formalism

```
Definition:
  Let I_A = Alice's imaginary intent (unsigned manifest)
  Let I_B = Bob's imaginary intent (unsigned manifest)
  Let R   = Resolver shard (verifies, computes, signs) — the observer O

Then:
  R(I_A, I_B) → O = signed result

Where:
  I_A, I_B ∈ Imaginary   (no signature, no reality)
  O        ∈ Reality     (signed, replicable, auditable)

Axioms:
  1. Imaginary × Imaginary = Imaginary   (no resolution without R)
  2. R × Imaginary         = Reality     (resolution produces reality)
  3. Reality × Reality     = Reality     (replicas store without change)
  4. Imaginary × Reality   = ∅           (cannot resolve into the past)

Limits:
  R can only resolve what it understands.
  R's verification set defines the space of valid intents.
  R's computation set defines the space of valid results.
  Any intent outside R's space is unresolvable.

Conclusion:
  The resolver defines the boundary of what can be real.
  Expand the resolver, expand reality.
  Limit the resolver, limit reality.
```

---

## Each axiom is enforced in code, not asserted

This is the part that matters: the axioms are not decoration. Each one
corresponds to behaviour that a named test holds in place.

### Axiom 1 — Imaginary × Imaginary = Imaginary

Two unsigned intents resolve to nothing. An intent whose signature does
not verify is not a weaker intent; it is not an intent. One forged
signature fails the **entire batch**
(`a_forged_intent_fails_the_whole_batch`), and the shard deliberately
does not hunt for the culprit — doing so would let one piece of
imagination impose N verifications on the resolver.

The same axiom holds one layer down, at the grammar: an unregistered verb
does not fall back to a default meaning, it throws.

### Axiom 2 — R × Imaginary = Reality

The resolver verifies, computes, and signs. **The signature is the
truth** — not a claim about the truth, and not a vote toward it.

Measured: the shard's signature costs **0.3%** of a batch. Verifying the
parties costs **75%**. Making something real is nearly free; establishing
that the intents were real is the work.

### Axiom 3 — Reality × Reality = Reality

A replica stores the signed result **without change and without
re-verification** (`a_replica_stores_without_verifying`). A replica that
re-verified would be re-deciding, which would make it an authority it is
not. Storing is the whole job.

### Axiom 4 — Imaginary × Reality = ∅

You cannot resolve into the past. A replayed nonce is refused by name
(`a_replayed_nonce_is_refused_and_named`). A result commits to the
ordered set of intents it resolved, so a batch reordered after the fact —
every signature in it still genuine — does **not** audit clean
(`a_reordered_batch_fails_the_audit`).

---

## Expanding the observer expands what exists — dated

This is the one claim here with a date rather than a benchmark behind it.

Until **2026-08-14** the `A` role knew two verbs: `SEND` and `NOTIFY`. A
verb missing from that list makes the interaction *inexpressible* — not
slow, not unsupported, inexpressible. On that date the social group was
registered, and `FOLLOW`, `ENDORSE`, `SUPPORT`, `CITE`, `COLLABORATE`
and `DELEGATE` became things a signed record could say.

Six capabilities came into existence by registering six strings. No code
changed shape to allow it and no model was retrained. That is the
practical content of "expand the resolver, expand reality" — and the
practical content of the inverse is the table below.

---

## The limits, measured

"Your resolver's limits are your limitations" is a claim with numbers
behind it. These are the limits of the resolvers that exist today.

| Resolver | What it can resolve | Measured limit |
|---|---|---|
| DeFi-Swap-AMM | 2 signed swap intents → one cleared batch | 256 swaps per batch, 13.874 ms, 153.7 batches/s |
| Identity-Name-Ownership | 1 signed name record → ownership | 0.0011 ms per resolution |
| Device-Enrollment | 1 signed enroll/revoke → roster | 0.0011 ms per resolution |
| Grammar-Admission-Floor | 1 dense record → fields | 715,955 records/s |
| Stake-Position | 1 signed stake lock → position | verifies its own signature, far slower |

**Fifteen further resolvers are declared and not built** — lending,
borrowing, liquidation, governance, treasury, group membership, content
publish, claim, vault, search, geometric, AI/TLM, traffic. Each is a
region of intent that currently **cannot be made real**. See
[resolver audit](resolver-audit.md).

That table is the honest statement of the limits. Not built is recorded
as not built, never as zero: zero would mean "measured, and scored
nothing", which is a different and much stronger claim.

---

## What this page does not claim

The algebra at the top describes more than what is built. Each gap is
named rather than reported as working, and never as zero.

| Piece of the algebra | Status | What it would take |
|---|---|---|
| **A per-*peer* meaning table** — two peers privately holding different meanings for one symbol at one position | **not built, and partly on purpose** | The *type*-scoped form above is built and real. What does not exist is a per-peer override: the type-scoped shapes live in one shared registry every observer reads the same way. Two peers cannot privately disagree about what a type means — if they could, neither's signature would mean anything to the other. |
| **Runtime self-registration** — a record that defines a new dimension, so the grammar extends itself as it runs | **not built** | Registering a dimension today is a signed change to the registry, reviewed against absorbing roles for silent collisions. The review is the cost, and it is not zero. A self-registering record would have to carry that collision check or it re-introduces `TYPEGHOST` at runtime. |
| **Asking a human at parse time** for a meaning the table lacks | **rejected, not pending** | Deliberately not a gap to close. Resolution must be deterministic to be signable: two observers have to get the same result from the same bytes, and a parse that stops to ask does not. An unresolved dimension refuses by name instead — that is axiom 1. |
| **"Zero cost" for an unbounded space** | **overstated** | A lookup is O(1) and a small record parses in O(n); that part holds. What is not free is admitting a new *position*, which costs a collision audit against every absorbing role. That is human review, and this grammar has already got it wrong once. |

The resemblance to observation collapsing a superposition is an analogy
and is used as one. Nothing here is measured in quantum terms, and the
algebra does not need the physics to stand up.

---

## What follows from this

* **Expanding a resolver expands what can exist.** A lending resolver
  does not make lending faster; it makes lending *possible*.
* **A resolver's verification set is a boundary on reality.** An intent
  the resolver does not understand is not slow — it is unresolvable.
* **Speed is a property of the boundary, not of the truth.** A signed
  result is equally true whether it took 13 ms or 13 seconds. Speed
  decides how much reality can be produced per second, not how real it
  is.
* **One price per batch is an axiom-level choice, not an optimisation.**
  Because every intent in a batch clears at the same price, position
  inside the batch cannot change what anyone pays. Ordering advantage is
  not mitigated; it is removed from the space.
* **A closed position list is not a smaller imagination.** It is what
  makes an unbounded payload space safe to address.
