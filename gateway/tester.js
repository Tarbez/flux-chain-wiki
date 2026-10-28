/* The tester view's work, for a tester with a browser and nothing else (2026-10-29): make a tester key, and open a
   sealed app release with it. Today's other path is bundle-deploy tester-key and open-sealed, which need Node.

   The crypto is remote-env's WebCrypto opener (vendor/remote-env/open-web.mjs), the one copy Node runs as well.
   Order, so a tester who cannot open the release learns it before a 200 MB download:
     1. this browser has X25519, Ed25519, HKDF and AES-GCM in WebCrypto (else a refusal naming what is missing);
     2. the key file's text is 64 hex, and the identity id is one word;
     3. the key epoch blob at release.sealed.epochCid, from this origin's /fxn-store route, refused unless its
        BLAKE3 is that ID (content.js) and its signer is the release's signer (the name's proven owner);
     4. the epoch's own CID and signature, then this tester's grant (the content key);
     5. every block, refused unless its BLAKE3 is its signed ID (release.js), fed in order to the frame opener,
        whose every chunk must pass AES-GCM;
     6. the opened file's size and SHA-256 against sealed.plaintextSize and sealed.plaintextSha256.
   Only then is the file offered. The private key is read from the chosen file, used as a non-extractable
   CryptoKey, and never written to browser storage.

   Memory: one block (8 MiB, plus its base64 text) and one 1 MiB chunk in flight, and the opened file once, in one
   buffer of sealed.plaintextSize bytes. Saving through the File System Access API writes that buffer as it is.
   Saving through a download link copies it into a Blob, so the peak is about twice the app's size for a moment. */
import "./vendor/dense-wire/flx-state-grammar.js";
import { webCryptoSupport, newTesterKeyWeb, testerFromKeyTextWeb, openContentKeyWeb, createFrameOpener, hexOfBytes, OpenError } from "./vendor/remote-env/open-web.mjs";
import { fetchVerifiedContent } from "./content.js";
import { fetchReleaseBlock } from "./release.js";

/** An identity id the owner's tester list can hold: one word, no spaces or tabs. */
export const TESTER_ID = /^[A-Za-z0-9][A-Za-z0-9._@-]{0,63}$/;

const MIB = 1024 * 1024;

function refusal(code, failure, missing, remedy) {
  return { ok: false, code, failure, missing, remedy };
}

function refusalOf(error) {
  if (error instanceof OpenError) return refusal(error.code, error.failure, error.missing, error.remedy);
  return refusal("OPEN_FAILED", `The release could not be opened (${error?.message || error}).`, "a step that finishes.", "reload the page and try again.");
}

/* release.js and content.js answer { reason, detail }. The detail is the failure; this adds the rest. */
const CONTENT_REMEDY = {
  CONTENT_UNREACHABLE: ["a node that serves the release's blocks.", "try again in a few minutes."],
  CONTENT_MALFORMED: ["an answer in the byte store's format.", "try again in a few minutes."],
  CONTENT_MISMATCH: ["the exact bytes the owner signed.", "try again. If it repeats, tell the owner which block failed."],
  CONTENT_TOO_LARGE: ["a node that serves the whole blob.", "tell the owner."],
};

function contentRefusal(result) {
  const [missing, remedy] = CONTENT_REMEDY[result.reason] || ["the release's bytes.", "try again."];
  return refusal(result.reason, result.detail || "The release's bytes could not be read.", missing, remedy);
}

async function supported() {
  const support = await webCryptoSupport();
  if (support.ok) return null;
  return refusal("WEBCRYPTO_MISSING", `This browser's built-in crypto lacks ${support.missing.join(", ")}.`, "a browser with X25519 and Ed25519 in WebCrypto: current Chrome, Edge, Firefox or Safari.", "update this browser or open the page in another one.");
}

function badId(identityId) {
  if (TESTER_ID.test(identityId)) return null;
  return refusal("TESTER_ID", "The identity id is not one word.", "1 to 64 letters, digits, dots, dashes, underscores or @, with no spaces.", "type it again.");
}

/** -> { ok: true, keyText, line, filename } | refusal. Nothing is stored. */
export async function makeTesterKey(identityId) {
  const unsupported = await supported();
  if (unsupported) return unsupported;
  const wrongId = badId(identityId);
  if (wrongId) return wrongId;
  const { keyText, line } = await newTesterKeyWeb(identityId);
  return { ok: true, keyText, line, filename: `fxn-tester-${identityId}.key` };
}

