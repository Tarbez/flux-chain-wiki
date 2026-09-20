const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
let now = 0, tick, timers = 0;
const context = vm.createContext({ ArkUI: {}, performance: { now: () => now }, window: {
  setInterval(fn) { tick = fn; timers++; return 1; }, clearInterval() { tick = null; timers--; }
}});
vm.runInContext(fs.readFileSync('js/ark/text-scramble.js','utf8'),context);
const glyph = () => ({ textContent: 'A', attrs: {}, setAttribute(k,v) { this.attrs[k]=v; }, removeAttribute(k) { delete this.attrs[k]; } });
(async () => {
 const page = {}, other = {}, chars = Array.from({length:60},glyph), next = [glyph()];
 const entering = context.ArkUI.scrambleText(page,chars,true,false);
 assert.equal(chars.filter(g=>g.attrs['data-scramble']).length,48);
 const symbol = chars[0].attrs['data-scramble']; now=110; tick(); assert.notEqual(chars[0].attrs['data-scramble'],symbol);
 const concurrent = context.ArkUI.scrambleText(other,next,true,false); assert.equal(timers,1);
 now=700; tick(); assert(!chars[0].attrs['data-scramble']); assert(chars[47].attrs['data-scramble']);
 const exit = context.ArkUI.scrambleText(page,chars,false,false); await entering;
 now=1200; tick(); assert(chars[0].attrs['data-scramble']);
 await context.ArkUI.scrambleText(page,chars,true,true); await exit;
 assert(chars.every(g=>!g.attrs['data-scramble'] && g.textContent==='A'));
 now=2000; tick(); await concurrent; assert.equal(timers,0);
 console.log('PASS: bounded symbol cycling, progressive resolve/exit, one shared timer, interruption/reduced-motion cleanup, unchanged source text.');
})().catch(e=>{console.error(e);process.exitCode=1;});
