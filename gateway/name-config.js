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
   All three are derived from fxn-network.mjs, the one list of FXN networks every app reads, so this file holds no value
   of its own. To move the gateway to another network, or to file the genesis key after the genesis run, edit
   fxn-network.mjs (PAGE_NETWORK, NETWORKS). Until the key is filed, GENESIS_PUB_HEX is empty and the shell says so. */
import { networkConfig, PAGE_NETWORK } from "./fxn-network.mjs";

const NET = networkConfig(PAGE_NETWORK);
export const NAME_NODES = NET.pageNodes.slice();
export const GENESIS_PUB_HEX = NET.genesisPubHex;
export const NETWORK = NET.network;
