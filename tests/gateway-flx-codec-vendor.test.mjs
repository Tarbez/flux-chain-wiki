/* The gateway shell's flx-codec files are copies of the one canonical codec (flx/flx-codec/src), never forks.
   Why this exists: blake3.js decides whether a site's bytes match the address its name points at
   (gateway/content.js), and codec.js decodes what the shell renders. A hand-edited or stale copy would check
   or decode differently from the code Bundles packs with. Until 2026-10-23 nothing compared them, and
   codec.js and dictionary.js had drifted by one commit unnoticed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'gateway', 'vendor', 'flx-codec');
const FILES = ['index.js', 'codec.js', 'binary.js', 'dictionary.js', 'blake3.js'];

test('the vendored flx-codec files are byte-identical to flx/flx-codec/src', () => {
  const source = process.env.FLX_CODEC_SRC || path.resolve(ROOT, '..', '..', 'flx', 'flx-codec', 'src');
  assert.ok(fs.existsSync(path.join(source, 'codec.js')), `no flx-codec source at ${source}. Missing: flx/flx-codec beside flux/, or FLX_CODEC_SRC. To fix: check it out, or set FLX_CODEC_SRC.`);
  for (const file of FILES) {
    assert.ok(fs.readFileSync(path.join(VENDOR, file)).equals(fs.readFileSync(path.join(source, file))), `${file} has drifted from ${path.join(source, file)}. To fix: copy the source file over the vendored one (never edit the copy).`);
  }
});
