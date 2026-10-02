# Operator prerequisites

## Required

- Node.js 22 or newer
- npm compatible with that Node.js release
- a local checkout of `ark-miner-cli`
- write access to the configured storage directory
- an available local status port (default documented port: `8766`)

## Optional components

- `flux-network-cli` for identity, directory, network, record, catalog, health, and topology commands
- `ark-miner-desktop` for the desktop development surface
- `flux-provider-runtime` when evaluating provider activation and execution

## Names and compatibility

Use `flux-miner` in new instructions. `ark-miner` is a legacy binary alias. Prefer `FLUX_MINER_*` environment variables in new configuration; `ARK_MINER_*` names are compatibility aliases and may still appear in older output.

## Before claiming success

Decide what you are verifying: local process startup, peer discovery, record exchange, agreement-fabric inspection, provider activation, or production readiness. These are separate outcomes. The [verification guide](verification.md) lists evidence for each.

