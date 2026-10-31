/* The signed-in identity's real card objects: its PVA and its skins, read from a dense-wire node and verified in this
   browser. Spec: docs/home-redesign/nft/CHAIN-HANDOFF.md (section 1) and its chain build, flux/defxn-defi-rs branch
   pva-chain (dense-wire/src/objects.rs).

   It verifies nothing itself and keeps nothing. readObjectsOf (js/dense-wire/flx-object-proof.mjs, the ONE shared
   verifier, vendored byte for byte; tests/dense-wire-object-proof-vendor.test.mjs keeps it that way) asks the node
   OBJS_OF and then OBJ_PROOF for each object, and checks every signature here. A listed object that does not verify,
   or that the key does not own, is never shown: it comes back in `refused` with its reason.

   readChainCards({ url, key }) ->
     { kind: "cards", key, pva: verified | null, skins: [verified], refused: [{ id, code, failure, missing, remedy }],
       notChecked }
     { kind: "unreachable", detail }    no answer from the node
     { kind: "error", reason }          the node answered with something this reader does not know
   identityKeyHex(identity) -> the 64-hex key of an ArkUI.localIdentity / accountSession identity, or null.
   mintSkin({ who, wire, pointer }) -> the minted skin, verified: { kind: "minted", id, skin } or
     { kind: "refused", failure, missing, remedy }. `who` is the signed-in Auth Kit identity, `wire` a WalletWire,
     `pointer` the skin packed by DefxnCardRecord.skin.toPointer. The full signing review shows first
     (dense-wire-wallet.mjs reviewAndSign); nothing is signed without the holder's yes.
   A trade is two signatures, each after the full signing review, on two devices:
   acceptSkin({ who, wire, id }) -> { kind: "accepted", id, edge, owner } | refused. The next owner's consent: a
     KEDGE1 from the skin's current head to its pointer. It moves nothing. The page then gives a link the owner opens.
   giveSkin({ who, wire, id, edge }) -> { kind: "given", id, to, paid } | refused. The owner's move from the current
     head to that consent. It is checked with the one verifier (the proof plus the edge and the move) before it is
     sent, and read back after.
   A priced sale (dense-wire skin_sales.rs): acceptSkin({ ..., price, days }) also signs a KSALE1 after the consent, so
   the taker's FXN is held for that consent at once. The owner's move then pays the owner in the same step
   (giveSkin refuses a sale that is not funded, and its review names the price). endSale({ who, wire, edge }) -> the
   taker takes the FXN back after the deadline when the owner did not move.

   activatePva({ who, wire, publish }) -> { kind: "activated", id, published } | refused. The public id's own PVA,
     citing the first FXN payment that reached it or one of its wallets: published ones (WALLETS_OF, checked here)
     and private ones (who.publicId.wallets, links only in the FXN ID file). The chain counts only a payment it can
     tie to the public id, so when the first payment is in a private wallet, `publish(walletKey)` sends that one
     link first (owner, 2026-10-25: activation publishes it, after a warning) and must resolve true. One per identity; the chain refuses a
     second (PvaTaken) and a payment that is not the signer's (NotEarned). The activation carries the card's mix, fixed
     now (owner, 2026-10-29): try n signs DEFXN_TRAITS.mixDraw(key, n). The chain refuses a mix another PVA holds
     (MixTaken); the page then draws try n + 1 and asks for a new signature.

   A real card has no number (owner, 2026-10-25): its card record carries the PVA's object id in the O box, and its
   mix is the one its activation carries (pva.mix; a PVA activated before 2026-10-29 has none, and its mix is drawn from
   its id: DEFXN_TRAITS.objectRecord, js/nft/card-record.js). Exports only; no top-level work. */
