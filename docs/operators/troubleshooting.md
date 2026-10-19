# Troubleshooting

## The miner exits during startup

**Collect:** Node.js version, package version, source revision, startup output, and redacted configuration.

**Check:** Node.js is 22 or newer, the storage path is writable, required dependencies installed successfully, and the status port is available.

## Status does not respond

**Collect:** configured host and port, listener output, and local firewall information.

**Check:** the default listener is loopback-only. A remote request will not reach `127.0.0.1`; change the binding only with an appropriate access-control plan.

## Another miner is not discovered

**Collect:** both miners' network IDs, peer configuration, logs, and observation time.

**Check:** both processes use the same intended presence namespace and can reach one another. Remember that the directory is best-effort discovery, not authoritative membership.

## A resolver is launched but nothing answers

**Collect:** chain id, `RESOLVER_LIST` row, `CHAIN_PROVIDERS` output, the record you sent and the node's reply.

**Check:** launched and served are different states. Is the chain on `RESOLVER_LIST`? Is a provider in `CHAIN_PROVIDERS` before its announce deadline (one hour)? Periodic re-announce comes with `flx-resolver-host`; an older host does not re-announce. If the resolver composes capabilities, does the proved column cover every one, and is each capability launched at the pinned manifest version? A refused record names the failure, what is missing and the remedy: read it before retrying.

## A result is signed but disputed

**Collect:** the signed result, the signer, the resolver's chain id, the record sent, and its `RESOLVER_LIST` row.

**Check:** a resolver's signature is its result. Whether to rely on that resolver is decided by its grammar, its capabilities and who can change it; check those facts, not the signature alone.

If the evidence does not establish a cause, report the capability as `Unverified`; do not convert missing evidence into a product conclusion.

