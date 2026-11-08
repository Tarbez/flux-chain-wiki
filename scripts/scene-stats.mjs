/* The scene's cost on one route at one size (docs/design/space/SPACE.md "Scene redesign plan", section 6 and phase 0). Layer: app tooling.
   Headless Chrome on this Mac's GPU (ANGLE Metal), device pixel ratio 1. It reads, after the world has settled:
     draws, instances      per redraw, counted by wrapping the WebGL 2 draw calls (lit pass + shadow pass + post: every draw a redraw makes)
     tris                  triangles submitted per redraw by the same wrapper: elements / 3 x instances, over EVERY pass (lit, shadow,
                           mirror twins, post quads). It answers "how many triangles does one redraw submit", not "how many are seen".
     redraw ms             min / median / max of 10 synchronous redraws (CPU submit time, the method of the plan's section 2; the GPU's own time is not read)
     first frame ms        the page clock when the first draw call landed
     idle rAF              requestAnimationFrame callbacks in 2 s after the settle (the law: 0)
   Usage: node scripts/scene-stats.mjs [route=/intro] [width=1440] [height=900] [settle ms=6000] */
import { pathToFileURL } from 'node:url';

async function main() {
  const [route = '/intro', w = '1440', h = '900', settle = '6000'] = process.argv.slice(2);
  const { playwright } = await import(new URL('../../fxn-3d/scripts/render-helper.mjs', import.meta.url).href);
  const { chromium } = await playwright();
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal'] });
  const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => {
    const S = window.__glcount = { draws: 0, tris: 0, inst: 0, raf: 0 };
    const P = WebGL2RenderingContext.prototype;
    const wrap = (n, f) => { const o = P[n]; P[n] = function (...a) { f(a); return o.apply(this, a); }; };
    wrap('drawElements', (a) => { S.draws++; S.tris += (a[1] / 3) | 0; });
    wrap('drawArrays', (a) => { S.draws++; S.tris += (a[2] / 3) | 0; });
    wrap('drawElementsInstanced', (a) => { S.draws++; S.tris += ((a[1] / 3) | 0) * a[4]; S.inst += a[4]; });
    wrap('drawArraysInstanced', (a) => { S.draws++; S.tris += ((a[2] / 3) | 0) * a[3]; S.inst += a[3]; });
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => raf((t) => { S.raf++; fn(t); });
  });
  await page.goto('http://127.0.0.1:3438' + route, { waitUntil: 'load' });
  const first = await page.evaluate(() => new Promise((res) => { const tick = () => (window.__glcount.draws > 0 ? res(performance.now()) : setTimeout(tick, 5)); tick(); }));
  await page.waitForTimeout(+settle);
  const r = await page.evaluate(async () => {
    const S = window.__glcount, W = window.__world2;
    const r0 = S.raf; await new Promise((res) => setTimeout(res, 2000)); const idle = S.raf - r0;
    const b = { draws: S.draws, tris: S.tris, inst: S.inst }, ms = [];
    for (let i = 0; i < 10; i++) { const t = performance.now(); W.redraw(); ms.push(performance.now() - t); }
    ms.sort((x, y) => x - y);
    const gl = W.gl, dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const ids = (window.ArkSpace ? ArkSpace.targets() : []).map((t) => t.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    return { gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?', draws: (S.draws - b.draws) / 10, inst: (S.inst - b.inst) / 10, tris: (S.tris - b.tris) / 10,
      redrawMs: { min: +ms[0].toFixed(2), med: +ms[5].toFixed(2), max: +ms[9].toFixed(2) }, idleRaf: idle, places: ids.length, duplicatePlaces: dup };
  });
  console.log(JSON.stringify(Object.assign({ route, size: w + 'x' + h, firstFrameMs: Math.round(first) }, r)));
  await browser.close();
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
