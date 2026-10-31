// The PVA and skin record builders (objects.rs, owner decisions 2026-10-25). Self-contained, so a site vendors this one
// file; flx-builders.mjs re-exports it. Every builder mirrors the Rust builder byte for byte
// (`flx_cap_object::build_mint`, `build_move`, `build_burn`, `flx_cap_edge::build_edge`); `test/object-proof.test.mjs`
// rebuilds the Rust vectors (`fixtures/object-vectors.tsv`) here and compares. A node takes each record as
// `RESOLVER_RECORD<TAB><text>`. Signer shape: `{ pubHex, signText(asciiText) -> Promise of hex signature }`.
//
//   PVA      KASSET1 on `pva`, signed by the identity, C[1] = the reference of an FXN payment it received
//            (NATIVE_HISTORY's `received` row), C[2] = the card's mix (optional: 32 bytes the chain does not read,
//            fixed at activation; one mix per chain, a second is refused MixTaken). One per identity. It never moves:
//            a node refuses any KEDGE1 or KSUPER1 on `pva` as PvaIsBound.
//   skin     KASSET1 on `skin`, signed by a key that holds a PVA. C[1] is the skin's pointer: 32 bytes the chain does
//            not read. The defxn site packs the skin's own record into it (js/nft/card-record.js, DFXNSKIN1).
//   trade    the next owner signs a KEDGE1 for the skin's current head (send it first), then the owner signs a
//            KSUPER1 from that head to the edge.
// Exports only; no top-level work.

export const OBJECT_KIND_ASSET = "KASSET1";
export const OBJECT_KIND_EDGE = "KEDGE1";
export const OBJECT_KIND_SUPER = "KSUPER1";
export const PVA_CHAIN = "pva";
export const SKIN_CHAIN = "skin";
export const OBJECT_POINTER_RELATION = "references";
export const OBJECT_BURN = "0".repeat(64);
const HEX64 = /^[0-9a-f]{64}$/;

const hexOfUtf8 = (text) => Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");

function requireCid(value, what, remedy) {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new Error(`That ${what} is not addressable. Missing: 64 lowercase hex chars (got ${JSON.stringify(value)}). To fix: ${remedy}`);
  }
}

function objectHead(pubHex, chain, nowSec) {
  if (!Number.isInteger(nowSec) || nowSec < 0 || nowSec > 99_999_999_999) {
    throw new Error("That clock is not unix seconds. Missing: nowSec as a whole number of seconds. To fix: pass Math.floor(Date.now() / 1000).");
  }
  return `G${pubHex}-YLEDGERENTRY-V1-M${nowSec}-H${hexOfUtf8(pubHex)}-N${chain}`;
}

function requirePosition(pos, prevCid) {
  if (!Number.isInteger(pos) || pos < 0) throw new Error("That position is not the signer's chain length. Missing: pos as a whole number. To fix: read it with HEAD <your key>.");
  requireCid(prevCid, "previous record CID", "read it with HEAD <your key>; a key's first record uses 64 zeros.");
}

/** A `KASSET1` mint on `chain` (`pva` or `skin`) pointing at `pointer`, with `detail` as C[2] on `pva` only (the
 *  card's mix). Its object id is the CID of the text. */
export async function buildObjectMintWithSigner({ signer, chain, pos, prevCid, pointer, detail = null, nowSec }) {
  if (chain !== PVA_CHAIN && chain !== SKIN_CHAIN) throw new Error(`That chain ${JSON.stringify(chain)} carries no objects. Missing: "${PVA_CHAIN}" or "${SKIN_CHAIN}". To fix: use buildPvaActivationWithSigner or buildSkinMintWithSigner.`);
  requirePosition(pos, prevCid);
  requireCid(pointer, "pointer", "give 64 lowercase hex: the earn reference for a PVA, the packed skin record for a skin.");
  if (detail !== null && chain !== PVA_CHAIN) throw new Error(`A ${chain} mint carries no C[2]. Missing: nothing; only a PVA carries a mix. To fix: leave detail out.`);
  if (detail !== null) requireCid(detail, "card mix", "give 64 lowercase hex: the mix the site packed for this card.");
  const body = `${objectHead(signer.pubHex, chain, nowSec)}-K${OBJECT_KIND_ASSET}-J${pos}-C${prevCid}-C${pointer}${detail === null ? "" : `-C${detail}`}`;
  return `${body}-S${await signer.signText(body)}`;
}

/** Activate the identity's PVA: a `KASSET1` on `pva` citing `earnRef`, the reference of an FXN payment it received,
 *  and carrying `mix` (64 hex, optional) as C[2]: the card's look, fixed now. A node refuses a mix another PVA holds
 *  (MixTaken). */
