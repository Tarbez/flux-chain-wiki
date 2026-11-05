/* The one way a <label>.defxn.com page reads the chain: the gateway's chain read relay on the page's own origin
   (owner decision 2026-11-05). The node admits an exact list of browser origins on /ws, a label page is not on it,
   and no exact list can name every label. So the page sends each read line to `path` (name-config.js
   CHAIN_READ_PATH), Caddy proxies that one path to the gateway's ask server (ark-miner-cli ops/defxn-gateway-ask,
   RELAYED_READS), and the ask server sends the line to a node over the line port, server side, with no Origin.

   relayWire returns a dense-wire WireClient whose one transport method, `_send`, goes to the relay instead of a
   socket. So every reply is read by dense-wire's own parsers (`domProof`, `resolverRecords`), never a copy. The relay
   carries the reply text unchanged and is trusted for nothing: the caller verifies what comes back (resolve-name.js
   with the shared name verifier, release.js with the bundle rules). Only the reads the relay carries can be sent;
   any other line is refused there, by name. */
import { WireClient } from "./vendor/dense-wire/flx-wire.mjs";

/** The largest relay reply the page reads. The relay's own bound for a chain's records is 16 MiB. */
export const MAX_RELAY_REPLY_BYTES = 16 << 20;

/** A read-only WireClient that sends each line to the relay at `path`. A non-200 answer throws with the relay's own
 *  refusal text (it names the failure, what is missing and the fix). */
export function relayWire({ path, fetchImpl = (url, init) => fetch(url, init) }) {
  const wire = Object.create(WireClient.prototype);
  wire.ready = Promise.resolve();
  wire.close = () => {};
  wire._send = async (frame) => {
    const tab = frame.indexOf("\t");
    const command = tab < 0 ? frame : frame.slice(0, tab);
    const arg = tab < 0 ? "" : frame.slice(tab + 1).replace(/\n$/, "");
    const response = await fetchImpl(`${path}?command=${encodeURIComponent(command)}&arg=${encodeURIComponent(arg)}`, { cache: "no-store", credentials: "omit" });
    const text = await response.text();
    if (text.length > MAX_RELAY_REPLY_BYTES) throw new Error(`the gateway's reply to ${command} is larger than ${MAX_RELAY_REPLY_BYTES} bytes`);
    if (!response.ok) throw new Error(`the gateway answered ${command} with ${response.status}: ${text.trim()}`);
    return text;
  };
  return wire;
}
