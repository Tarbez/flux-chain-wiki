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
   Set both at deploy time; this file is the one place they live. */
export const NAME_NODES = ["wss://nodes.defxn.com/ws"];
export const GENESIS_PUB_HEX = "";