import { WireClient } from "../dense-wire/flx-wire.mjs";
import { readObjectsOf, parseObjectProofReply, verifyObjectProof, verifyWalletsOf } from "../dense-wire/flx-object-proof.mjs";
import { base64ToHex } from "../dense-wire/flx-identity-bridge.mjs";
import { keyName, buildPvaActivationWithSigner, PVA_CHAIN, buildSkinMintWithSigner, buildSkinHeadEdgeWithSigner, buildSkinMoveWithSigner, buildSkinSaleWithSigner, buildSkinSaleEndWithSigner, parseSaleOfReply, SKIN_CHAIN, OBJECT_POINTER_RELATION } from "../dense-wire/flx-object-builders.mjs";
import { sha256Hex, verifyHex } from "../dense-wire/flx-crypto.mjs";
import { reviewAndSign, signerFor } from "./dense-wire-wallet.mjs";
// Amounts on the wire are base units; fxnText prints them at the node's declared decimals (docs/FXN-DECIMALS-DESIGN.md).
import { readDecimals, fxnText } from "./fxn-holdings.mjs";

/** The identity's Ed25519 key as hex: publicKeyB64 is base64 of the 32 raw bytes (flx-identity-bridge.mjs). */
export function identityKeyHex(identity) {
  if (!identity || typeof identity.publicKeyB64 !== "string") return null;
  try {
    const hex = base64ToHex(identity.publicKeyB64);
    return /^[0-9a-f]{64}$/.test(hex) ? hex : null;
  } catch {
    return null;
  }
}

export async function readChainCards({ url, key, wireClient = (u) => new WireClient(u) } = {}) {
  if (!/^[0-9a-f]{64}$/.test(key || "")) return { kind: "error", reason: "No identity key. Sign in first, then the site reads your cards." };
  const client = wireClient(url);
  let read;
  try {
    await client.ready;
    read = await readObjectsOf({ wire: client, key });
  } catch (error) {
    return { kind: "unreachable", detail: `${url}: ${(error && error.message) || error}` };
  } finally {
    try { client.close(); } catch {}
  }
  if (read.kind !== "objects") return read;
  const found = read.objects.find((o) => o.chain === "pva") || null;
  // a public id's name is made from its key (keyName; owner decision 2026-10-25), so the card shows it with no lookup
  const pva = found && { ...found, name: await keyName(found.owner) };
  const skins = read.objects.filter((o) => o.chain === "skin");
  const notChecked = [...new Set(read.objects.flatMap((o) => o.notChecked || []).map((n) => n.split(":")[0]))];
  return { kind: "cards", key, pva, skins, refused: read.refused, notChecked };
}

/** Mint one skin for the signed-in identity: review, sign, send, then read it back from the chain and verify it. */
export async function mintSkin({ who, wire, pointer, readBack = readObjectsOf }) {
  const refuse = (failure, missing, remedy) => ({ kind: "refused", failure, missing, remedy });
  if (!/^df51[0-9a-f]{60}$/.test(pointer || "")) return refuse("This is not a skin this shop packed.", "a pointer from DefxnCardRecord.skin.toPointer", "build the skin in the shop again");
  const signer = signerFor(who);
  const head = await wire.chainHead(signer.pubHex);
  const pos = head.kind === "head" ? head.length : 0;
  const prevCid = head.kind === "head" ? head.headCid : "0".repeat(64);
  // one clock for both passes: reviewAndSign builds the record twice (to show it, then to sign it)
  const nowSec = Math.floor(Date.now() / 1000);
  const run = (s) => buildSkinMintWithSigner({ signer: s, pos, prevCid, skinPointer: pointer, nowSec });
  const text = await reviewAndSign({
    who, signer, wireUrl: wire.url, run,
    title: "Mint this skin",
    description: "This signs one skin onto your key. Your PVA stays as it is. You can trade the skin later.",
    action: "object.mint", scope: "skin.mint",
    authority: "(none: a holder-signed skin mint; it needs your PVA, and nobody else signs)",
    configuration: "dense-wire object grammar · KASSET1 on " + SKIN_CHAIN,
    denies: "scope does not authorize a move of your PVA, of any skin, or any FXN",
    claims: ["evidence chain " + SKIN_CHAIN, "evidence pointer " + pointer],
    manifest: { schema: "dense-wire.object-mint/1", minter: signer.pubHex, chain: SKIN_CHAIN, pointer, at: nowSec },
    facts: [{ label: "Skin", value: pointer }, { label: "Owner", value: signer.pubHex }],
  });
  const reply = String(await wire.sendLine(`RESOLVER_RECORD\t${text}`)).trim();
  if (!reply.startsWith("OK\t")) {
    const [, , reason] = reply.split("\t");
    return refuse(`The node did not take the skin: ${reason || reply}`, "a skin mint the chain admits", "read the reason above; most often it is NoPva: earn FXN and activate your PVA first");
  }
  const id = await sha256Hex(text);
  const read = await readBack({ wire: { send: (line) => wire.sendLine(line) }, key: signer.pubHex });
  const skin = read.kind === "objects" ? read.objects.find((o) => o.id === id) : null;
  if (!skin) return refuse("The node took the skin, and its proof did not verify here yet.", "a verified OBJ_PROOF for the new skin", "reload in a moment; the skin is on your key once it verifies");
  return { kind: "minted", id, skin };
}