export async function buildPvaActivationWithSigner({ signer, pos, prevCid, earnRef, mix = null, nowSec }) {
  return buildObjectMintWithSigner({ signer, chain: PVA_CHAIN, pos, prevCid, pointer: earnRef, detail: mix, nowSec });
}

/** Mint a skin: a `KASSET1` on `skin` whose pointer is the skin (32 bytes, the site's packed DFXNSKIN1). The minter must hold a PVA. */
export async function buildSkinMintWithSigner({ signer, pos, prevCid, skinPointer, nowSec }) {
  return buildObjectMintWithSigner({ signer, chain: SKIN_CHAIN, pos, prevCid, pointer: skinPointer, nowSec });
}

/** The next owner's consent: a `KEDGE1` on `skin` from the skin's current head to its pointer. Send it before the move. */
export async function buildSkinHeadEdgeWithSigner({ signer, pos, prevCid, head, pointer, nowSec }) {
  requirePosition(pos, prevCid);
  requireCid(head, "skin head", "read the skin's current head with OBJ_PROOF <id>.");
  requireCid(pointer, "skin pointer", "keep the skin's pointer, as OBJ_PROOF shows it.");
  const body = `${objectHead(signer.pubHex, SKIN_CHAIN, nowSec)}-K${OBJECT_KIND_EDGE}-R${hexOfUtf8(OBJECT_POINTER_RELATION)}-J${pos}-C${prevCid}-C${head}-C${pointer}`;
  return `${body}-S${await signer.signText(body)}`;
}

function superBody(pubHex, step, pos, prevCid, head, third, nowSec) {
  return `${objectHead(pubHex, SKIN_CHAIN, nowSec)}-K${OBJECT_KIND_SUPER}-O${hexOfUtf8(step)}-J${pos}-C${prevCid}-C${head}-C${third}`;
}

/** The owner's move of a skin from its current head to the next owner's head edge (`newHead` = that edge's CID). */
export async function buildSkinMoveWithSigner({ signer, pos, prevCid, head, newHead, nowSec }) {
  requirePosition(pos, prevCid);
  requireCid(head, "skin head", "read the skin's current head with OBJ_PROOF <id>.");
  requireCid(newHead, "new head", "pass the CID of the next owner's KEDGE1 (sha256 of its text).");
  const body = superBody(signer.pubHex, "supersede", pos, prevCid, head, newHead, nowSec);
  return `${body}-S${await signer.signText(body)}`;
}

/** The owner's burn of a skin. Terminal: nothing moves a burned skin. */
export async function buildSkinBurnWithSigner({ signer, pos, prevCid, head, nowSec }) {
  requirePosition(pos, prevCid);
  requireCid(head, "skin head", "read the skin's current head with OBJ_PROOF <id>.");
  const body = superBody(signer.pubHex, "retract", pos, prevCid, head, OBJECT_BURN, nowSec);
  return `${body}-S${await signer.signText(body)}`;
}

// --- a priced skin sale (skin_sales.rs): the buyer's FXN is held for one consent and paid with the owner's move ---

export const SALE_KIND = "KSALE1";
export const SALE_END_KIND = "KSALEEND1";
export const MAX_SALE_SECS = 30 * 86_400;

/** The buyer's sale: pay `amount` FXN for `skin` through its consent `edge` (a KEDGE1 CID, sent first), until
 *  `deadline` (unix seconds, within 30 days). The node holds the FXN at once; the owner's move pays it out. */
export async function buildSkinSaleWithSigner({ signer, pos, prevCid, edge, skin, amount, deadline, nowSec }) {
  requirePosition(pos, prevCid);
  requireCid(edge, "consent", "pass the CID of your KEDGE1 for the skin (sha256 of its text).");
  requireCid(skin, "skin id", "pass the skin's id, from OBJS_OF or its link.");
  const units = BigInt(amount);
  if (units <= 0n) throw new Error("That price is not above zero. Missing: a whole number of FXN, 1 or more. To fix: set a price.");
  if (!Number.isInteger(deadline) || deadline <= nowSec || deadline - nowSec > MAX_SALE_SECS) {
    throw new Error("That deadline is not within the next 30 days. Missing: a deadline after now, at most 30 days away. To fix: pick an earlier deadline.");
  }
  const body = `${objectHead(signer.pubHex, SKIN_CHAIN, nowSec)}-K${SALE_KIND}-T${units}NATIVE-D${deadline}-J${pos}-C${prevCid}-C${edge}-C${skin}`;
  return `${body}-S${await signer.signText(body)}`;
}

