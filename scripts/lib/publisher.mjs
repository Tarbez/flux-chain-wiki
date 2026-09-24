/* =====================================================================
   THE PUBLISHER: a site -> the mesh, and back
   ---------------------------------------------------------------------
   Three steps, and the second one is not this file's:

     prepare   encode the site as one .flx archive, add it to the miner (that
               yields the CID), and draft the name record that would point the
               name at it. Nothing is signed and nothing is named yet.
     (sign)    the OWNER signs the drafted record's signing message. That
               happens in the admin page, with a key that never leaves the
               browser. This file never receives, derives or stores a private
               key: it is a mouth, not an owner.
     publish   check the signed record, confirm the bytes it names really are
               retrievable and really are a site, hand the record to the
               miner's `names/*` registry, and read it back.

   The record's signing message and its verification are the MINER's own
   (ark-miner-cli/src/state/name-record-validators.js), imported, not copied:
   that wire format is byte-for-byte shared with ark-browser, so a second
   implementation here would be a second place to drift. Like
   ark-miner-desktop importing the daemon by sibling path, this makes
   flux-chain/ and ark-miner-cli/ neighbours in one workspace.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildNameRecordSigningMessage, canonicalizeNameRecord, normalizeName, verifyNameRecord }
  from '../../../ark-miner-cli/src/state/name-record-validators.js';
import { decodeSite, encodeSite, siteProblems } from './site-bundle.mjs';

export const DEFAULT_NAME = 'flux-chain.ark';

/* A refusal names the failure, what is missing, and what would fix it. */
export class PublishRefusal extends Error {
  constructor(failure, missing, remedy, status = 400) {
    super(`${failure} Missing: ${missing} To fix: ${remedy}`);
    this.name = 'PublishRefusal';
    this.failure = failure; this.missing = missing; this.remedy = remedy; this.status = status;
  }
}

/* The credential stored in exactly one miner storage folder, or null. Never looks anywhere else. */
function credentialIn(folder) {
  const file = path.join(folder, 'pin-api-credential.txt');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() || null : null;
}

/* The miner keeps its API credential under its storage path. A folder that is NAMED (--storage) is the only place looked:
   falling back to another miner's credential would publish through the wrong miner with the wrong key and say nothing.
   Only when no folder is named are the usual places tried. */
export function readMinerKey({ key, storagePath, env = process.env, home = os.homedir() } = {}) {
  if (key) return key.trim();
  if (env.FLUX_CHAIN_MINER_KEY) return env.FLUX_CHAIN_MINER_KEY.trim();
  const roots = storagePath ? [storagePath] : [env.STORAGE_PATH, path.join(home, '.flux-miner'), path.join(home, '.ark-miner')].filter(Boolean);
  for (const root of roots) {
    const found = credentialIn(root);
    if (found) return found;
  }
  throw new PublishRefusal(
    'No miner credential was found.',
    'the miner API key (FLUX_CHAIN_MINER_KEY, --key, or pin-api-credential.txt in the folder named by --storage).',
    'pass --storage <the miner STORAGE_PATH>, or set FLUX_CHAIN_MINER_KEY to one of the miner\'s AUTH_KEYS.', 401);
}

/* The miners this tool knows how to find on a machine, in the order it prefers them. Ports and folders are the
   products' own defaults (ark-miner-desktop/src/main/main.js, ark-miner-cli/config/defaults.js); the pin API's
   port is the IPFS port + 1000. A miner on other ports is reached with --status/--pin. */
export function knownMiners(home) {
  const support = path.join(home, 'Library', 'Application Support');
  return [
    { label: 'Ark Miner Desktop', statusPort: 8866, pinPort: 5102, storage: [path.join(support, 'flux-miner-desktop', 'ark-miner-runtime'), path.join(support, 'ark-miner-app', 'ark-miner-runtime')] },
    { label: 'ark-miner-cli', statusPort: 8766, pinPort: 5002, storage: [path.join(home, '.flux-miner'), path.join(home, '.ark-miner')] },
  ];
}