const refused = (failure, missing, remedy) => ({ kind: "refused", failure, missing, remedy });
const HEX64 = /^[0-9a-f]{64}$/;
const shortKey = (hex) => String(hex).slice(0, 8) + "…" + String(hex).slice(-4);

/** The skin as the chain holds it now, verified here: { proof, verdict } or a refusal. */
async function verifiedSkin(wire, id) {
  if (!HEX64.test(id || "")) return refused("This is not a skin id.", "the skin's 64-hex id, from its link", "ask its owner for the link again");
  const proof = parseObjectProofReply(await wire.sendLine(`OBJ_PROOF\t${id}`));
  if (proof.kind !== "proof") return refused(`The node holds no proof for skin ${shortKey(id)}${proof.failure ? ": " + proof.failure : ""}.`, "the skin's proof", "ask the owner to check the skin still exists, or switch to the owner's network");
  const verdict = await verifyObjectProof({ id, entries: proof.entries, pva: proof.pva });
  if (verdict.kind === "burned") return refused("This skin was burned. Nothing can move it.", "a live skin", "pick another skin");
  if (verdict.kind !== "verified") return refused(verdict.failure, verdict.missing, verdict.remedy);
  if (verdict.chain !== SKIN_CHAIN) return refused("This is a PVA, and a PVA never moves.", "a skin", "trade a skin, not the PVA");
  return { proof, verdict };
}

function headOf(signer, head) {
  return { pos: head.kind === "head" ? head.length : 0, prevCid: head.kind === "head" ? head.headCid : "0".repeat(64) };
}

async function sent(wire, text, what) {
  const reply = String(await wire.sendLine(`RESOLVER_RECORD\t${text}`)).trim();
  if (reply.startsWith("OK\t")) return null;
  const [, , reason] = reply.split("\t");
  return refused(`The node did not take the ${what}: ${reason || reply}`, `a ${what} the chain admits`, "read the reason above, then try again");
}

