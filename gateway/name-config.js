/* Where the *.defxn.com gateway shell reads names from (docs/DEFXN-NAMES-ONE-SYSTEM.md).

   CHAIN_READ_PATH where a <label>.defxn.com page reads the chain: the gateway's chain read
                   relay, on the page's own origin (owner decision 2026-11-05). Caddy
                   proxies this one path to the gateway's ask server, which sends the read
                   (DOM_PROOF for a name, RESOLVER_RECORDS for /_release/) to a node over the
                   line port, server side, and returns the reply unchanged. The page
                   verifies it (resolve-name.js, release.js; chain-relay.js carries it).
                   The node's /ws admits an exact list of origins (dense-wire
                   web/flx-network-origins.mjs), and no list can name every label, so the
                   shell's CSP connects to 'self' only.
   NAME_NODES      chain-server WebSocket line-protocol endpoints, asked in order, for a
                   page whose origin the node admits (defxn.com's site check,
                   js/ark/skin-site.js). The gateway shell does not use them for names.
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
export const CHAIN_READ_PATH = "/_chain/read";
export const NAME_NODES = NET.pageNodes.slice();
export const GENESIS_PUB_HEX = NET.genesisPubHex;
export const NETWORK = NET.network;
