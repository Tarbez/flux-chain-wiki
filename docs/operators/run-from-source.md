# Run the miner from source

## Goal

Install and start the Flux miner from a trusted local checkout.

## Preconditions

Complete the [operator prerequisites](prerequisites.md). Confirm the checkout is the intended source revision. The public repository URL is `Unverified`, so this guide does not provide a guessed clone command.

## Commands

```sh
cd /path/to/ark-miner-cli
npm install
cp .env.example .env
npm start
```

The package also exposes the `flux-miner` binary. `npm start` invokes the repository's start command and is the canonical source-checkout path.

## Expected result

The daemon stays running without an immediate fatal error and exposes status on its configured listener. The documented default is `127.0.0.1:8766`.

## Verification

Capture:

- source revision and package version;
- Node.js and npm versions;
- non-secret configuration values relevant to storage, network, and listener binding;
- startup output;
- status response and observation time.

Then apply the [verification checklist](verification.md).

## Common failures

- **Unsupported runtime:** install Node.js 22 or newer.
- **Port already in use:** select an unused status port and restart.
- **Storage is not writable:** correct ownership or select a writable storage path.
- **Peer discovery does not occur:** verify network configuration, reachability, and whether you are testing presence discovery or a different capability.

See [troubleshooting](troubleshooting.md) for the evidence to collect.

## What this does not establish

A successful local start does not prove independent-host readiness, automatic provider admission, deployed resolver capacity, production compensation, or public release availability.