/** Step 1 of a trade, on the next owner's device: consent to take the skin, and for a priced sale pay into it. */
export async function acceptSkin({ who, wire, id, price = null, days = 3 }) {
  const units = price === null || price === undefined || price === "" ? null : BigInt(price);
  if (units !== null && units <= 0n) return refused("The sale price is not above zero.", "a price above zero", "ask the owner for a new sale link");
  if (units !== null && !(Number.isInteger(+days) && +days >= 1 && +days <= 30)) return refused("The sale's days are not 1 to 30.", "how many days your FXN waits for the owner", "ask the owner for a new sale link");
  const got = await verifiedSkin(wire, id);
  if (got.kind === "refused") return got;
  if (units !== null) await readDecimals(wire);
  const { verdict } = got;
  const signer = signerFor(who);
  if (verdict.owner === signer.pubHex) return refused("You already own this skin.", "a skin someone else owns", "send the link to the person who should take it");
  const { pos, prevCid } = headOf(signer, await wire.chainHead(signer.pubHex));
  const nowSec = Math.floor(Date.now() / 1000);
  const run = (s) => buildSkinHeadEdgeWithSigner({ signer: s, pos, prevCid, head: verdict.head, pointer: verdict.pointer, nowSec });
  const edge = await reviewAndSign({
    who, signer, wireUrl: wire.url, run,
    title: "Accept this skin",
    description: `This says you will take skin ${shortKey(id)} from ${shortKey(verdict.owner)}. It moves nothing: the owner moves it after this.`,
    action: "object.accept", scope: "skin.accept",
    authority: "(none: your consent to one skin at its current owner; only the owner can move it)",
    configuration: "dense-wire object grammar · KEDGE1 on " + SKIN_CHAIN,
    denies: "scope does not authorize any move of your own PVA, your skins or any FXN",
    claims: ["evidence skin " + id, "evidence owner " + verdict.owner, "evidence head " + verdict.head],
    manifest: { schema: "dense-wire.object-accept/1", taker: signer.pubHex, chain: SKIN_CHAIN, skin: id, head: verdict.head, pointer: verdict.pointer, at: nowSec },
    facts: [{ label: "Skin", value: id }, { label: "From", value: verdict.owner }],
  });
  const no = await sent(wire, edge, "consent");
  if (no) return no;
  const edgeCid = await sha256Hex(edge);
  if (units === null) return { kind: "accepted", id, edge: edgeCid, owner: verdict.owner, sale: null };
  // the sale: its own review, since this one moves FXN out of the taker's wallet now
  const at = Math.floor(Date.now() / 1000), deadline = at + Number(days) * 86_400;
  const saleRun = (s) => buildSkinSaleWithSigner({ signer: s, pos: pos + 1, prevCid: edgeCid, edge: edgeCid, skin: id, amount: units, deadline, nowSec: at });
  const sale = await reviewAndSign({
    who, signer, wireUrl: wire.url, run: saleRun,
    title: `Pay ${fxnText(units)} for this skin`,
    description: `${fxnText(units)} leave your wallet now and wait for the owner. They go to the owner only when the skin moves to you. If it has not moved in ${days} days, you take them back.`,
    action: "object.sale", scope: "skin.sale",
    authority: "(none: your FXN, held by the chain's sale rule for this one consent)",
    configuration: "dense-wire object grammar · KSALE1 on " + SKIN_CHAIN,
    denies: "scope does not authorize any other amount, any other skin, or a move of your own PVA or skins",
    claims: ["evidence skin " + id, "evidence consent " + edgeCid, "evidence amount " + units + " base units", "evidence deadline " + deadline],
    manifest: { schema: "dense-wire.skin-sale/1", buyer: signer.pubHex, chain: SKIN_CHAIN, skin: id, consent: edgeCid, amount: units.toString(), deadline, at },
    facts: [{ label: "Price", value: fxnText(units) }, { label: "Skin", value: id }, { label: "Waits until", value: new Date(deadline * 1000).toISOString() }],
  });
  const unpaid = await sent(wire, sale, "sale");
  if (unpaid) return { ...unpaid, failure: unpaid.failure + " Your consent is on the chain, and moves nothing without a sale." };
  const held = parseSaleOfReply(await wire.sendLine(`SALE_OF\t${edgeCid}`));
  if (held.kind !== "sale" || held.state !== "funded") return refused("The node took the sale, and does not show it funded.", "a funded sale", "check your FXN balance, then accept again");
  return { kind: "accepted", id, edge: edgeCid, owner: verdict.owner, sale: held.sale, price: units, deadline };
}