/* Find a running miner on this machine and the credential to use it. Nothing answering is a refusal that says what to start. */
export async function discoverMiner({ env = process.env, home = os.homedir(), fetchImpl = fetch, candidates = knownMiners(home), timeoutMs = 1500 } = {}) {
  const heard = [];
  for (const candidate of candidates) {
    const statusBase = `http://127.0.0.1:${candidate.statusPort}`;
    let info;
    try {
      const response = await fetchImpl(`${statusBase}/status`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) continue;
      info = await response.json();
    } catch { continue; }
    // This candidate's own folders only, so a Desktop miner is never used with the CLI's key, or the reverse.
    let key = env.FLUX_CHAIN_MINER_KEY ? env.FLUX_CHAIN_MINER_KEY.trim() : null;
    for (const folder of key ? [] : candidate.storage) { key = credentialIn(folder); if (key) break; }
    if (!key) { heard.push(`${candidate.label} answered on ${candidate.statusPort}, but its credential (pin-api-credential.txt) is not in ${candidate.storage.join(' or ')}`); continue; }
    return { label: candidate.label, networkId: info.network_id || null, statusBase, pinBase: `http://127.0.0.1:${candidate.pinPort}`, key };
  }
  throw new PublishRefusal(
    heard.length ? `A miner is running but cannot be used: ${heard.join('; ')}.` : 'No miner is running on this machine that this page can publish through.',
    heard.length ? 'the miner\'s API credential.' : 'a running Ark Miner (the Desktop app, or ark-miner-cli).',
    heard.length ? 'pass --storage <that miner\'s STORAGE_PATH> or set FLUX_CHAIN_MINER_KEY, then press Refresh.' : 'open Ark Miner Desktop, or run npm start in ark-miner-cli, then press Refresh in the Mesh panel.', 502);
}

/* One place that turns command-line options into a publisher, so the host and the pull script cannot drift.
   With no --status/--pin/--key/--storage it finds the miner itself, and again whenever it is missing. */
export function publisherFromArgs(args, root, { env = process.env } = {}) {
  const text = (v) => (typeof v === 'string' ? v : undefined);
  const explicit = text(args.status) || text(args.pin) || text(args.key) || text(args.storage);
  const name = text(args.name) || DEFAULT_NAME;
  if (explicit) {
    return createPublisher({ name, root, statusBase: text(args.status) || 'http://127.0.0.1:8766', pinBase: text(args.pin) || 'http://127.0.0.1:5002', key: readMinerKey({ key: text(args.key), storagePath: text(args.storage), env }) });
  }
  let cached = null;
  const miner = async () => {
    if (cached && Date.now() - cached.at < 30000) return cached.miner;
    const found = await discoverMiner({ env });
    cached = { at: Date.now(), miner: found };
    return found;
  };
  return createPublisher({ name, root, miner });
}

/* `miner` is {statusBase, pinBase, key, label?, networkId?} or an async function returning one, called for every request
   so a miner started after this tool is picked up and one that stopped is reported, not assumed. The older
   statusBase/pinBase/key options describe a fixed miner. */
