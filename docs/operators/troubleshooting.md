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

## A resolver is published but cannot execute

**Collect:** resolver address, provider admission state, capacity freshness, request identifier, and checker output.

**Check:** publication and deployment are different states. Execution requires an admitted active provider with fresh capacity.

## A claim is signed but disputed

**Collect:** claim, signer identity, resolver address, input, checker output, authority decision, and receipts.

**Check:** a signature proves attribution, not semantic truth. Evaluate the resolver and authority rules that apply to the claim.

If the evidence does not establish a cause, report the capability as `Unverified`; do not convert missing evidence into a product conclusion.

