# Named networks

A named network is currently a namespace for miner-presence discovery. It partitions `miners/*` presence records. It does not partition accounts, identities, DAOs, or arbitrary records, and it is not a security boundary.

## Inspect networks

```sh
flux-network network list
```

Directory output is best-effort discovery, not authoritative membership.

## Create a named network

```sh
flux-network network create my-network
```

Optional description and peer flags are available in the CLI. Use `flux-network network create --help` from the exact installed revision before publishing a scripted procedure.

To start a miner in the resulting presence namespace, prefer the current environment name:

```sh
FLUX_MINER_NETWORK=<network-id> flux-miner start
```

Some CLI output may show the legacy `ARK_MINER_NETWORK` alias. New documentation uses `FLUX_MINER_NETWORK`.

## Joining and participation

There is no separate canonical “join the mesh” command. Ordinary mesh participation occurs by running a correctly configured miner. Creating a named network does not admit an identity, grant authority, or establish trust.

## Status

The command contract is verified from source. A complete live create-and-participate run was not established during the documentation audit and is therefore `Unverified`; see [current status](../status.md).

