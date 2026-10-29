/* Where the *.defxn.com gateway shell reads names from (docs/DEFXN-NAMES-ONE-SYSTEM.md).

   NAME_NODES      chain-server WebSocket line-protocol endpoints, asked in order. The
                   page's CSP (index.html, connect-src) and the node site's /ws Origin
                   list (dense-wire/web/nodes-site.caddy, exact-match today) must both
                   allow the pair: until that list admits every <label>.defxn.com, only
                   the labels it names can resolve here. /native is not an option for a
                   page: browsers always send Origin, and /native refuses any.
   GENESIS_PUB_HEX the chain's genesis public key (its CHAIN_SERVER_GENESIS_KEY), 64
                   lowercase hex: the only key whose name claims count. Empty means no
                   key is pinned yet, and the shell says so instead of rendering anything.
   NETWORK         the network id these nodes run (fxn-mainnet, fxn-devnet, ...). It decides the one
                   name ending this shell opens (.fxn on fxn-mainnet, .fxndev on every test network,
                   dense-wire's nameEnding) and is passed to the verifier. Empty means the first
                   node's BUILD_INFO decides; a pin is safer, because a node is not trusted.
   Set them at deploy time; this file is the one place they live. */
/* Devnet, as deployed 2026-10-28 (flux/devnet-deploy-2026-10-23/DEPLOY.md, "Fresh devnet on the owner's genesis
   key"): CHAIN_SERVER_GENESIS_KEY in node.env on bk2 and mk2, derived from the owner's FXN ID (fxn-id genesis-key).
   nodes.defxn.com runs the old chain-server with no genesis key, so names verify only on devnet until mainnet
   is founded. Public key only. */
export const NAME_NODES = ["wss://devnet.defxn.com/ws"];
export const GENESIS_PUB_HEX = "242a1c15d39cbc0b1cea654b069f06f641be7c87761d895845e0013921ce84a8";
export const NETWORK = "fxn-devnet";
