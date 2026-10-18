/* =====================================================================
   COMPONENT CONTEXT -- a component made from a selection must look the same
   wherever it is placed.

   Why this exists: "Make into component" captured the selection's own
   classes and atoms, but not the styling it took from its ANCESTORS. The
   /download title is styled by `#scene .how-chapter-header h1` (46px, weight
   500, -.04em, text-strong) and `#scene .download-page .how-chapter-header
   h1`; inserted on /chain, neither rule matches, and the heading fell back to
   the browser's default h1. js/content/components.js (contextStyles) now
   resolves, at capture, what the context contributed and stores it with the
   definition as `x`; js/ark/atomizer.js (pin) re-mints it on any page.

   What this drives, in a real Chromium against a scratch copy of the site:
   1. capture on the PUBLIC /download page with ArkComponents.capture -- the
      exact call js/main.js's cmsMakeComponent makes -- for the title alone
      and for the whole chapter header (h1 + paragraphs); records each
      captured element's computed style in place;
   2. a control capture with context resolution off, which must show the
      defect (a test that cannot fail is not a test);
   3. writes the definitions + instances placed on /chain into the copy's
      js/content/components-data.js (the bytes a Studio Save writes), loads
      the public /chain, and compares each built element's computed
      font-size/weight/family/style, colour, letter-spacing, line-height,
      text-transform and margins with the original -- equal within 0.5px;
   4. the same at phone width (the definition was captured at 1280);
   5. renders /chain through the SSR path (api/lib/render-core.mjs) and
      checks the pinned rule and class are in the HTML a crawler reads;
   6. old data: a definition without `x` still renders, and
      ArkComponents.serialize keeps its exact bytes.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/component-context.mjs [screenshot-dir]
   ===================================================================== */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost } from './harness.mjs';

const PROPS = ['font-size', 'font-weight', 'font-family', 'font-style', 'color', 'letter-spacing', 'line-height', 'text-transform', 'margin-top', 'margin-bottom'];

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
async function settled(page, id) {
  await page.waitForFunction((pageId) => {
    const scene = document.querySelector('[data-transition]');
    const el = document.querySelector(`[data-ark-page="${pageId}"]`);
    return !!scene && scene.dataset.transition === 'idle' && scene.dataset.page === pageId && !!el && !el.hidden;
  }, id, { timeout: 30000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 250)))));
}
/* px values compare within half a pixel; everything else exactly */
function differences(source, built) {
  const out = [];
  source.forEach((want, i) => {
    const got = built[i];
    if (!got) { out.push(`element ${i} (${want.tag}) was not built`); return; }
    PROPS.forEach((prop) => {
      const a = want.style[prop], b = got.style[prop];
      const pa = /^(-?[\d.]+)px$/.exec(a), pb = /^(-?[\d.]+)px$/.exec(b);
      if (a === b || (pa && pb && Math.abs(Number(pa[1]) - Number(pb[1])) <= 0.5)) return;
      out.push(`${want.tag}#${i} ${prop}: ${a} at the source, ${b} at the destination`);
    });
  });
  return out;
}

