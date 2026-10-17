/* FXN's own published token metadata (name/symbol/logo), for display next
   to the balance on the account page's Wallet tab -- directed 2026-10-16
   ("make sure to load the token metadata inside of the launchpad and the
   defxn site").

   There is no chain -> metadata index on the node (the same real gap
   flux-launchpad's own js/token-meta.mjs already documents): a published
   document is purely content-addressed, discoverable only by its CID.
   This mirrors flux-launchpad's own browser-local-registry + portable-
   link pattern exactly (`?meta=<cid>` remembered in localStorage) rather
   than inventing a second one -- this file is simpler only because defxn
   ever cares about exactly one token (FXN itself), not an arbitrary
   chain id.

   `loadTokenMeta`/`verifyDocument` are vendored verbatim from dense-wire's
   own `web/flx-token-meta.mjs` at js/dense-wire/flx-token-meta.mjs --
   re-copy from there, never edit it here. `loadImage` is NOT vendored:
   it's flux-launchpad's own small addition on top of that shared core,
   so it's rewritten here the same way, against this app's own
   `WalletWire.blobGet`. */
import { loadTokenMeta, sha256OfText } from "../dense-wire/flx-token-meta.mjs";

const STORAGE_KEY = "defxn.fxn-meta-cid.v1";
const DATA_URL = /^data:image\/(webp|png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/;

function rememberFxnMetaCid(cid) {
  try { window.localStorage.setItem(STORAGE_KEY, cid); } catch (_error) { /* convenience only */ }
}
function recallFxnMetaCid() {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch (_error) { return null; }
}

/** `?meta=<64-hex>` seeds (and remembers) which CID to trust as FXN's
 *  published metadata; absent that, whatever this browser last saw. */
function resolveFxnMetaCid() {
  try {
    const explicit = new URLSearchParams(location.search).get("meta");
    if (explicit && /^[0-9a-f]{64}$/.test(explicit)) {
      rememberFxnMetaCid(explicit);
      return explicit;
    }
  } catch (_error) { /* no location: fall through */ }
  return recallFxnMetaCid();
}

async function loadImage(wire, cid) {
  const reply = await wire.blobGet(cid);
  if (reply.kind !== "found") return null;
  if (!DATA_URL.test(reply.text) || (await sha256OfText(reply.text)) !== cid) return null;
  return reply.text;
}

/** Resolves to `{doc, image, cid} | null` -- never throws; an unknown,
 *  unreachable or unverifiable CID is treated the same as "no metadata
 *  published yet", not an error, since metadata is always optional
 *  disclosure on top of a real balance, never load-bearing for it. */
export async function loadFxnMeta(wallet) {
  const cid = resolveFxnMetaCid();
  if (!cid) return null;
  try {
    const meta = await loadTokenMeta(wallet, cid);
    if (!meta || meta.signature !== "verified") return null;
    const image = meta.doc.body.image ? await loadImage(wallet, meta.doc.body.image.cid).catch(() => null) : null;
    return { doc: meta.doc, image, cid };
  } catch (_error) {
    return null;
  }
}
