/* Where the encoder finds the stage sources it reads as data (docs/design/world-grammar/PORT.md, "Three.js removed").
   Why: the site no longer runs Three.js, but world-encode.mjs and the scripts/lib/world-*-scene.mjs files still derive every view's numbers
   (rows, timings, ring paths, words) from the text of the old stage files. Those files are evidence of what each view is, so they moved
   unchanged out of the served site (js/world/) to scripts/lib/stage-src/, where no visitor receives them. This is the one place that names that folder.
   Build side, Node built-ins only. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STAGE_SRC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'stage-src');
/* the absolute path of one stage source, e.g. stageSrc('chains-scene.js') */
export const stageSrc = (name) => path.join(STAGE_SRC_DIR, name);
/* the path as an error message should print it, so a reader can open it */
export const stageSrcLabel = (name) => 'scripts/lib/stage-src/' + name;
