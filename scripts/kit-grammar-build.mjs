#!/usr/bin/env node
/* Builds the Kit's reader from its own labels (scripts/lib/kit-grammar.mjs): atlas audit over those labels alone, then the generated reader to js/world2/kit-reader.mjs (world2-kit.mjs and
   the kit encoder import it) and a copy under docs/design/world-grammar/ beside the labels in the atlas designer's input shape. Rerun after any change to the labels; the reader is
   never edited by hand. Same builder as the card's (scripts/card-grammar-build.mjs). */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as grammar from './lib/kit-grammar.mjs';
import { buildReader, report } from './lib/fxn-3d.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const READERS = [path.join(SITE, 'js', 'world2', 'kit-reader.mjs'), path.join(SITE, 'docs', 'design', 'world-grammar', 'kit-reader.mjs')];
const LABELS_FILE = path.join(SITE, 'docs', 'design', 'world-grammar', 'kit-grammar.labels.json');

async function main() {
  const built = await buildReader(grammar, { readers: READERS, labelsFile: LABELS_FILE });
  console.log(report(grammar, built, READERS.map(p => path.relative(SITE, p))));
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('kit-grammar-build: ' + e.message); process.exit(1); });
