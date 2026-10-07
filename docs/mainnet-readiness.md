# Mainnet readiness: gap inventory

Observed: 2026-10-07. Written after BENCH-003 (real fleet throughput ceiling,
auto-join) closed with a real, audited number. This is not a release
announcement — it is the list of what stands between tonight's benchmark
state and something safe to call mainnet, organized so sequencing decisions
can be made deliberately rather than discovered one incident at a time.

Status vocabulary matches `docs/status.md`: `Live` (implemented and
verified), `Partial` (implemented with a named missing boundary), `Not
built` (no capability exists), `Unverified` (not established either way).

## Blocking — must close before any real value moves

### 1. No devnet. Production and every experiment share one fleet.

**Status: Not built.** Tonight's entire investigation — four benchmark
quorums, a firewall misconfiguration that silently capped a quorum for
hours, repeated process restarts, a thread-count change that degraded a
neighboring process — ran on `bk2`, `mk2`, `bk1`, the same three machines
that also run the real production 3-of-3 service on port 18993. Nothing
went wrong with production tonight, but that was outcome, not architecture:
a mis-scoped `pkill -f agreement-fabric-server-rs` actually did kill
production for 19 minutes during this investigation (caught and fixed, but
it happened on hardware that should never have been in the blast radius of
a benchmark run).

**What's needed**: a devnet that is genuinely separate, not just
differently-ported processes on the same boxes —
- Separate hosts (new VPS instances, not spare capacity on mainnet
  machines) or, at minimum, hard process/user/firewall isolation with no
  shared binary paths.
- Separate genesis: its own registry root, its own policy bundle CID, its
  own keys end to end. Nothing devnet-signed should ever verify against a
  mainnet registry or vice versa.
- Separate domain (`devnet.defxn.com` or similar) so a client can't
  accidentally point at the wrong network.
- A standing rule: infrastructure experiments (thread counts, firewall
  changes, new topologies) happen on devnet first, always — this is the
  single change that would have prevented tonight's production outage.

### 2. Auto-join has no real admission policy