/** After a sale's deadline, when the owner did not move the skin: the taker takes the held FXN back. */
export async function endSale({ who, wire, edge }) {
  if (!HEX64.test(edge || "")) return refused("This is not a consent id.", "the 64-hex consent id from your sale link", "open the link the page gave you when you accepted");
  const held = parseSaleOfReply(await wire.sendLine(`SALE_OF\t${edge}`));
  if (held.kind !== "sale") return refused("No sale binds this consent.", "a sale you signed", "check the link");
  if (held.state !== "funded") return refused(`The sale is ${held.state}. Nothing waits to come back.`, "a funded sale", "nothing to do");
  const at = Math.floor(Date.now() / 1000);
  if (at <= held.deadline) return refused(`The sale runs until ${new Date(held.deadline * 1000).toISOString()}.`, "the deadline to pass", "come back after the deadline");
  await readDecimals(wire);
  const signer = signerFor(who);
  const { pos, prevCid } = headOf(signer, await wire.chainHead(signer.pubHex));
  const text = await reviewAndSign({
    who, signer, wireUrl: wire.url,
    run: (s) => buildSkinSaleEndWithSigner({ signer: s, pos, prevCid, sale: held.sale, nowSec: at }),
    title: `Take ${fxnText(held.amount)} back`,
    description: "The owner did not move the skin in time. This returns your held FXN to your wallet.",
    action: "object.sale.end", scope: "skin.sale",
    authority: "(none: the buyer's return of its own held FXN after the deadline)",
    configuration: "dense-wire object grammar · KSALEEND1 on " + SKIN_CHAIN,
    denies: "scope does not authorize any other amount, sale or move",
    claims: ["evidence sale " + held.sale, "evidence amount " + held.amount + " base units"],
    manifest: { schema: "dense-wire.skin-sale-end/1", buyer: signer.pubHex, chain: SKIN_CHAIN, sale: held.sale, at },
    facts: [{ label: "Amount", value: fxnText(held.amount) }],
  });
  const no = await sent(wire, text, "return");
  if (no) return no;
  return { kind: "returned", amount: held.amount };
}

/** The next owner's consent, fetched and checked against the skin's current head. */
async function consentFor(wire, verdict, edgeCid) {
  if (!HEX64.test(edgeCid || "")) return refused("This is not a consent id.", "the 64-hex consent id from the taker's link", "ask the taker for the link again");
  const reply = String(await wire.sendLine(`RESOLVER_RECORD_GET\t${edgeCid}`)).trim();
  if (!reply.startsWith("RESOLVER_RECORD_FOUND\t")) return refused("The node holds no such consent.", "the taker's signed consent", "ask the taker to accept again on this network");
  const text = reply.split("\t")[2] || "";
  if ((await sha256Hex(text)) !== edgeCid) return refused("The node sent a consent that is not the one asked for.", "the record whose id is the consent id", "ask another node");
  const blocks = text.split("-"), get = (l) => blocks.filter((b) => b[0] === l).map((b) => b.slice(1)), refs = get("C");
  const taker = get("G")[0] || "", last = blocks.at(-1) || "";
  const hex = Array.from(new TextEncoder().encode(OBJECT_POINTER_RELATION), (b) => b.toString(16).padStart(2, "0")).join("");
  if (get("K")[0] !== "KEDGE1" || get("N")[0] !== SKIN_CHAIN || get("R")[0] !== hex || refs.length !== 3) return refused("This consent is not a skin consent.", "a KEDGE1 on skin", "ask the taker to accept again");
  if (refs[1] !== verdict.head || refs[2] !== verdict.pointer) return refused("This consent was signed for an earlier state of the skin.", "a consent for the skin's current head", "ask the taker to accept again now");
  if (last[0] !== "S" || !(await verifyHex(taker, text.slice(0, text.length - last.length - 1), last.slice(1)))) return refused("The consent's signature does not verify.", "a consent signed by the taker", "ask the taker to accept again");
  return { kind: "consent", text, taker };
}