/**
 * Opens `release` (a sealed one, read by release.js) with a tester key.
 *   onProgress(received, total, phase)   phase "key" while the grant is checked, "blocks" while blocks arrive
 * -> { ok: true, bytes, sha256 } | refusal { ok: false, code, failure, missing, remedy }
 */
export async function openTesterRelease(release, { identityId, keyText, onProgress = () => {} }) {
  const unsupported = await supported();
  if (unsupported) return unsupported;
  const wrongId = badId(identityId);
  if (wrongId) return wrongId;
  const sealed = release.sealed;
  try {
    const recipient = await testerFromKeyTextWeb(identityId, keyText);
    onProgress(0, release.size, "key");

    const epochBlob = await fetchVerifiedContent(sealed.epochCid);
    if (!epochBlob.ok) return contentRefusal(epochBlob);
    let epochRecord;
    try {
      epochRecord = globalThis.ARK_FLX_STATE.decodeState(new TextDecoder().decode(epochBlob.bytes));
    } catch (error) {
      return refusal("EPOCH_UNREADABLE", `The key epoch could not be read (${error.message}).`, "an epoch in the state grammar Bundles writes.", "tell the owner.");
    }
    if (epochRecord?.signerPublicKey !== release.ownerPublicKey) {
      return refusal("EPOCH_SIGNER", "The key epoch is signed by a different key than the release.", "an epoch signed by the owner of this name.", "tell the owner to release again.");
    }
    const contentKey = await openContentKeyWeb({ epochRecord, recipient });

    const opener = createFrameOpener(contentKey);
    let out = null;
    let written = 0;
    let received = 0;
    for (let index = 0; index < release.blocks.length; index += 1) {
      const block = await fetchReleaseBlock(release, index);
      if (!block.ok) return contentRefusal(block);
      const chunks = await opener.push(block.bytes);
      received += block.bytes.length;
      if (!out && opener.header) {
        if (opener.header.plaintextTotal !== sealed.plaintextSize) {
          return refusal("SIZE_MISMATCH", `The frame opens to ${opener.header.plaintextTotal} bytes, and the owner signed ${sealed.plaintextSize}.`, "the frame the owner signed.", "do not use this download. Tell the owner.");
        }
        try {
          out = new Uint8Array(sealed.plaintextSize);
        } catch {
          return refusal("MEMORY", `This browser could not set aside ${Math.ceil(sealed.plaintextSize / MIB)} MB for the app.`, `about ${Math.ceil((2 * sealed.plaintextSize) / MIB)} MB of free memory.`, "close other tabs and try again, or use Chrome on a computer.");
        }
      }
      for (const chunk of chunks) {
        out.set(chunk, written);
        written += chunk.length;
      }
      onProgress(received, release.size, "blocks");
    }
    opener.finish();
    if (written !== sealed.plaintextSize) {
      return refusal("SIZE_MISMATCH", `The opened file is ${written} bytes, and the owner signed ${sealed.plaintextSize}.`, "the exact app the owner signed.", "do not use this download. Tell the owner.");
    }
    const sha256 = hexOfBytes(new Uint8Array(await crypto.subtle.digest("SHA-256", out)));
    if (sha256 !== sealed.plaintextSha256) {
      return refusal("SHA_MISMATCH", `The opened file has SHA-256 ${sha256}, and the owner signed ${sealed.plaintextSha256}.`, "the exact app the owner signed.", "do not install it. Download again.");
    }
    return { ok: true, bytes: out, sha256 };
  } catch (error) {
    return refusalOf(error);
  }
}

/** Saves bytes as `filename` through a download link. */
export function saveWithLink(bytes, filename, type = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Saves the opened app. Uses the File System Access API where the browser has it (no second copy in memory),
 * else a download link. -> { ok: true } | { ok: false, cancelled: true }
 */
export async function saveOpenedFile(bytes, filename) {
  if (typeof window.showSaveFilePicker === "function") {
    let handle;
    try {
      handle = await window.showSaveFilePicker({ suggestedName: filename });
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, cancelled: true };
      saveWithLink(bytes, filename);
      return { ok: true };
    }
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return { ok: true };
  }
  saveWithLink(bytes, filename);
  return { ok: true };
}
