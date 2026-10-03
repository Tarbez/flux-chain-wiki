/* CMS permission is independent of identity proof and publishing connectivity.
   An empty registry is never a first-claim grant. Deployed authority comes only from the signed mesh ownership record. */
import { verifyNameRecord, normalizeName } from '../../../ark-miner-cli/src/state/name-record-validators.js';
import { SessionRefusal } from './admin-session.mjs';
export function createCmsPermissions({name, publicBase = 'https://public.defxn.com', fetchImpl = fetch} = {}) {
  const normalized = normalizeName(name).name;
  const base = new URL(publicBase);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/') throw new Error('Public ownership source must be an HTTPS origin.');
  return async function authorize(key) {
    let payload;
    try {
      const response = await fetchImpl(new URL('/explorer/v1/record',base), {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceId:'names',recordId:normalized}),signal:AbortSignal.timeout(8000),redirect:'error'});
      if (response.status === 404) { payload = null; }
      else { if (!response.ok) throw new Error('Public ownership lookup returned ' + response.status);
      payload = await response.json(); }
    } catch (_) { throw new SessionRefusal('Signed in, but CMS ownership could not be verified from the public mesh.', 'a reachable public ownership source.', 'restore the public mesh ownership lookup.',503); }
    const item=payload?.data?.record;
    if (payload?.apiVersion !== 'explorer-api-v1' || payload.partial || !item || item.id !== normalized || item.sourceId !== 'names' || item.verification?.state !== 'verified') throw new SessionRefusal('Signed in, but no verified public ownership record was returned for this site.', 'a verified ownership record for this site.', 'deploy this site under its mesh name with the maintainer identity.',403);
    const record=verifyNameRecord(item.record || item.fields?.sourceRecord);
    if (!record || record.name !== normalized || record.ownerPublicKey !== key) throw new SessionRefusal('Signed in, but the public record does not verify this identity as the site owner.', 'a valid ownership signature for this identity and site.', 'sign in as the verified owner; do not use cached identity details as permission.',403);
    return {authorized:true,source:'verified-public-name',version:record.version};
  };
}
