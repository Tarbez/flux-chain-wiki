# Agreements

Flux models execution as a five-stage lifecycle:

1. **Intent** — a participant describes desired work and constraints.
2. **Offer** — a provider proposes terms and capability.
3. **Agreement** — accepted terms become an addressed agreement.
4. **Fulfillment** — the provider submits the result and supporting evidence.
5. **Receipt** — verification records what was accepted or rejected.

The lifecycle is implemented in source. That does not establish that every admission, installation, activation, checking, or compensation path is automatic in production.

## Evidence

Agreement-fabric status, agreement data, and evidence are exposed through the fixed inspection endpoints listed in [verification](../operators/verification.md). An evidence record should identify the agreement CID, lifecycle stage, producer, observation time, source revision, and artifact digest.

## Interpretation

A receipt records a verification outcome under identified rules. It should not be described as universal truth or legal finality. See [authority](authority.md) for the acceptance boundary.

