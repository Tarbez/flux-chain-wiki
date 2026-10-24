/* =====================================================================
   THE PUBLISHER: a site -> the mesh, and back
   ---------------------------------------------------------------------
   Three steps, and the second one is not this file's:

     prepare   encode the site as one .flx archive, add it to the miner (that
               yields the CID), and draft the public marker for it. Nothing is
               signed yet.
     (sign)    the OWNER signs the drafted marker's signing message. That
               happens in the admin page, with a key that never leaves the
               browser. This file never receives, derives or stores a private
               key: it is a mouth, not an owner.
     publish   check the signed marker, confirm the bytes it names really are
               retrievable and really are a site, and mark them public. That
               is a RELEASE: an address anyone can read.

   It does not point the name at the release. The dense-wire name chain
   (KDOMCLAIM/KDOMREC) is the only system that owns names (owner decision,
   2026-10-19). This file used to hand a signed record to the miner's
   `names/*` registry (POST /debug/name-record/publish) -- a second name
   authority, and a direct miner name write bundle-deploy itself forbids --
   and that path is gone: a publish that carries a name record is refused
   with NameBindingRefusal below, whose remedy is to bind the release CID
   at domains.defxn.com, which signs the dense-wire record update.

   The name's CURRENT record is still read (status, authorize, fetchSite,
   and the "what would this version remove" diff) from the miner's
   /debug/name-record. Those are readers, retired in a later batch.

   The public-marker protocol (a separate, owner-signed, revocable record
   that lets the published archive be read without a credential at a
   miner's /explorer/v1/content/<cid>) comes from @flux/bundle-deploy, a
   small sibling package built specifically so this admin does not need to
   depend on ark-miner-cli's heavy tree (GUN, libp2p, an IPFS-style daemon)
   just to draft and verify a signed record. Like ark-miner-desktop
   importing the daemon by sibling path, this makes flux-chain/ (defxn) and
   bundle-deploy/ neighbours in one workspace.
   ===================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { normalizeName } from '../../../bundle-deploy/src/name-record.js';
import { buildMarkerFields, publicMarkerSigningMessage, submitSignedMarker, markerSignatureVerifies }
  from '../../../bundle-deploy/src/public-marker.js';
import { decodeSite, encodeSite, siteProblems } from './site-bundle.mjs';

export const DEFAULT_NAME = 'defxn.fxn';
const MARKER_CONTENT_TYPE = 'application/octet-stream';
export const NAME_AUTHORITY_URL = 'https://domains.defxn.com';

/* A refusal names the failure, what is missing, and what would fix it. */
export class PublishRefusal extends Error {
  constructor(failure, missing, remedy, status = 400) {
    super(`${failure} Missing: ${missing} To fix: ${remedy}`);
    this.name = 'PublishRefusal';
    this.failure = failure; this.missing = missing; this.remedy = remedy; this.status = status;
  }
}

/* The one sentence this repo says when asked to point a name at a release. Written once here; the
   host, the admin page and every test read it from here (prepare/publish return its parts as
   `nameBinding`, so the page can say it before anything is signed). Same wording as
   bundle-deploy/src/name-binding-refusal.js, which cannot be imported yet without making this repo
   depend on an unmerged bundle-deploy branch. */
export function nameBindingParts(name) {
  const subject = typeof name === 'string' && name.trim() ? name.trim() : 'a name';
  return {
    failure: `This publisher cannot point ${subject} at a release: names are owned only by the dense-wire name chain, and this publisher is not a name authority.`,
    missing: `an owner-signed dense-wire record update that binds the release CID to ${subject}.`,
    remedy: `publish the release without a name, then bind its CID to ${subject} at ${NAME_AUTHORITY_URL}, which signs the dense-wire record update.`,
  };
}

