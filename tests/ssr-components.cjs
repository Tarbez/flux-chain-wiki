'use strict';
/* A component made from a selection ("Make into component") must be in the SSR output too --
   the bot render (api/lib/render-core.mjs) is the only HTML a crawler reads -- and the page
   markup it stands in for must NOT be: in the live DOM the replaced original is only hidden
   (removing the instance brings it back), so a bot would otherwise read the same content
   twice, once stale.
   Renders /download through the real SSR path against a scratch copy of the site whose
   components-data.js holds a captured component standing in for the page's own <h1>. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

(async () => {
  const { readIndexHtml, renderDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-ssr-components-'));
  try {
    for (const name of ['index.html', 'css', 'js', 'assets']) fs.cpSync(path.join(ROOT, name), path.join(work, name), { recursive: true });
    const data = {
      version: 1,
      masters: { m1: { resolver: 'RBLOCK_CAPTURED_V1', label: 'Hero', props: { heading: 'Run DEFXN from source' }, tree: [{ t: 'h1', c: 'captured-title', k: [{ p: 'heading' }] }] } },
      routes: { '/download': { 'spot-a': [{ key: 'i1', masterId: 'm1', overrides: {} }] } },
      spots: { '/download': { 'spot-a': { after: 'id:download-title', replaces: ['id:download-title'] } } },
    };
    fs.writeFileSync(path.join(work, 'js/content/components-data.js'), 'ArkComponents.define(' + JSON.stringify(data) + ');\n');
    const html = await renderDocument({ html: await readIndexHtml(work), url: 'https://defxn.com/download', resources: createLocalResources(work), root: work, timeoutMs: 20000 });
    assert(/<h1 class="captured-title"[^>]*>Run DEFXN from source<\/h1>/.test(html), 'the SSR output carries the captured component\'s own markup and text');
    assert(/data-ark-component-key="i1"/.test(html), 'as an instance (the same element the browser renders)');
    assert(!/id="download-title"/.test(html), 'and not the original <h1> the component stands in for');
    console.log('PASS: SSR renders a component made from a selection, without the markup it replaced.');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exit(1); });
