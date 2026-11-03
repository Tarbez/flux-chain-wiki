// Layer: kernel (the browser mirror of one kernel rule). No imports, so every page and every vendored copy can read it.
//
// Round 12 merge (CENTRALIZE): THE quorum rule in the browser, `chain_segment::quorum_for`. Three modules each wrote
// their own copy (flx-segment-judge.mjs from round 5, flx-dao-gov-builders.mjs and flx-k-read.mjs from round 12), and a
// copy that drifts lets one page accept a K the network refuses. They all import this one now.

/** The K a committee of `seats` needs: `floor(2N/3) + 1`, so K > 2N/3 (0 seats need 0). 1 -> 1, 3 -> 3, 4 -> 3, 7 -> 5. */
export function quorumFor(seats) {
  return seats <= 0 ? 0 : Math.floor((seats * 2) / 3) + 1;
}
