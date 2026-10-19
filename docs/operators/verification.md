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

## Resolver launch and serving

Read these in the explorer (explore.defxn.com, or the local explorer on port 4541) and paste its verified rows; it re-checks every CID and signature itself. See [resolvers](../protocol/resolvers.md).

- chain id and launch CID (the `ResolverLaunch` record);
- control field: the control key, or immutable;
- grammar state: enforced, or `Unspecified` (legacy);
- the capabilities it composes, and that each is launched at the pinned manifest;
- providers announcing (`CHAIN_PROVIDERS`), each with its proof CID when the resolver composes capabilities;
- the node and the observation time.

Keep `launched` distinct from `served`: a launched resolver with no announcing provider answers nothing.

## Agreement fabric (retired, read-only)

The agreement-fabric path is no longer the direction ([status](../status.md)); these endpoints are kept read-only for compatibility.

Inspect the fixed endpoints exposed by the miner:

```text
GET /agreement-fabric/status
GET /agreement-fabric/agreements/:cid
GET /agreement-fabric/agreements/:cid/evidence
```

Record the response, observation time, and referenced agreement CID. Endpoint availability alone does not prove economic settlement or production readiness.

## Production-readiness claim

A production claim requires independent hosts, live role readiness, the hostile test matrix, and signed soak evidence. Until those artifacts are registered, production activation remains `Unverified`.