export function createPublisher({ name = DEFAULT_NAME, statusBase = 'http://127.0.0.1:8766', pinBase = 'http://127.0.0.1:5002', key, miner, root, now = () => new Date() } = {}) {
  const normalized = normalizeName(name).name;
  const resolveMiner = typeof miner === 'function' ? miner : async () => miner || { statusBase, pinBase, key };

  async function call(kind, pathAndQuery, init = {}) {
    const target = await resolveMiner();
    const url = (kind === 'pin' ? target.pinBase : target.statusBase) + pathAndQuery;
    let response;
    try { response = await fetch(url, { ...init, headers: { authorization: `Bearer ${target.key}`, 'x-api-key': target.key, ...(init.headers || {}) } }); }
    catch (error) {
      throw new PublishRefusal(`The miner did not answer at ${url}.`, 'a running miner on those ports.',
        'start Ark Miner (Desktop, or npm start in ark-miner-cli), or pass --status and --pin with the ports it printed.', 502);
    }
    return response;
  }

  /* the latest record the miner can verify for the name, or null */
  async function currentRecord() {
    const response = await call('status', `/debug/name-record?name=${encodeURIComponent(normalized)}`);
    if (!response.ok) throw new PublishRefusal(`The miner refused the name lookup (${response.status}).`, 'a readable name registry.', 'check the miner is the version with names/* and the key is one of its AUTH_KEYS.', 502);
    const body = await response.json();
    return body.record || null;
  }

  async function cat(cid) {
    const response = await call('pin', `/api/v0/cat?arg=${encodeURIComponent(cid)}`);
    if (response.status === 404) throw new PublishRefusal(`${cid} is not on this miner.`, 'the archive bytes for that address.', 'publish again, or pull from a miner that holds it.', 404);
    if (!response.ok) throw new PublishRefusal(`The miner's pin API refused the read (${response.status}).`, 'read access to the pin API.', 'check the API key.', 502);
    return new Uint8Array(await response.arrayBuffer());
  }

  async function add(bytes) {
    const response = await call('pin', '/api/v0/add?reference=flux-chain-site', { method: 'POST', body: bytes, headers: { 'content-type': 'application/octet-stream' } });
    if (!response.ok) throw new PublishRefusal(`The miner's pin API refused the upload (${response.status}).`, 'write access to the pin API.', 'check the API key and the per-file size cap.', 502);
    return (await response.json()).cid;
  }

  const targetCid = (record) => record?.targets?.find((t) => t.type === 'ipfs_cid')?.value || null;

  async function status() {
    let current = null; let reachable = true; let detail = null; let via = null;
    try {
      const target = await resolveMiner();
      via = { label: target.label || null, networkId: target.networkId || null, statusBase: target.statusBase };
      current = await currentRecord();
    } catch (error) { reachable = false; detail = error.message; }
    return {
      name: normalized, reachable, detail, miner: via,
      current: current && { version: current.version, cid: targetCid(current), ownerPublicKey: current.ownerPublicKey, updatedAt: current.updatedAt },
    };
  }

  /* May this identity open the admin for this name? Asked only after its signature is proven. No record yet means the first
     identity to sign in may claim the name; a record means only its owner. If the miner cannot be asked, the answer is no:
     guessing "yes" would let anyone in whenever the miner is down. */
  async function authorize(publicKeyB64) {
    let current;
    try { current = await currentRecord(); }
    catch (error) {
      if (error instanceof PublishRefusal) throw new PublishRefusal(`Cannot check who owns ${normalized}: ${error.failure}`, 'a reachable miner to ask.', error.remedy, 503);
      throw error;
    }
    if (current && current.ownerPublicKey !== publicKeyB64) {
      throw new PublishRefusal(`${normalized} is owned by another identity (${current.ownerPublicKey}), so this one cannot open its admin.`, 'the owner\'s identity.', 'sign in with the recovery file of the identity that owns the name.', 403);
    }
    return { firstClaim: !current };
  }

  async function prepare(site, ownerPublicKey) {
    if (typeof ownerPublicKey !== 'string' || Buffer.from(ownerPublicKey, 'base64').length !== 32) {
      throw new PublishRefusal('The owner public key is not an Ed25519 key.', 'a 32-byte base64 public key from the signed-in identity.', 'open the Mesh panel in admin.html and sign in with your recovery file (.auth.flx).');
    }
    const bad = siteProblems(site, root);
    if (bad.length) throw new PublishRefusal(`The site is not publishable: ${bad.join('; ')}.`, 'valid manifests and articles.', 'fix what is listed in the admin page, then publish again.');

    const current = await currentRecord();
    if (current && current.ownerPublicKey !== ownerPublicKey) {
      throw new PublishRefusal(`${normalized} is owned by another key (${current.ownerPublicKey}).`, 'a signature from that owner.',
        'sign in with the identity that owns the name, or choose a different name. A name changes hands only by a transfer both keys sign.', 403);
    }
    const bytes = encodeSite(site, root);
    const cid = await add(bytes);
    const unchanged = current && targetCid(current) === cid;
    // What this version would take away from the one people can read now. A stale admin page must not delete content silently.
    let removes = { manifests: [], articles: [], assets: [], secrets: [] };
    if (current && !unchanged) {
      try {
        const published = decodeSite(await cat(targetCid(current)));
        removes = {
          manifests: published.manifests.map((m) => m.id).filter((id) => !site.manifests.some((m) => m.id === id)),
          articles: published.articles.map((a) => a.slug).filter((slug) => !site.articles.some((a) => a.slug === slug)),
          assets: published.assets.map((a) => a.id).filter((id) => !site.assets.some((a) => a.id === id)),
          secrets: (published.secrets || []).map((s) => s.id).filter((id) => !(site.secrets || []).some((s) => s.id === id)),
        };
      } catch { removes = null; }
    }
    const previous = current ? Date.parse(current.updatedAt) : 0;
    const updatedAt = new Date(Math.max(now().getTime(), previous + 1)).toISOString();
    const record = { name: normalized, ownerPublicKey, version: current ? current.version + 1 : 1, updatedAt, targets: [{ type: 'ipfs_cid', value: cid }] };
    // Derived by the miner's own builder, from the same fields the miner will verify.
    const signingMessage = buildNameRecordSigningMessage({ ...record, proof: { alg: 'Ed25519', sig: 'x' } });
    return { cid, byteLength: bytes.length, unchanged: !!unchanged, removes, currentVersion: current ? current.version : 0, record, signingMessage };
  }

  async function publish(signed) {
    let canonical;
    try { canonical = canonicalizeNameRecord(signed); }
    catch (error) { throw new PublishRefusal(`The record is malformed: ${error.message}`, 'a record shaped as prepare drafted it, plus proof.', 'sign the record prepare returned without changing it.'); }
    if (canonical.name !== normalized) throw new PublishRefusal(`The record is for ${canonical.name}, not ${normalized}.`, `a record for ${normalized}.`, 'publish from the admin page for this name.');
    if (!verifyNameRecord(canonical)) throw new PublishRefusal('The signature does not verify against the record\'s owner key.', 'a valid Ed25519 signature over the signing message.', 'sign again with the owner key, over exactly the message prepare returned.', 403);
    const cid = targetCid(canonical);
    if (!cid) throw new PublishRefusal('The record names no archive.', 'an ipfs_cid target.', 'run prepare again.');
    // The name must never point at bytes that are missing or are not a site.
    let archived;
    try { archived = decodeSite(await cat(cid)); }
    catch (error) {
      if (error instanceof PublishRefusal) throw error;
      throw new PublishRefusal(`${cid} is retrievable but is not a flux-chain site (${error.message}).`, 'a flux-chain-site/1 archive.', 'run prepare again with the site.');
    }
    const response = await call('status', '/debug/name-record/publish', { method: 'POST', body: JSON.stringify({ record: canonical }), headers: { 'content-type': 'application/json' } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new PublishRefusal(`The miner refused the record: ${body.error || response.status}.`, 'a record the names/* registry accepts.',
      /advance exactly/.test(body.error || '') ? 'someone published since you prepared; prepare again to get the next version.' : 'read the reason above; version and updatedAt must advance, and the owner must match.', 409);
    const readBack = await currentRecord();
    return {
      published: canonical.version, cid,
      readBack: readBack ? { version: readBack.version, cid: targetCid(readBack) } : null,
      confirmed: !!readBack && readBack.version === canonical.version && targetCid(readBack) === cid,
      manifests: archived.manifests.length, articles: archived.articles.length, assets: archived.assets.length, secrets: (archived.secrets || []).length,
    };
  }

  /* the site the name currently points at, with the record that says so */
  async function fetchSite() {
    const current = await currentRecord();
    if (!current) throw new PublishRefusal(`${normalized} has no published record on this miner.`, 'a published version of the site.', 'publish from the admin page first, or point --status at a miner that has replicated it.', 404);
    const cid = targetCid(current);
    if (!cid) throw new PublishRefusal(`${normalized} does not point at an archive.`, 'an ipfs_cid target.', 'publish a new version.', 409);
    return { record: current, cid, site: decodeSite(await cat(cid)) };
  }

  return { name: normalized, status, authorize, prepare, publish, fetchSite };
}