/** The buyer takes a sale's held FXN back, after its deadline, when the owner did not move the skin. */
export async function buildSkinSaleEndWithSigner({ signer, pos, prevCid, sale, nowSec }) {
  requirePosition(pos, prevCid);
  requireCid(sale, "sale", "pass the sale's CID, from SALE_OF.");
  const body = `${objectHead(signer.pubHex, SKIN_CHAIN, nowSec)}-K${SALE_END_KIND}-J${pos}-C${prevCid}-C${sale}`;
  return `${body}-S${await signer.signText(body)}`;
}

/** Read a `SALE_OF` reply -> { kind: "sale", sale, amount (BigInt), deadline, state, text } | { kind: "none" } |
 *  { kind: "error", reason }. state is unfunded, funded, paid or returned, from the ledger's own outcome. */
export function parseSaleOfReply(reply) {
  const line = String(reply).trim();
  if (line.startsWith("SALE_NONE\t")) return { kind: "none" };
  const [tag, sale, amount, deadline, state, text] = line.split("\t");
  if (tag !== "SALE" || !HEX64.test(sale || "") || !/^\d+$/.test(amount || "") || !["unfunded", "funded", "paid", "returned"].includes(state)) {
    return { kind: "error", reason: `the reply is not a SALE line: ${JSON.stringify(line.slice(0, 80))}` };
  }
  return { kind: "sale", sale, amount: BigInt(amount), deadline: Number(deadline), state, text: text || "" };
}

// --- a public id's name, made from its key (chain::key_name; owner decision 2026-10-25) ---
//
// `<label>.fxn`: one digit 2-7, then 13 base32 characters (a-z, 2-7), all from sha256("FXN-KEY-NAME-V1\0" + key hex).
// Nobody claims it: isClaimableDomainName (flx-builders.mjs) refuses every .fxn label of this shape. A node answers
// it with the key's PVA (`NAME_PVA <name>`), and verifyNamedPva (flx-object-proof.mjs) computes it again from the
// proof's owner. Rust and JS are pinned by fixtures/object-vectors.tsv (`keyname` rows).

const KEY_NAME_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/** Is `label` of the key-name shape: 14 characters, a digit 2-7 first, then base32 lower case. */
export function isKeyNameLabel(label) {
  return typeof label === "string" && /^[2-7][a-z2-7]{13}$/.test(label);
}

/** The name a public id gets from its own key (64 lowercase hex). */
export async function keyName(keyHex) {
  requireCid(keyHex, "public id key", "pass the public id's Ed25519 key as 64 lowercase hex.");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`FXN-KEY-NAME-V1\0${keyHex}`)));
  let label = String.fromCharCode(50 + (digest[0] % 6));
  let acc = 0, bits = 0;
  for (const byte of digest.subarray(1)) {
    acc = ((acc << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5 && label.length < 14) {
      bits -= 5;
      label += KEY_NAME_ALPHABET[(acc >> bits) & 31];
    }
    if (label.length === 14) break;
  }
  return `${label}.fxn`;
}

// --- a public id's fresh wallet (wallet_links.rs; owner decisions 2026-10-25) ---
//
// A public id cannot attach a wallet that exists: it generates a fresh one. The record is the new wallet's first
// record (J0, previous 64 zeros), signed by the wallet and countersigned by the public id over walletLinkMessage. A
// node refuses a wallet key with any history (NotFresh), a second public id for one wallet (WalletTaken), and a PVA
// of a wallet's own (WalletIsNotAPublicId). FXN that reaches a wallet earns its public id's PVA.

export const WALLET_KIND = "KWALLET1";

/** The bytes the public id signs to own a fresh wallet. */
export const walletLinkMessage = (publicIdHex, walletHex) => `FXN-WALLET-V1\n${publicIdHex}\n${walletHex}`;

/** The fresh wallet's first record. `wallet` and `publicId` are `{ pubHex, signText }` signers. */
export async function buildFreshWalletWithSigners({ wallet, publicId, nowSec }) {
  requireCid(wallet.pubHex, "wallet key", "generate a new wallet key.");
  requireCid(publicId.pubHex, "public id key", "pass the public id's own key, never the root's.");
  if (wallet.pubHex === publicId.pubHex) throw new Error("A wallet is not its own public id. Missing: a new key for the wallet. To fix: generate one.");
  const idSig = await publicId.signText(walletLinkMessage(publicId.pubHex, wallet.pubHex));
  const body = `${objectHead(wallet.pubHex, PVA_CHAIN, nowSec)}-K${WALLET_KIND}-J0-C${"0".repeat(64)}-C${publicId.pubHex}-C${idSig}`;
  return `${body}-S${await wallet.signText(body)}`;
}