/** Step 2 of a trade, on the owner's device: move the skin to the next owner's consent. */
export async function giveSkin({ who, wire, id, edge }) {
  const got = await verifiedSkin(wire, id);
  if (got.kind === "refused") return got;
  const { proof, verdict } = got;
  const signer = signerFor(who);
  if (verdict.owner !== signer.pubHex) return refused(`You do not own this skin. ${shortKey(verdict.owner)} does.`, "the owner's own key", "sign in with the key that owns the skin");
  const consent = await consentFor(wire, verdict, edge);
  if (consent.kind === "refused") return consent;
  if (consent.taker === signer.pubHex) return refused("This consent is your own.", "the taker's consent", "ask the taker to accept on their own device");
  const sale = parseSaleOfReply(await wire.sendLine(`SALE_OF\t${edge}`));
  if (sale.kind === "error") return refused(`The node's sale answer does not read (${sale.reason}).`, "a SALE_OF answer", "ask another node");
  if (sale.kind === "sale" && sale.state !== "funded") return refused(`The taker's sale is ${sale.state}, so moving would not pay you.`, "a funded sale", "ask the taker to accept again with FXN in their wallet");
  if (sale.kind === "sale" && Math.floor(Date.now() / 1000) >= sale.deadline) return refused("The taker's sale has ended.", "a sale still running", "ask the taker for a new sale");
  const price = sale.kind === "sale" ? sale.amount : null;
  if (price !== null) await readDecimals(wire);
  const { pos, prevCid } = headOf(signer, await wire.chainHead(signer.pubHex));
  const nowSec = Math.floor(Date.now() / 1000);
  const run = (s) => buildSkinMoveWithSigner({ signer: s, pos, prevCid, head: verdict.head, newHead: edge, nowSec });
  const move = await reviewAndSign({
    who, signer, wireUrl: wire.url, run,
    title: price === null ? "Give this skin" : `Sell this skin for ${fxnText(price)}`,
    description: price === null
      ? `This moves skin ${shortKey(id)} from you to ${shortKey(consent.taker)}. They signed for it. You cannot take it back.`
      : `This moves skin ${shortKey(id)} to ${shortKey(consent.taker)}, and the ${fxnText(price)} they hold for it come to you in the same step.`,
    action: "object.move", scope: "skin.move",
    authority: "(none: the owner's move of one skin to the taker who consented)",
    configuration: "dense-wire object grammar · KSUPER1 on " + SKIN_CHAIN,
    denies: "scope does not authorize a move of your PVA, of any other skin, or any FXN",
    claims: ["evidence skin " + id, "evidence to " + consent.taker, "evidence consent " + edge].concat(price === null ? [] : ["evidence price " + price + " base units", "evidence sale " + sale.sale]),
    manifest: { schema: "dense-wire.object-move/1", owner: signer.pubHex, chain: SKIN_CHAIN, skin: id, head: verdict.head, to: consent.taker, consent: edge, at: nowSec },
    facts: [{ label: "Skin", value: id }, { label: "To", value: consent.taker }],
  });
  // the one verifier judges the move before it leaves this device: the proof as it will read with the move
  const after = await verifyObjectProof({ id, entries: [...proof.entries, consent.text, move], pva: proof.pva });
  if (after.kind !== "verified" || after.owner !== consent.taker) return refused(`The move would not verify (${after.failure || after.kind}). Nothing was sent.`, "a move the verifier accepts", "reload and try again");
  const no = await sent(wire, move, "move");
  if (no) return no;
  const now = await verifiedSkin(wire, id);
  if (now.kind === "refused" || now.verdict.owner !== consent.taker) return refused("The node took the move, and the skin does not read as theirs here yet.", "a proof that names the taker", "reload in a moment");
  if (price !== null) {
    const after2 = parseSaleOfReply(await wire.sendLine(`SALE_OF\t${edge}`));
    if (after2.kind !== "sale" || after2.state !== "paid") return refused("The skin moved, and the sale does not read as paid here yet.", "the sale's paid state", "reload in a moment and check your FXN balance");
  }
  return { kind: "given", id, to: consent.taker, paid: price };
}

