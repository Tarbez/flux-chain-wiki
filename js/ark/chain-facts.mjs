/* The numbers the site's pages state about the network, read live from a node (owner, 2026-11-10: "streamed straight
   from the chain, no manual hard data"). Layer: app (the defxn site). No number is typed here, and no answer is a value:
   every read returns `{ value }` or `{ absent: <why> }`, and a page shows "No node answered" for an absent read, never 0
   and never an older figure. docs/design/space/CLAIMS-AUDIT-2026-11-10.md lists which page line reads which fact.

   ONE PATH. Every read goes through the wallet's wire (js/ark/dense-wire-wallet.mjs WalletWire, the client the footer
   price and /account already use, to the node resolveWireUrl names). The launch price is parsed by the vendored
   parseLaunchPrice (js/dense-wire/flx-launch-blobs.mjs) and the decimals by parseDecimalsReply (flx-amount.mjs). The
   other replies have no vendored parser yet, so `lines` below reads them strictly: the exact head, the exact field
   count, the row count the head names, and the END line. A reply of any other shape is absent, by name.

   THE RELEASE. A fact is read only from a node on the devnet release, and the release is read from the chain, never
   typed (kernel 63353a01, dense-wire chain_server.rs):
   - BUILD_INFO names the node's network (fifth field). It must be the network the public pages serve, PAGE_NETWORK of
     the pinned network list the browser uses (js/dense-wire/fxn-network.mjs).
   - FOUNDING names the network's founding record. It must be filed (not "-"): a network that is not founded has no
     release in force.
   - PROTOCOL names the protocol this binary runs and the protocol in force on the network's chain (node_release.rs:
     release 1 is the genesis protocol, and every later release is a filed release record). The two must be equal.
   The release in force is then "protocol <active> of <network>, founding <cid>", and every fact carries it. */
import { WalletWire, resolveWireUrl, fxnSalePrice, wireQuiet, wireFailed } from "./dense-wire-wallet.mjs";
import { parseLaunchPrice } from "../dense-wire/flx-launch-blobs.mjs";
import { parseDecimalsReply, formatAmount } from "../dense-wire/flx-amount.mjs";
import { BASE_CHAIN_ID } from "../dense-wire/flx-dao-builders.mjs";
import { PAGE_NETWORK } from "../dense-wire/fxn-network.mjs";

const absent = (why) => ({ absent: why });

/* One reply, read strictly: the first line's head and field count, then `rows` lines of head `row` (when `count` names the
   field holding their number), then the END line. -> { head: [fields], rows: [[fields]] } or throws by name. */
function lines(reply, { head, fields, row, count, end, rowFields }) {
  const all = String(reply).split("\n").filter((l) => l.length);
  const first = (all[0] || "").split("\t");
  if (first[0] !== head) throw new Error(`the node answered ${JSON.stringify((all[0] || "").slice(0, 60))}, not ${head}`);
  if (fields && first.length !== fields) throw new Error(`${head} has ${first.length} fields, not ${fields}`);
  const body = all.slice(1, end ? -1 : undefined);
  if (end && all[all.length - 1].split("\t")[0] !== end) throw new Error(`${head} did not end with ${end}`);
  const rows = row ? body.filter((l) => l.split("\t")[0] === row).map((l) => l.split("\t")) : [];
  if (row && rowFields && rows.some((r) => r.length !== rowFields)) throw new Error(`a ${row} row of ${head} has the wrong field count`);
  if (count != null && rows.length !== Number(first[count])) throw new Error(`${head} names ${first[count]} rows and carries ${rows.length}`);
  return { head: first, rows };
}

/** The release in force, read from the node: `{ value: { network, protocol, founding, build } }` or `{ absent }`. */
export async function readRelease(wire) {
  try {
    const build = lines(await wire.sendLine("BUILD_INFO\t"), { head: "BUILD_INFO", fields: 5 }).head;
    if (build[4] !== PAGE_NETWORK) return absent(`The node is on ${build[4] || "no network"}, not ${PAGE_NETWORK}.`);
    const founding = lines(await wire.sendLine("FOUNDING\t"), { head: "FOUNDING", fields: 3 }).head;
    if (founding[1] !== PAGE_NETWORK || !/^[0-9a-f]{64}$/.test(founding[2])) return absent(`${PAGE_NETWORK} has no founding record filed on this node, so no release is in force.`);
    const protocol = lines(await wire.sendLine("PROTOCOL\t"), { head: "PROTOCOL", fields: 15 }).head;
    if (!/^[0-9]+$/.test(protocol[1]) || protocol[1] !== protocol[2]) return absent(`The node runs protocol ${protocol[1]}, and the network's release in force is protocol ${protocol[2]}.`);
    return { value: { network: build[4], protocol: Number(protocol[2]), founding: founding[2], build: build[1] } };
  } catch (error) {
    return absent(`No node answered the release read: ${error && error.message ? error.message : "no reply"}.`);
  }
}

/* Open the wire, check the release, run `read`, close. Every fact goes through here, so no fact skips the release check. */
/* ONE DIAL FOR A NODE THAT IS DOWN (2026-11-11). Every fact opened its own wire, so a page with two facts (the footer's price and
   the page's own) dialled a dead node twice, and every page load did so again: 1 or 2 failed sockets per load, each a console error,
   with no limit across pages. Now the first fact's dial is shared: a fact asked while it is in flight waits for it and dials only if
   it opened. A failed dial is kept for the tab (dense-wire-wallet.mjs wireFailed), and for 5 minutes no fact dials that address. */
