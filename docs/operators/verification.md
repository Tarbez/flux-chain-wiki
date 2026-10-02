# Verification checklist

Verification must name the capability, environment, source revision, observation time, and artifact. Do not use “working” as a substitute for those facts.

## Local daemon startup

- process remains running;
- status listener responds;
- source revision and package version are recorded;
- storage path is writable;
- secrets are removed from captured output.

## Named-network presence

- record the `flux-network` version;
- record the created or selected network ID;
- run miners with the same intended network configuration;
- show presence discovery from a separate process or host;
- do not describe discovery output as authoritative membership.

## Resolver deployment

- identify the pattern and resolver address;
- identify an admitted, active provider;
- show fresh capacity;
- record the request, claim, checker result, and relevant receipts;
- distinguish published resolver metadata from deployed execution capacity.

## Agreement fabric

Inspect the fixed endpoints exposed by the miner:

```text
GET /agreement-fabric/status
GET /agreement-fabric/agreements/:cid
GET /agreement-fabric/agreements/:cid/evidence
```

Record the response, observation time, and referenced agreement CID. Endpoint availability alone does not prove economic settlement or production readiness.

## Production-readiness claim

A production claim requires independent hosts, live role readiness, the hostile test matrix, and signed soak evidence. Until those artifacts are registered, production activation remains `Unverified`.

