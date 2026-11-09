/* Audit capture: /intro -> portal -> ring menu -> hover each of 12 -> click one -> film first frame. Writes PNGs to OUT. */
const path = require('path');
const { chromium } = require(path.join('/Volumes/PortableSSD/flux/defxn/node_modules/playwright'));
const OUT = '/Volumes/PortableSSD/flux/defxn/docs/design/space/intro-audit';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const log = [];
  page.on('console', (m) => { if (m.type() === 'error') log.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:3438/intro', { waitUntil: 'load' });
  await page.screenshot({ path: OUT + '/00-load.png' });
  await page.waitForSelector('.intro-world.portal-drawn', { timeout: 40000 });
  await sleep(1500);
  await page.screenshot({ path: OUT + '/01-portal-build.png' });
  await sleep(3500);
  await page.screenshot({ path: OUT + '/02-portal-loop.png' });
  /* the ring button's place */
  const ringBox = await page.evaluate(() => { const r = document.querySelector('.intro-portal-ring'); if (!r) return null; const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, hidden: r.hidden }; });
  log.push('ring button: ' + JSON.stringify(ringBox));
  await page.click('.intro-portal-ring', { force: true });
  await sleep(700);
  await page.screenshot({ path: OUT + '/03-ringview-leaving.png' });
  await page.waitForSelector('.intro-world.menu-on', { timeout: 30000 });
  await sleep(800);
  await page.screenshot({ path: OUT + '/04-ring-menu-hold.png' });
  /* geometry of the menu arcs, the tag, and the nav */
  const geo = await page.evaluate(() => {
    const out = {};
    const nav = document.querySelector('header, nav, .site-nav, [data-nav]'); if (nav) { const b = nav.getBoundingClientRect(); out.nav = { x: b.x, y: b.y, w: b.width, h: b.height, tag: nav.tagName, cls: nav.className }; }
    out.arcs = [...document.querySelectorAll('.intro-ring-menu a')].map((a) => { const b = a.getBoundingClientRect(); return { label: a.getAttribute('aria-label'), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; });
    const t = document.querySelector('.intro-ring-tag'); if (t) { const cs = getComputedStyle(t); out.tag = { font: cs.fontFamily, size: cs.fontSize, color: cs.color, transform: cs.transform }; }
    const w = document.querySelector('.intro-portal-words'); if (w) { const b = w.getBoundingClientRect(); const cs = getComputedStyle(w); out.words = { x: b.x, y: b.y, w: b.width, h: b.height, opacity: cs.opacity, display: cs.display, visibility: cs.visibility }; }
    const f = document.querySelector('.intro-portal-stage'); if (f) { const b = f.getBoundingClientRect(); out.frame = { x: b.x, y: b.y, w: b.width, h: b.height, src: f.src }; }
    out.bodyBg = getComputedStyle(document.body).backgroundColor;
    out.cls = document.querySelector('.intro-world').className;
    const soon = document.querySelector('.intro-ring-soon'); if (soon) out.soon = { text: soon.textContent, vis: getComputedStyle(soon).opacity };
    return out;
  });
  log.push('geo: ' + JSON.stringify(geo, null, 1));
  const arcs = await page.$$('.intro-ring-menu a');
  log.push('arcs: ' + arcs.length);
  for (let i = 0; i < arcs.length; i++) {
    const label = await arcs[i].getAttribute('aria-label');
    await arcs[i].hover({ force: true });
    await sleep(900);
    const tagText = await page.evaluate(() => { const t = document.querySelector('.intro-ring-tag'); const b = t.getBoundingClientRect(); return { text: t.textContent, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), on: document.querySelector('.intro-world').classList.contains('tag-on') }; });
    log.push('hover ' + i + ' ' + label + ' tag=' + JSON.stringify(tagText));
    await page.screenshot({ path: OUT + '/10-hover-' + String(i).padStart(2, '0') + '-' + label.replace(/\W+/g, '-').toLowerCase() + '.png' });
    await page.mouse.move(20, 450);
    await sleep(700);
  }
  await page.screenshot({ path: OUT + '/11-after-hovers-rest.png' });
  /* click Records (index 1) */
  const pick = 1;
  await arcs[pick].hover({ force: true }); await sleep(800);
  await arcs[pick].click({ force: true });
  await sleep(500);
  await page.screenshot({ path: OUT + '/20-click-records-0.5s.png' });
  await sleep(400);
  await page.screenshot({ path: OUT + '/21-click-records-0.9s.png' });
  try {
    await page.waitForSelector('.intro-world.in-underground', { timeout: 30000 });
    await page.screenshot({ path: OUT + '/22-film-first-frame.png' });
    await sleep(1500);
    await page.screenshot({ path: OUT + '/23-film-1.5s.png' });
    await sleep(2500);
    await page.screenshot({ path: OUT + '/24-film-4s.png' });
    const cine = await page.evaluate(() => { const c = document.querySelector('.intro-cine-shot'); if (!c) return null; const b = c.getBoundingClientRect(); return { text: c.textContent, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) }; });
    log.push('cine: ' + JSON.stringify(cine));
  } catch (e) { log.push('film did not arrive: ' + e.message); await page.screenshot({ path: OUT + '/22-film-missing.png' }); }
  require('fs').writeFileSync(OUT + '/capture-log.txt', log.join('\n') + '\n');
  console.log(log.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
