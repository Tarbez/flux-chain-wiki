// The two FXN scales, in this site's own test run (owner ruling 2026-11-05: type 7/11/18/29/47/76, spacing
// 2/4/7/11/18/29/47/76/123). The check itself is the DEFXN product kit's, synced into this site's kit folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const kit = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).defxn.kit;
const { checkSite } = await import(pathToFileURL(path.join(root, kit, 'check-scales.mjs')).href);

test('every size and every spacing px on this site is on its FXN scale', () => {
  assert.deepEqual(checkSite(root), [], 'run the kit fixers (flux/defxn-product-kit scripts/type-scale.mjs, space-scale.mjs)');
});