/** Activate the signed-in identity's PVA from the first FXN payment its wallet received. */
export async function activatePva({ who, wire, publish = null }) {
  const signer = signerFor(who);
  // the public id's own key and each of its wallets: FXN in any of them earns the PVA once the chain sees its link
  const listed = await verifyWalletsOf({ publicId: signer.pubHex, reply: await wire.sendLine(`WALLETS_OF\t${signer.pubHex}`) });
  const onChain = new Set(listed.kind === "wallets" ? listed.wallets : []);
  const own = (who.publicId && Array.isArray(who.publicId.wallets) ? who.publicId.wallets : []).map((w) => w.key).filter((k) => HEX64.test(k || ""));
  const keys = [...new Set([signer.pubHex, ...onChain, ...own])];
  let earn = null, earnKey = null, ledger = false;
  for (const key of keys) {
    const rows = await wire.history(key, 500);
    if (rows === null) continue;
    ledger = true;
    const row = rows.find((r) => r.kind === "received" && HEX64.test(r.reference || ""));
    if (row && (!earn || row.at < earn.at)) { earn = row; earnKey = key; }
  }
  if (!ledger) return refused("This node has no FXN ledger to read your payments from.", "a node of the FXN chain", "switch the wallet's network to the devnet");
  if (!earn) return refused("This public id and its wallets have not received FXN yet.", "one FXN payment into the public id or one of its wallets", "receive FXN from anyone, or earn it by mining, then activate");
  let published = null;
  if (earnKey !== signer.pubHex && !onChain.has(earnKey)) {
    if (typeof publish !== "function") return refused("Your first FXN is in a private wallet, and the chain cannot count it yet.", "that wallet's link on the chain", "publish the wallet's link, then activate");
    if (!(await publish(earnKey))) return refused("The wallet's link was not published, so the chain cannot count its FXN.", "that wallet's link on the chain", "publish it, or receive FXN on a published wallet, then activate");
    published = earnKey;
  }
  await readDecimals(wire);
  const T = globalThis.DEFXN_TRAITS;
  if (!T || typeof T.mixDraw !== "function") return refused("This page cannot draw your card's look.", "js/nft/traits.js and its layer table", "reload the page, then activate again");
  for (let n = 0; n < MIX_TRIES; n++) {
    const dna = T.mixDraw(signer.pubHex, n), mix = T.mix.toPointer(dna);
    const look = T.elementsOf(dna).map((e) => e.name).join(", ");
    const { pos, prevCid } = headOf(signer, await wire.chainHead(signer.pubHex));
    const nowSec = Math.floor(Date.now() / 1000);
    const text = await reviewAndSign({
      who, signer, wireUrl: wire.url,
      run: (s) => buildPvaActivationWithSigner({ signer: s, pos, prevCid, earnRef: earn.reference, mix, nowSec }),
      title: n ? "Sign your card again with a new look" : "Activate your PVA",
      description: (n ? "Another card already has the look drawn before. This is the next look for your key. " : "") +
        `This makes your identity card. It cites the ${fxnText(earn.amount)} you received from ${shortKey(earn.counterparty)}. The card's look is fixed now. The card stays bound to your key: nobody can move or sell it.`,
      action: "object.activate", scope: "pva.activate",
      authority: "(none: your own card, earned by a payment your wallet received)",
      configuration: "dense-wire object grammar · KASSET1 on " + PVA_CHAIN,
      denies: "scope does not authorize any move of FXN, of a skin, or of the card itself",
      claims: ["evidence earn " + earn.reference, "evidence chain " + PVA_CHAIN, "evidence mix " + mix],
      manifest: { schema: "dense-wire.pva-activate/1", identity: signer.pubHex, chain: PVA_CHAIN, earn: earn.reference, mix, at: nowSec },
      facts: [{ label: "Earned by", value: `${fxnText(earn.amount)} from ${earn.counterparty}` }, { label: "Card look", value: look }],
    });
    const no = await sent(wire, text, "activation");
    if (!no) return { kind: "activated", id: await sha256Hex(text), published, mix };
    if (!no.failure.includes("MixTaken")) return no;
  }
  return refused(`The first ${MIX_TRIES} looks drawn for your key belong to other cards.`, "a card look no other PVA holds", "activate again later, or ask the DEFXN team to check the layer table");
}
const MIX_TRIES = 8;
