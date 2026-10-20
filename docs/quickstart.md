# Quickstart

This path starts a local Flux miner from source. It demonstrates that the daemon can start on your machine; it does not establish public-network membership or production readiness.

## Before you begin

- Node.js 22 or newer
- npm
- a local checkout of the miner repository

The canonical repository URL is currently `Unverified`. Obtain the checkout from the project owner, then follow the repository-local instructions rather than guessing a clone URL.

## Install and start

From the miner checkout:

```sh
npm install
cp .env.example .env
npm start
```

The packaged command name is `flux-miner`; `ark-miner` remains a legacy alias. The default status listener is documented as `127.0.0.1:8766` unless configuration changes it.

## Verify

Confirm that the process remains running and that its status endpoint responds on the configured host and port. Record the version, configuration, startup output, and status response. Use the full [verification checklist](operators/verification.md) before making a capability claim.

## After it runs

A running miner is one node. These are the next places to look; none of them needs the miner to be public.

- To read what is on the network and re-check who signed it, open the Mesh Explorer (explore.defxn.com). It runs on the development network today; public hosting is not established.
- To launch your own resolver, follow the six steps on defxn.com at `/how-deployment-works`. The deployer (deploy.defxn.com) shows the exact record before you sign it.
- To see what a resolver is built from, read `/resolvers` on defxn.com: the resolver chains and the shared capabilities, from a dated read of the source rather than a live network.

## Continue

- Full procedure and recovery steps: [Run from source](operators/run-from-source.md)
- Named-network behavior: [Networks](operators/networks.md)
- Known capability boundaries: [Current status](status.md)