/* in-page: capture `selector`'s elements and record their computed styles, depth first */
function captureIn(page, selectors, context) {
  return page.evaluate(({ selectors, context, props }) => {
    const elements = selectors.map((sel) => document.querySelector(sel));
    if (elements.some((el) => !el)) throw new Error('selection not found: ' + selectors.join(', '));
    const styles = [];
    const record = (el) => { const cs = getComputedStyle(el); styles.push({ tag: el.tagName.toLowerCase(), style: Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])) }); [...el.children].forEach(record); };
    elements.forEach(record);
    const captured = ArkComponents.capture(elements, context ? {} : { context: false });
    return { captured, styles };
  }, { selectors, context, props: PROPS });
}
/* in-page: the built elements of instance `key`, depth first, in the same order */
function builtStyles(page, key) {
  return page.evaluate(({ key, props }) => {
    const root = document.querySelector(`[data-ark-component-key="${key}"]`);
    if (!root) return null;
    const styles = [];
    const record = (el) => { const cs = getComputedStyle(el); styles.push({ tag: el.tagName.toLowerCase(), style: Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])) }); [...el.children].forEach(record); };
    [...root.children].forEach(record);
    return styles;
  }, { key, props: PROPS });
}

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-component-context-')));
  const dataFile = path.join(root, 'js/content/components-data.js');
  const originalData = fs.readFileSync(dataFile, 'utf8');
  const port = await freePort();
  const server = await startHost(root, port);
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    /* 1-2. capture on /download */
    await page.goto(base + '/download', { waitUntil: 'domcontentloaded' });
    await settled(page, 'download');
    const title = await captureIn(page, ['#download-title'], true);
    const header = await captureIn(page, ['.how-chapter-header'], true);
    const control = await captureIn(page, ['#download-title'], false);
    assert.ok(title.captured && header.captured && control.captured, 'all three selections capture');
    assert.ok(title.captured.tree[0].x, 'the title carries the styling its ancestors gave it (x)');
    assert.equal(control.captured.tree[0].x, undefined, 'the control capture has none');
    console.log('title x:', title.captured.tree[0].x);
    /* tokens where a token reproduces the value */
    assert.match(title.captured.tree[0].x, /color:hsl\(var\(--text-strong\)\)/, 'colour is stored as the text-strong token, not a literal rgb');
    assert.match(title.captured.tree[0].x, /font-family:var\(--font-sans\)/, 'family as the sans font token');
    assert.match(title.captured.tree[0].x, /letter-spacing:-0\.04em/, 'letter-spacing in em, so it scales with the font');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'source-download.png') });

    /* 3. definitions + instances on /chain, written the way a Save writes them */
    const data = await page.evaluate(({ title, header, control }) => {
      let d = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
      d = ArkComponents.createMaster(d, 'mtitle', ArkComponents.CAPTURED, title.props, 'Title', title.tree);
      d = ArkComponents.createMaster(d, 'mheader', ArkComponents.CAPTURED, header.props, 'Header', header.tree);
      d = ArkComponents.createMaster(d, 'mcontrol', ArkComponents.CAPTURED, control.props, 'Control', control.tree);
      d = ArkComponents.placeInstance(d, '/chain', 'spot-title', 'id:chain-title', [], 'ititle', 'mtitle');
      d = ArkComponents.placeInstance(d, '/chain', 'spot-header', 'id:chain-title', [], 'iheader', 'mheader');
      d = ArkComponents.placeInstance(d, '/chain', 'spot-control', 'id:chain-title', [], 'icontrol', 'mcontrol');
      return { text: ArkComponents.serialize(d), sanitized: d };
    }, { title: title.captured, header: header.captured, control: control.captured });
    assert.ok(data.sanitized.masters.mtitle.tree[0].x, 'x survives sanitize() into the saved definition');
    fs.writeFileSync(dataFile, data.text);

    await page.goto(base + '/chain', { waitUntil: 'domcontentloaded' });
    await settled(page, 'chain');
    const builtTitle = await builtStyles(page, 'ititle');
    const builtHeader = await builtStyles(page, 'iheader');
    const builtControl = await builtStyles(page, 'icontrol');
    assert.ok(builtTitle && builtHeader && builtControl, 'all three instances render on /chain');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'destination-chain-1280.png') });
    const controlDiff = differences(control.styles, builtControl);
    console.log(`control (no context styling): ${controlDiff.length} differences, e.g. ${controlDiff.slice(0, 3).join(' | ')}`);
    assert.ok(controlDiff.length > 0, 'without context styling the heading DOES change on /chain (the defect this guards)');
    const titleDiff = differences(title.styles, builtTitle), headerDiff = differences(header.styles, builtHeader);
    assert.deepEqual(titleDiff, [], 'the captured title looks the same on /chain');
    assert.deepEqual(headerDiff, [], 'every element of the captured header looks the same on /chain');
    console.log(`PASS: /download title and header (${header.styles.length} elements) match on /chain at 1280 (${PROPS.length} properties each).`);

    /* 4. phone width: the destination reflows; the pinned look holds */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/chain', { waitUntil: 'domcontentloaded' });
    await settled(page, 'chain');
    const phoneTitle = await builtStyles(page, 'ititle');
    const phoneOk = differences(title.styles, phoneTitle).filter((d) => !/font-size|line-height|letter-spacing/.test(d));
    assert.deepEqual(phoneOk, [], 'at phone width the title keeps its family, weight, colour and margins');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'destination-chain-390.png') });
    console.log('PASS: the pinned look holds at phone width.');

    /* 6. a definition captured before `x` existed still renders, and keeps its bytes */
    const legacy = await page.evaluate(() => {
      const old = { version: 1, masters: { m1: { resolver: 'RBLOCK_CAPTURED_V1', props: { heading: 'Old' }, label: 'Old', tree: [{ t: 'h1', c: 'captured-title', k: [{ p: 'heading' }] }] } }, routes: {} };
      const text = ArkComponents.serialize(old);
      const el = ArkComponents.buildNode(old.masters.m1.tree[0], old.masters.m1.props, document);
      return { same: text === ArkComponents.serialize(ArkComponents.sanitize(JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'))))), html: el.outerHTML, hasX: /"x"/.test(text) };
    });
    assert.equal(legacy.html, '<h1 class="captured-title">Old</h1>', 'an old definition builds exactly as before, with no pinned class');
    assert.ok(legacy.same && !legacy.hasX, 'and serializes to the same bytes, with no x field added');
    console.log('PASS: definitions without context styling render and serialize unchanged.');
    assert.deepEqual(errors, [], 'no page errors');

    /* 5. SSR */
    const { readIndexHtml, renderDocument, createLocalResources } = await import('../../api/lib/render-core.mjs');
    const html = await renderDocument({ html: await readIndexHtml(root), url: 'https://defxn.com/chain', resources: createLocalResources(root), root, timeoutMs: 30000 });
    /* the title instance's <h1>: its pinned class, and that class's rule with x verbatim */
    const titleTag = /<div[^>]*data-ark-component-key="ititle"[^>]*>\s*<h1 class="([^"]*)"/.exec(html);
    assert.ok(titleTag, 'the SSR output carries the title instance');
    const pinClass = titleTag[1].split(/\s+/).find((cls) => /^kp[0-9a-z]+$/.test(cls));
    assert.ok(pinClass, 'its <h1> carries a pinned class');
    assert.ok(html.includes('.' + pinClass + ':is(.' + pinClass + ',#ark-pin#ark-pin){' + title.captured.tree[0].x + '}'), 'and the pinned rule itself, x verbatim, is in the atoms sheet');
    console.log('PASS: SSR /chain includes the pinned context styling.');
  } finally {
    await browser.close();
    server.close();
    fs.writeFileSync(dataFile, originalData);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });
