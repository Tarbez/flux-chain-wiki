/* =====================================================================
   RESOLVE CHECK: does the public gateway agree with what was just published?
   ---------------------------------------------------------------------
   publisher.publish() proves the release is out. It says nothing about whether a
   stranger on the public internet, going through the Rust flux-gateway's
   /resolve/<name> route, would land on the same bytes. This asks that second,
   independent question. The gateway is a verified reader: it resolves the name
   with DOM_PROOF against dense-wire nodes and the shared verifier
   (flux-gateway/src/name_resolve.rs), so a 302 from it is the chain's answer,
   not a node's word. This file reads no name registry itself.

   FORK DEBT: this file mirrors SUBZERO's scripts/lib/resolve-check.mjs (this
   repo is a fork of SUBZERO -- see
   flux-claims/docs/SUBZERO_FLUX_CHAIN_WIKI_COMPARISON_v0.md). Same reasoning as
   publisher.mjs already being duplicated rather than shared between the two
   repos: there is no shared package either repo currently depends on that both
   could import this from. If one changes, check the other.
   ===================================================================== */

export class ResolveCheckFailure extends Error {
  constructor(reason, detail = {}) {
    super(reason);
    this.name = 'ResolveCheckFailure';
    this.reason = reason;
    Object.assign(this, detail);
  }
}

/* `cid` is the ipfs_cid target that was just published under `name`. Throws a ResolveCheckFailure
   for every way the public gateway can fail to confirm it (unreachable, NOT_FOUND, wrong target,
   or an unexpected response shape) -- never returns a false "ok" for any of those. */
export async function verifyPublishedResolution({ name, cid, resolverBase, fetchImpl = fetch }) {
  const url = `${resolverBase.replace(/\/+$/, '')}/resolve/${encodeURIComponent(name)}`;
  let response;
  try {
    response = await fetchImpl(url, { redirect: 'manual' });
  } catch (error) {
    throw new ResolveCheckFailure('GATEWAY_UNREACHABLE', { url, detail: error.message });
  }
  if (response.status === 404) throw new ResolveCheckFailure('GATEWAY_NOT_FOUND', { url });
  if (response.status !== 302) throw new ResolveCheckFailure('GATEWAY_ERROR', { url, status: response.status });

  const location = response.headers.get('location') || '';
  const match = /^\/ipfs\/([^/?]+)/.exec(location);
  const resolvedCid = match ? decodeURIComponent(match[1]) : null;
  if (!resolvedCid || resolvedCid !== cid) {
    throw new ResolveCheckFailure('GATEWAY_CID_MISMATCH', { url, expected: cid, got: resolvedCid || location });
  }
  return { url, cid: resolvedCid };
}
