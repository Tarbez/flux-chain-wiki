/* The FXN networks the app pages and services connect to. Layer: app (deploy values). The kernel learns none of this.

   One list, here. Every app reads it and none keeps its own copy of these values:
     - the *.defxn.com gateway shell and the defxn.com site, through gateway/name-config.js;
     - the Domains page (product-surfaces), the Bundles page and CLI (bundle-deploy), each as a pinned byte-for-byte copy
       (ops/scripts/vendor/pin-copies.mjs; each product's package.json "pins");
     - `npm run names:system` (ops/scripts/names/system-names.mjs), which reads this file in place;
     - the gateway's TLS ask service on flx-bk2 and flx-mk2, whose two environment values `askEnv` prints.

   What is NOT here, because another list already holds it:
     - The name ending. dense-wire's `nameEnding(network)` derives it: `.fxn` on fxn-mainnet, `.fxndev` on every test
       network (dense-wire src/name_rent.rs:50-52). A page calls it with `network` from this file.
     - The witness nodes. dense-wire's signing guard reads them by network from WITNESS_NODES
       (flx-network-witnesses.mjs, round 14). A page that names no witness of its own gets that list.

   Per network:
     host           the name every page connects to. Its A records name the start seats (doc 27, step 3.4). A page's
                    WebSocket is wss://<host>/ws. The chain checks the page's Origin (CHAIN_SERVER_WS_ORIGINS).
     seats          the start seats, each with its public address. A service asks them on the line port (19800).
     gate           the FXN ID gate the network's signing sites make and open v10 FXN IDs with: `url`, the gate's https
                  origin (each site's CSP admits it, through dense-wire's connectSourcesFor), and `committeeSha256`, the
                  sha256 of the committee file every site serves as gate.committee (defxn assets/gate.committee). A site
                  whose committee has other bytes is refused by its deploy script. Named once here, so no site hand-adds
                  the gate to its CSP (owner ruling 2026-11-05, "id-gate-one").
   genesisPubHex  OWNER VALUE. The network's genesis public key, its CHAIN_SERVER_GENESIS_KEY: 64 lowercase hex, the only
                    key whose name claims count, and the key every name proof is checked against. The genesis run makes
                    it: `$K/genesis-fxn-id/genesis.pub` once the run's node.env names it. Empty means not filed: the
                    gateway renders nothing and the Domains page claims nothing, and both say so.

   The seat plan is the owner's to confirm, and finality may move to home validators. A change is one edit here; the
   pins then copy it to each product. Pure and browser-first: no imports. */

/** The line protocol's port on every seat (chain-server, 127.0.0.1 and the public address). */
export const LINE_PORT = 19800;

export const NETWORKS = Object.freeze({
  'fxn-devnet': Object.freeze({
    host: 'devnet.defxn.com',
    seats: Object.freeze([
      Object.freeze({ name: 'flx-big1', address: '162.35.11.130' }),
      Object.freeze({ name: 'flx-lax24', address: '162.35.19.107' }),
    ]),
    gate: Object.freeze({ url: 'https://gate.defxn.com', committeeSha256: '1f326d502d464e47d27c525eac2ce73dec2d119ddf8aa12ba83c4a89e90a57f0' }),
    genesisPubHex: '',
  }),
});

/** The network the public pages serve today. */
export const PAGE_NETWORK = 'fxn-devnet';

const HEX64 = /^[0-9a-f]{64}$/;
const NETWORK_ID = /^fxn-[a-z0-9-]{1,28}$/;
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const HTTPS_ORIGIN = /^https:\/\/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** Why `networks` cannot serve, as one sentence, or null. A genesis key may be empty (not filed yet), never malformed. */
export function networkListRefusal(networks = NETWORKS) {
  for (const [network, entry] of Object.entries(networks)) {
    if (!NETWORK_ID.test(network)) return `${JSON.stringify(network)} is not a network id (fxn- then lowercase letters, digits and -).`;
    const { host, seats, gate, genesisPubHex } = entry ?? {};
    if (typeof host !== 'string' || !host.includes('.') || !host.split('.').every((part) => LABEL.test(part))) return `${network}: ${JSON.stringify(host)} is not a host name.`;
    if (!Array.isArray(seats) || seats.length === 0) return `${network} names no seat.`;
    if (new Set(seats.map((s) => s?.address)).size !== seats.length) return `${network} names one seat address twice.`;
    const bad = seats.find((s) => typeof s?.name !== 'string' || !LABEL.test(s.name) || !IPV4.test(s?.address ?? ''));
    if (bad) return `${network}: ${JSON.stringify(bad)} is not a seat (a name and an IPv4 address).`;
    if (genesisPubHex !== '' && !HEX64.test(genesisPubHex ?? '')) return `${network}: the genesis key is not 64 lowercase hex.`;
    if (gate !== undefined && (!HTTPS_ORIGIN.test(gate?.url ?? '') || !HEX64.test(gate?.committeeSha256 ?? ''))) return `${network}: the gate is not an https origin with the committee file's sha256 (64 lowercase hex).`;
  }
  return null;
}

/** What an app needs for `network`: `{ network, host, pageNodes, askNodes, seats, gate, genesisPubHex }`. `gate` is null
 *  when the network names none. Throws a refusal that
 *  names the failure, the missing value and the remedy when this file does not list the network. */
export function networkConfig(network = PAGE_NETWORK) {
  const entry = Object.hasOwn(NETWORKS, network) ? NETWORKS[network] : null;
  if (!entry) {
    throw Object.assign(new Error(`This app has no settings for the network ${JSON.stringify(network)}. Missing: an entry for it in fxn-network.mjs (NETWORKS). To fix: add the network's host, seats and genesis key there, then copy the pins again.`), {
      name: 'NetworkRefusal',
      code: 'NETWORK_UNLISTED',
      failure: `This app has no settings for the network ${JSON.stringify(network)}.`,
      missing: 'an entry for it in fxn-network.mjs (NETWORKS)',
      remedy: "add the network's host, seats and genesis key there, then copy the pins again",
    });
  }
  return Object.freeze({
    network,
    host: entry.host,
    pageNodes: Object.freeze([`wss://${entry.host}/ws`]),
    askNodes: Object.freeze(entry.seats.map((seat) => `${seat.address}:${LINE_PORT}`)),
    seats: entry.seats,
    gate: entry.gate ?? null,
    genesisPubHex: entry.genesisPubHex,
  });
}

/** The gateway TLS ask service's environment for `network` (ark-miner-cli ops/defxn-gateway-ask), as `NAME=value` lines.
 *  An empty genesis key prints as empty, and the ask service then issues no certificate. */
export function askEnv(network = PAGE_NETWORK) {
  const net = networkConfig(network);
  return [
    `DEFXN_GATEWAY_ASK_NAME_NODES=${net.askNodes.join(',')}`,
    `DEFXN_GATEWAY_ASK_GENESIS_KEY=${net.genesisPubHex}`,
    `DEFXN_GATEWAY_ASK_NETWORK=${net.network}`,
  ].join('\n');
}
