/* The layout-key-stability driver's verdict on content placed by live data (tests/browser/
   layout-key-stability.mjs, compare()).

   Why this exists: /stats sorts its node list by live traffic, so a positional key names "the
   4th row", whichever node is 4th at load time. On 2026-10-18 two such keys differed between
   the reference load and a later history and were reported as FAIL -- a key defect -- when the
   key function had done nothing wrong: saved edits not following live-ordered content is a
   missing capability. The driver now loads every route twice with identical code; an element
   whose key or surrounding order already differs between those two loads is placed by live
   data, and a key it has elsewhere is NOT BUILT: not a failure, and not a pass. A key that
   changes for an element whose place was the same in both loads is still a FAIL. */
import assert from 'node:assert/strict';
import { compare, notBuiltSeen } from './browser/layout-key-stability.mjs';

const quiet = console.log; console.log = () => {};
try {
  const row = (n, order) => [`page tbody>tr>td|node-${n} #1`, `page:/table:1/tbody:1/tr:${n}/td:1`, order];
  const ref = { map: [row(1, 11), row(2, 12), row(3, 13)], liveIds: [] };
  /* the same rows in another history, the live sort having swapped nodes 1 and 2 */
  const got = { map: [[ref.map[0][0], 'page:/table:1/tbody:1/tr:2/td:1', 11], [ref.map[1][0], 'page:/table:1/tbody:1/tr:1/td:1', 12], ref.map[2]], dups: [], applied: [], atApply: { moved: [], rebuilt: 0 }, fresh: [] };

  /* 1. their place already differed between two direct loads: NOT BUILT, not FAIL */
  let failures = [];
  compare('/stats  from /', { ...ref, liveOrderIds: [ref.map[0][0], ref.map[1][0]] }, got, null, false, failures);
  assert.equal(failures.length, 0, 'live-ordered keys are not a key defect: ' + JSON.stringify(failures));
  assert.equal(notBuiltSeen.length, 1, 'they are reported NOT BUILT');
  assert.match(notBuiltSeen[0].notBuilt.join(' '), /placed by live data/);

  /* 2. the same change where both direct loads agreed: a key defect */
  failures = [];
  compare('/stats  from /about', { ...ref, liveOrderIds: [] }, got, null, false, failures);
  assert.equal(failures.length, 1, 'a key that moved while the content stood still is a FAIL');
  assert.match(failures[0].problems.join(' '), /2 keys differ from the direct load/);
} finally { console.log = quiet; }
console.log('PASS: content placed by live data is NOT BUILT, a moved key on still content is FAIL');
