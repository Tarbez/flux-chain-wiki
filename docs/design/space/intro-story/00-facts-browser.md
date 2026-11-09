# Facts from the FXN Browser session (2026-11-09)

Reader: the intro story team. Source: the FXN Browser session (flux/ark-browser). Paths are under /Volumes/PortableSSD/flux/ark-browser/.

**The limit first.** This is before genesis. Nothing is publicly released. "Works today" means in the installed dev build on one machine, not for a public visitor. There is no public download yet.

## 1. Your FXN ID and its key
- The identity is a keypair made on the device (Ed25519 through native WebCrypto). Proof: src/main/ark-identity-service.js, src/main/native-ed25519.js.
- The private key stays on the device, wrapped by the OS secure store (Keychain). It is never written in clear. If the OS vault is missing, the browser keeps the key in memory only. Proof: src/main/secure-storage.js.
- The server never holds it. The secret never crosses into the web side. Proof: tests/native-crypto.test.mjs, src/preload/ark-bridge.js.
- Status: the local identity works today (dev build). A chain-registered .fxn name is built, not released (waits for genesis).

## 2. Sharing, review and revoke
- A site asks for access through a permission prompt. The person sees it and grants or denies it. Grants are stored and can be revoked. Proof: src/main/ark-permission-service.js, src/main/ark-action-guard.js.
- Status: ask, review and revoke work today (dev build).
- Sharing a document with another person over the network is built but off at genesis behind a flag. Status: built, not released.

## 3. Carrying it
- One local identity signs for the browser's own pages. Apps are Bundles the browser runs.
- Status: one identity across the browser's pages works today. Carrying it across separate worlds and machines depends on the chain: built or planned, not released.
- Do not claim per-site keys in the film yet.

## 4. Earning and compute
- The miner runs as its own process and does storage and compute work. Status: it runs today (dev build). Payouts per FXN ID are built, not released. Do not show a visitor earning money today.

## 5. What a visitor can do today
- A local dev install browses the web and fxn:// pages, makes a local identity, opens .fxn files and uses the Writer. Updates come as signed Bundles. No public download yet (planned, after genesis).
- Broad docs: planning/full-scope.md, planning/apps-sharing-and-live.md. Security: planning/security-audit-2026-11-08/README.md.
- The session's advice: show most of the identity and earning story as the design and the promise, not as something a visitor does today, unless the owner says to show the near future.