let dialling = null;
async function onRelease(read) {
  const url = resolveWireUrl(), kept = wireQuiet(url);
  if (kept) return absent(`No node answered: ${kept}`);
  if (dialling && dialling.url === url && !(await dialling.open)) return absent(`No node answered: ${url} took no connection.`);
  const wire = new WalletWire(url);
  try {
    if (!dialling || dialling.url !== url) {
      const mine = dialling = { url, open: wire.opened() };
      const open = await mine.open;
      if (dialling === mine) dialling = null;
      if (!open) { wireFailed(url); return absent(`No node answered: ${url} took no connection.`); }
    }
    const release = await readRelease(wire);
    if (release.absent) return release;
    const out = await read(wire, release.value);
    return out.absent ? out : { value: out.value, release: release.value };
  } catch (error) {
    return absent(`No node answered: ${error && error.message ? error.message : "no reply"}.`);
  } finally {
    wire.close();
  }
}

/** A chain's launch fee and stake, whole FXN as text: `{ value: { fee, stake } }` or `{ absent }`. LAUNCH_PRICE and DECIMALS. */
export function launchTerms() {
  return onRelease(async (wire) => {
    const reply = await wire.sendLine("LAUNCH_PRICE\t");
    lines(reply, { head: "LAUNCH_PRICE", end: "LAUNCH_PRICE_END" });
    const price = parseLaunchPrice(reply);
    if (typeof price.chain.fee !== "bigint" || typeof price.chain.stake !== "bigint") return absent("LAUNCH_PRICE named no fee or no stake.");
    const dec = parseDecimalsReply(String(await wire.sendLine(`DECIMALS\t${BASE_CHAIN_ID}`)));
    if (dec.refused) return absent(`The node gave no FXN decimals: ${dec.refused.failure}.`);
    return { value: { fee: formatAmount(price.chain.fee, dec.decimals), stake: formatAmount(price.chain.stake, dec.decimals) } };
  });
}

/** Who changes the network's rules: `{ value: { dao, k, n } }`, `{ value: { genesisKey: true, source } }` or `{ absent }`.
 *  The DAO is the network's own `paramdao` parameter (NETPARAMS); its signers in force come from DAO_COUNCIL. An unset
 *  paramdao reads as the genesis key: until it hands the parameters over, no multisig holds them (netparams_reply, kernel
 *  63353a01). Absent only when no release node answers. */
export function rulesMultisig() {
  return onRelease(async (wire) => {
    // NETPARAMS has no head line: NETPARAM rows (4 fields each), a NETPARAMS_UNFILED count, then NETPARAMS_END.
    const reply = String(await wire.sendLine("NETPARAMS\t")).split("\n").filter((l) => l.length).map((l) => l.split("\t"));
    if (!reply.length || reply[reply.length - 1][0] !== "NETPARAMS_END") return absent("NETPARAMS did not end with NETPARAMS_END.");
    const params = reply.filter((f) => f[0] === "NETPARAM");
    if (!params.length || params.some((f) => f.length !== 4)) return absent("NETPARAMS carried a row of the wrong shape.");
    const row = params.find((f) => f[1] === "paramdao");
    if (!row) return absent("NETPARAMS named no paramdao row.");
    // FXN Genesis ruling, 2026-11-10: an unset paramdao is a reading, not an absence. The genesis key changes the rules until
    // the parameter DAO is filed. Never fall back to another DAO (fxndao, the genesis mint's) as the rule-changer.
    if (row[2] === "-") return { value: { genesisKey: true, source: row[3] } };
    const signers = lines(await wire.sendLine(`DAO_COUNCIL\t${row[2]}`), { head: "DAO_COUNCIL", fields: 6, row: "SEAT", rowFields: 3, count: 3, end: "DAO_COUNCIL_END" });
    const k = Number(signers.head[2]), n = Number(signers.head[3]);
    if (!(k > 0 && n >= k)) return absent(`DAO_COUNCIL for ${row[2]} named no signers.`);
    return { value: { dao: row[2], k, n } };
  });
}

/** FXN's sale price, USD then EUR, as fxnSalePrice reads it (FXN_SALE): `{ value: { usd, eur } }` or `{ absent }`. */
export function salePrice() {
  return onRelease(async (wire) => {
    const usd = await fxnSalePrice(wire, "USD"), eur = await fxnSalePrice(wire, "EUR");
    return usd.absent && eur.absent ? absent(`The chain gives no FXN price: ${usd.absent}.`) : { value: { usd, eur } };
  });
}

/** The named pinners this node's keeper has heard a hold statement from: `{ value: { keeper, pinners } }` or `{ absent }`.
 *  KEEP_STATUS names the node's keeper; KEEP_GET <keeper> pins carries one statement per named pinner. */
export function pinnersHeard() {
  return onRelease(async (wire) => {
    const status = lines(await wire.sendLine("KEEP_STATUS\t"), { head: "KEEP_STATUS" }).head;
    if (!/^[0-9a-f]{64}$/.test(status[1] || "")) return absent("The node runs no keeper, so it has no pinners to name.");
    const pins = lines(await wire.sendLine(`KEEP_GET\t${status[1]}\tpins`), { head: "KEEP_PINS" }).head;
    if (pins[1] !== status[1]) return absent("KEEP_PINS answered for another keeper.");
    return { value: { keeper: status[1], pinners: pins.length - 2 } };
  });
}