export class NameBindingRefusal extends PublishRefusal {
  constructor(name) {
    const { failure, missing, remedy } = nameBindingParts(name);
    super(failure, missing, remedy, 409);
    this.name = 'NameBindingRefusal';
    this.code = 'NAME_BINDING_IS_DENSE_WIRE';
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
  const explicit = text(args.status) || text(args.pin) || text(args.key) || text(args.storage) || text(args.controlSocket);
  const name = text(args.name) || DEFAULT_NAME;
  if (explicit) {
    return createPublisher({
      name, root, statusBase: text(args.status) || 'http://127.0.0.1:8766', pinBase: text(args.pin) || 'http://127.0.0.1:5002',
      controlSocketPath: text(args.controlSocket), key: readMinerKey({ key: text(args.key), storagePath: text(args.storage), env }),
    });
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

/* A fleet miner sweeps every /debug/* route (name-record reads and publishes
   included) onto a private Unix control socket -- F-14 control-plane
   separation, ark-miner-cli's own doc comment on ARK_MINER_CONTROL_SOCKET --
   and refuses them over its public TCP status port. That is only reachable
   from the same machine, which is exactly where this admin host runs once
   it is deployed alongside the miner it publishes through (not from a
   stranger's browser, nor from this tool run remotely against a fleet node
   it isn't co-located with). Returns a fetch-Response-shaped object so every
   existing caller of call('status', ...) -- which only ever touches
   .ok/.status/.json() -- needs no change at all. */
function socketRequest(socketPath, pathAndQuery, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath, path: pathAndQuery, method, headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          json: async () => JSON.parse(buffer.toString('utf8') || '{}'),
          text: async () => buffer.toString('utf8'),
        });
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

/* `miner` is {statusBase, pinBase, key, controlSocketPath?, label?, networkId?} or an async function returning one,
   called for every request so a miner started after this tool is picked up and one that stopped is reported, not
   assumed. The older statusBase/pinBase/key options describe a fixed miner. `controlSocketPath`, when set, routes
   only the 'status' (name-record) calls through it -- the pin API ('pin' calls) is a separate HTTP server that
   stays on its own public port regardless. */
export function createPublisher({ name = DEFAULT_NAME, statusBase = 'http://127.0.0.1:8766', pinBase = 'http://127.0.0.1:5002', key, controlSocketPath, miner, root, now = () => new Date() } = {}) {
  const normalized = normalizeName(name).name;
  const resolveMiner = typeof miner === 'function' ? miner : async () => miner || { statusBase, pinBase, key, controlSocketPath };

  async function call(kind, pathAndQuery, init = {}) {
    const target = await resolveMiner();
    const headers = { authorization: `Bearer ${target.key}`, 'x-api-key': target.key, ...(init.headers || {}) };
    if (kind === 'status' && target.controlSocketPath) {
      try { return await socketRequest(target.controlSocketPath, pathAndQuery, { ...init, headers }); }
      catch (error) {
        throw new PublishRefusal(`The miner's control socket did not answer at ${target.controlSocketPath}.`, 'a running miner with that control socket.',
          'check ARK_MINER_CONTROL_SOCKET on that miner and the socket file\'s permissions.', 502);
      }
    }
    const url = (kind === 'pin' ? target.pinBase : target.statusBase) + pathAndQuery;
    let response;
    try { response = await fetch(url, { ...init, headers }); }
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

  /* bundle-deploy's submitSignedMarker expects `{ok, status?, code?, reason?}` and never throws itself -- it decides
     what STALE means. This is the same POST /api/v0/public-marker shape bundle-deploy's own pin-client.js uses. */
  async function markPublic(record) {
    const response = await call('pin', '/api/v0/public-marker', { method: 'POST', body: JSON.stringify(record), headers: { 'content-type': 'application/json' } });
    if (response.ok) return { ok: true };
    const body = await response.json().catch(() => ({}));
    return { ok: false, status: response.status, code: body.code, reason: body.error };
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

  /* Drafts a RELEASE of `site`: the archive goes on the miner, and the owner-signed public marker for its CID is
     drafted. No name record is drafted: pointing the name at the release is a dense-wire record update made from
     domains.defxn.com, and `nameBinding` says so before anything is signed. The name's current record is read only to
     compare against (unchanged / removes); if it cannot be read, the comparison is unavailable (removes: null, which
     the page treats as worth asking about) and the release still publishes, because a release needs no name. */
  async function prepare(site, ownerPublicKey) {
    if (typeof ownerPublicKey !== 'string' || Buffer.from(ownerPublicKey, 'base64').length !== 32) {
      throw new PublishRefusal('The owner public key is not an Ed25519 key.', 'a 32-byte base64 public key from the signed-in identity.', 'open the Mesh panel in admin.html and sign in with your recovery file (.auth.flx).');
    }
    const bad = siteProblems(site, root);
    if (bad.length) throw new PublishRefusal(`The site is not publishable: ${bad.join('; ')}.`, 'valid manifests and articles.', 'fix what is listed in the admin page, then publish again.');

    let current = null; let compared = true;
    try { current = await currentRecord(); } catch { compared = false; }
    const bytes = encodeSite(site, root);
    const cid = await add(bytes);
    const unchanged = current && targetCid(current) === cid;
    // What this version would take away from the one people can read now. A stale admin page must not delete content silently.
    let removes = compared ? { manifests: [], articles: [], assets: [], secrets: [] } : null;
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
    // The public marker: an owner-signed record so the published archive is readable by strangers without a
    // fleet credential, via GET /explorer/v1/content/<cid>. A site archive is binary, never an executable type.
    const marker = buildMarkerFields({ cid, contentType: MARKER_CONTENT_TYPE, ownerPublicKey, now: now().getTime() });
    const markerSigningMessage = Buffer.from(publicMarkerSigningMessage(marker)).toString('utf8');
    return { cid, byteLength: bytes.length, unchanged: !!unchanged, removes, currentVersion: current ? current.version : 0, marker, markerSigningMessage, nameBinding: { name: normalized, ...nameBindingParts(normalized) } };
  }

  /* Publishes the RELEASE `marker` (prepare's marker plus the owner's `signature`). A `record` is the retired
     name-publish shape and is refused, never ignored: dropping it silently would let the page say the name moved. */
  async function publish({ marker: signedMarker, record } = {}) {
    if (record !== undefined && record !== null) throw new NameBindingRefusal(normalized);

    if (!signedMarker || typeof signedMarker.signature !== 'string') {
      throw new PublishRefusal('No signed public marker was supplied.', 'a marker object with the owner\'s signature over markerSigningMessage.', 'sign prepare\'s markerSigningMessage and attach it as marker.signature, then publish again.');
    }
    const { signature: markerSignature, ...markerFields } = signedMarker;
    /* awaited: Ed25519 verification is async (bundle-deploy's public-marker.js); the retired sync verifier threw on every call */
    if (!(await markerSignatureVerifies(markerFields, markerSignature))) {
      throw new PublishRefusal('The public marker signature does not verify against its owner key.', 'a valid Ed25519 signature over the marker signing message.', 'sign again with the owner key, over exactly prepare\'s markerSigningMessage.', 403);
    }
    const cid = markerFields.cid;

    // Only a site is ever marked public through this admin: never bytes that are missing or are not a site.
    let archived;
    try { archived = decodeSite(await cat(cid)); }
    catch (error) {
      if (error instanceof PublishRefusal) throw error;
      throw new PublishRefusal(`${cid} is retrievable but is not a flux-chain site (${error.message}).`, 'a flux-chain-site/1 archive.', 'run prepare again with the site.');
    }
    // A STALE (409) means this owner already marked this exact CID as of an equal-or-newer time, which for an
    // unchanged, content-addressed object is success, not failure.
    const markerResult = await submitSignedMarker(markerFields, markerSignature, { markPublic });
    return {
      released: true, cid,
      manifests: archived.manifests.length, articles: archived.articles.length, assets: archived.assets.length, secrets: (archived.secrets || []).length,
      marker: markerResult.record,
      nameBinding: { name: normalized, bound: false, ...nameBindingParts(normalized) },
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