**Status: Partial.** `FABRIC_JOIN_SECRET` (built tonight) closes "anyone
with network access gets in" but not "anyone who knows one shared string
gets in." There is no stake, no vote, no identity binding, no revocation if
the secret leaks, and no way to remove a member once added short of
restarting every other node with a shorter membership list (losing
everyone's join state, since membership isn't persisted either — see #4).
The real, formal mechanism for this already exists in
`flux-provider-runtime/src/policy-authority-ceremony.js`: a 7-member
authority roster, action-dependent signature thresholds (4-of-7 for
ordinary admission, 5-of-7 for member replacement, 3-of-7 for emergency
pause), unique-failure-domain enforcement so one operator can't hold
multiple seats, and epoch-numbered rotations with a signed predecessor→
successor transition. It is real, tested-looking code — and it is not
wired into the currently-running `agreement-certifier` role, which loads a
flat static `signedRegistry` instead. Before mainnet: either activate that
real ceremony for agreement-fabric membership changes, or consciously
decide the shared-secret model is the launch policy and say so publicly.

### 3. Durable finality is ~23x slower than accepted, and a client that
doesn't know the full membership silently breaks it

**Status: Partial, with a confirmed bug.** Measured fresh tonight on the
real fleet, same quorum, back to back: accepted finality 3,003.03/s,
durable finality 131.35/s. Every public number so far (including the
5,711-6,041/s headline) is accepted finality. Durable finality — the
guarantee that actually matters for "my transfer cannot be lost" — is
roughly 4% of that. Whatever mainnet promises publicly needs to say which
guarantee the number describes; "6,000 tx/s" and "~130-260 tx/s per quorum,
durably" are both true and very different claims.

Separately: route-object's successor selection considers every member in
the registry, not just the attest threshold. Once a node auto-joins, any
client whose own endpoint list wasn't updated to include the new member
gets `unknown successor member` on every durable call — accepted finality
never surfaces this because it only contacts the members it explicitly
addresses. This is a real correctness gap between auto-join and durable
finality, found by running the comparison, not by inspection — it needs a
fix (route-object should route among `attest`-capable members actually
addressed by the request, not silently expand to the full registry) before
auto-join and durable finality can be trusted together.

### 4. Nothing survives a restart

**Status: Not built.** Confirmed by hitting it twice tonight: auto-joined
membership lives only in process memory. A validator restart — for a
binary upgrade, a crash, a host reboot — resets it to whatever
`FABRIC_MEMBERS_JSON` it started with, and every member that joined since
has to be manually rejoined. On mainnet this means a routine deploy can
silently shrink the live validator set with no alert, no automatic
recovery, and (per #3) a durable-finality failure mode that looks like a
client bug rather than a membership problem. The fix is understood (append
membership changes to the same durable log the rest of the store already
uses) but not built.

### 5. No TLS

**Status: Not built.** Every endpoint tested tonight was plain `http://` —
client-to-validator and validator-to-validator. Every record is signed, so
integrity holds against tampering, but there is no confidentiality (anyone
on the path sees transfer contents) and no protection beyond whatever the
protocol itself provides against an on-path actor selectively dropping or
delaying traffic. This is a standard, known requirement, not a surprising
one — flagged here because "it's all signed anyway" is true but is not the
same claim as "this is safe to run over the open internet," and the gap
between those two claims should be closed deliberately, not assumed away.

### 6. No independent security review

**Status: Unverified**, unchanged from the existing `/stats` scope
statement. Every verification to date — the protocol logic, the auto-join
mechanism, the join-secret hardening — is this project's own. Nothing here
should be described as audited.

## Should close before mainnet, not necessarily before devnet

### 7. Nothing is systemd-managed except the original production role

**Status: Partial.** All four benchmark quorums tonight ran as raw,
hand-started `nohup` processes. None of them would survive a VPS reboot,
none restart automatically on crash, none are monitored. Only the original
port-18993 service has a systemd unit. Before any quorum is asked to carry
real value, it needs the same unit-file, restart-policy, and log-capture
treatment the production role already has — this is mechanical, not a
design question, which is exactly why it's easy to skip and shouldn't be.

### 8. No monitoring or alerting

**Status: Not built.** Every health check tonight was a manual `top`,
`ss`, or `curl` run by hand. There is no automated signal that a validator
went down, that a quorum fell below threshold, that disk is filling with
WAL data, or that durable finality's latency crossed an unacceptable
bound. A production incident (the accidental kill of bk1's service, #1)
was caught only because this investigation happened to check production
health as routine due diligence, not because anything alerted.

### 9. No deployment pipeline

**Status: Not built.** Every binary update tonight was a manual
`cargo build` + `scp` + process restart, done by hand, machine by machine.
Works for an investigation; does not scale to a real release process, and
has no rollback story beyond "redeploy the old binary by hand" (which this
investigation did once, successfully, but manually).

### 10. No adversarial or chaos testing

**Status: Not built.** Every test tonight was cooperative: well-behaved
clients, well-behaved validators, synthetic uniform traffic. Nothing has
tested a validator signing conflicting attestations, a network partition
mid-protocol, a crash between commit-certificate and route-object, or a
join request racing a rotation. The protocol's correctness under those
conditions is unverified, not assumed broken — but unverified is the
honest word for it.

### 11. No economic/spam model

**Status: Not built.** Nothing stops a client from submitting unlimited
transfer proposals for free today; the cost of a proposal is currently
zero. FXN is pre-genesis (no real token, unchanged from the existing
`/stats` scope statement), so this has not mattered yet — it will the
moment real value is at stake.

## What is NOT a gap (already real, worth stating plainly)

- The protocol itself — deterministic cell assignment, attestation,
  certificate aggregation, durable commit, successor routing, signed
  availability receipts — is a full, real port, not a subset, and is
  deployed and tested on the real production fleet (BENCH-003).
- Auto-join's mechanics (join, gossip convergence, becoming a genuinely
  interchangeable validator) are real and verified on the real fleet with
  independent confirmation and a negative control, not just locally.
- The throughput numbers on `/stats` are real, audited, reproducible runs
  against real hardware — the gap is in what surrounds the protocol
  (governance, persistence, isolation, ops), not in the protocol's own
  measured behavior.

## Suggested sequencing

1. Stand up devnet (#1) — every other gap gets safer to close once
   experiments stop happening next to production.
2. Fix the auto-join/durable-finality interaction (#3's bug half) and
   persist membership (#4) together — they're the same underlying gap
   (membership state isn't durable) wearing two symptoms.
3. Decide and implement the real admission policy (#2) — activating the
   existing ceremony code vs. formalizing the shared-secret model as a
   conscious launch choice.
4. TLS (#5), systemd + monitoring (#7, #8) — mechanical, parallelizable,
   no design decisions blocking them.
5. Security review (#6), deployment pipeline (#9), chaos testing (#10),
   economic model (#11) — each real, each can start once the above is
   stable rather than shifting under active infrastructure change.
