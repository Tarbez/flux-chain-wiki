const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class TextElement {
  constructor(top = 40, mesh = false) { this.top = top; this.mesh = mesh; this.animations = []; this.style = {}; this.textContent = 'Below the surface.'; }
  getBoundingClientRect() { return { width: 240, height: 30, top: this.top, bottom: this.top + 30 }; }
  matches() { return false; }
  closest() { return this.mesh; }
  querySelector() { return null; }
  setAttribute() {}
  removeAttribute() {}
  getAnimations() { return this.animations.filter(a => !a.cancelled); }
  animate(frames, timing) {
    let resolve, reject;
    const animation = { frames, timing, cancelled: false,
      finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
      finish() { resolve(); },
      cancel() { this.cancelled = true; const e = new Error('cancelled'); e.name = 'AbortError'; reject(e); }
    };
    this.animations.push(animation); return animation;
  }
}
const context = vm.createContext({ ArkUI: {}, window: { matchMedia: () => ({ matches: false }) },
  document: { querySelector: () => null, createElement: () => new TextElement() },
  getComputedStyle: el => ({ opacity: '0.6', transform: 'matrix(1, 0, 0, 1, 2, 0)', clipPath: 'inset(0)' }) });
for (const file of ['js/ark/vendor/engines.js', 'js/ark/text-presence.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
(async () => {
  const title = new TextElement(), copy = new TextElement(90), offscreen = new TextElement(900), mesh = new TextElement(50, true);
  const page = { getBoundingClientRect: () => ({ top: 0, bottom: 500 }), querySelectorAll: () => [title, copy, offscreen, mesh] };
  const show = context.ArkUI.createTextPresence();
  const enter = show(page, true, false, true);
  assert.equal(title.animations[0].frames[0].opacity, '0');
  assert(title.animations[0].frames.every(frame => !('clipPath' in frame)), 'no repainting polygon masks');
  assert.equal(copy.animations[0].timing.delay, 32);
  assert.equal(offscreen.animations.length, 0);
  assert.equal(mesh.animations.length, 0);
  assert.equal(title.textContent, 'Below the surface.');
  const exit = show(page, false, false, false);
  assert(title.animations[0].cancelled);
  assert.equal(title.animations[1].frames[0].opacity, '0.6', 'interrupt from current ink opacity');
  assert.equal(title.animations[1].frames.at(-1).opacity, '0');
  const reverse = show(page, true, false, false);
  title.animations.at(-1).finish(); copy.animations.at(-1).finish();
  await Promise.all([enter, exit, reverse]);
  assert.equal(title.getAnimations().length, 0, 'settled text has no retained entrance effect');
  const pending = show(page, false, false, false);
  await show(page, true, true, false);
  await pending;
  assert.equal(title.getAnimations().length, 0, 'immediate navigation clears unfinished text effects');
  assert.equal(title.textContent, 'Below the surface.');
  const heading = new TextElement(), glyph = new TextElement();
  heading.matches = () => true; heading.dataset = { rotationPrepared: 'true' };
  heading.querySelectorAll = () => [glyph];
  const letterPage = { getBoundingClientRect: page.getBoundingClientRect, querySelectorAll: () => [heading] };
  const rotating = show(letterPage, true, false, true);
  assert(glyph.animations[0].frames[0].transform.includes('rotateX(65deg)'));
  assert(glyph.animations[0].frames[0].transform.includes('rotateZ(-28deg)'));
  assert.equal(heading.animations[0].timing.duration, 1400);
  const rotatingExit = show(letterPage, false, false, false);
  assert(glyph.animations[0].cancelled);
  assert.equal(glyph.animations[1].frames[0].transform, 'matrix(1, 0, 0, 1, 2, 0)');
  await show(letterPage, true, true, false);
  await Promise.all([rotating, rotatingExit]);
  assert.equal(glyph.getAnimations().length, 0);
  const blocks = Array.from({ length: 30 }, () => new TextElement());
  const boundedPage = { getBoundingClientRect: page.getBoundingClientRect, querySelectorAll: () => blocks };
  const bounded = show(boundedPage, true, false, true);
  assert.equal(blocks.filter(el => el.animations.length).length, 12, 'text layers are capped');
  blocks.forEach(el => el.getAnimations().forEach(a => a.finish()));
  await bounded;
  console.log('PASS: bounded transform/opacity reveal/dissolve, individual letter rotation, slower timing, stagger, viewport/mesh exclusions, reversal continuity, cancellation, immediate reset, unchanged semantic text. Actual FluxAnimate, simulated DOM.');
})().catch(error => { console.error(error); process.exitCode = 1; });
