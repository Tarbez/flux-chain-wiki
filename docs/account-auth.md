# Account and publish authorization

The public `/account` route uses the shared Ark UI Auth Kit panel. Opening a
`.auth.flx` file and checking its PIN happen locally. The root signing handle
is held in browser memory and is disposed when the route is left or the user
signs out. The recovery file, PIN, and private key are never uploaded.

The route only displays facts actually present in the kit: identity id, root
key, wallet link, and security profile. After unlock it can make one exact-ID
`POST /explorer/v1/record` read for `identities` on the local Miner
(`127.0.0.1:8766`). If that signed identity record carries an `accountId`, the
page follows it with a second exact-ID read against `accounts` and shows only
the returned standing/status. Without that binding, standing remains
unavailable. FXN holdings and Credits remain unavailable because the Miner
does not expose a verified holdings read contract here. A wallet address in a
kit is not evidence of a current balance.

The admin publish action consumes Ark UI's shared framework-neutral scoped
authorization view at the final signing boundary. Before the local Ed25519
name-record signature is produced, the editor shows the requester, local
network, authority key, scope, action, Claim Stack, manifest, exact signing
bytes, and SHA-256 digest. Cancel resolves without a signature or publish
request. Approval signs precisely the reviewed string.

This is a scoped review for the existing local publisher. It is not yet the
DAO apps' hybrid Ed25519 + ML-DSA-87 action-authorization protocol; that needs
the wiki's approved hybrid identity handle and Miner verifier contract.
