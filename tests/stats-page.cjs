/* Named regressions: the /stats module appended its page but returned nothing,
   so the router threw on `el.dataset` and the page stayed stranded below home;
   the home page's headline figures must never drift from the measured
   evidence they summarize (the 355/s durable headline once disagreed with a
   stale 182.70/s table row); and /monitor must stay registered, labelled as
   simulated, and stop its timer when the router removes it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function node(tag) {
  return { tagName: tag, className: '', innerHTML: '', dataset: {}, attrs: {}, children: [],
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); return c; } };
}
const context = vm.createContext({ window: {}, document: { createElement: node }, ArkUI: { pageModules: {} } });
context.window = context;
vm.runInContext(fs.readFileSync('js/content/stats-highlights.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/pages/stats.js', 'utf8'), context);

const host = node('main');
const page = context.ArkUI.pageModules.stats.mount(host);
assert(page && page.dataset, 'stats mount() returns its page element for the router');
assert.equal(host.children[0], page, 'the returned element is the one mounted');
assert(page.innerHTML.includes('class="stats-bento"'), '/stats renders as a bento grid');
assert(!/border(-top|-bottom|-left|-right)?\s*:\s*1px/.test(fs.readFileSync('css/stats.css', 'utf8')), '/stats draws no hairline borders');

// Every headline figure is backed by EVIDENCE, the data the tiles and charts draw from.
const ev = context.ArkUI.statsEvidence;
const items = context.ArkStatsHighlights.items;
const num = (s) => Number(String(s).replace(/,/g, ''));
const byLabel = (part) => items.find((i) => i.label.includes(part));
const lang = (part) => ev.languages.find((l) => l.system.includes(part));
assert.equal(Math.round(lang('accepted').rust / 10) * 10, num(byLabel('accepted').value), 'Rust accepted headline matches the evidence run');
assert.equal(Math.round(lang('durable').rust), num(byLabel('durable').value), 'Rust durable headline matches the evidence run, not a superseded one');
assert.equal(Math.round(lang('FXN').rust), num(byLabel('FXN').value), 'FXN headline matches the evidence run');
const sums = ev.audits.map((a) => a.sum);
assert.equal(byLabel('Aggregate').value, Math.floor(Math.min(...sums)).toLocaleString('en-US') + '-' + Math.floor(Math.max(...sums)).toLocaleString('en-US'), 'aggregate range spans the five audits');
ev.audits.forEach((a) => {
  const total = Object.values(a.quorums).reduce((t, v) => t + v, 0);
  assert(Math.abs(total - a.sum) < 0.02, 'audit run ' + a.run + ' quorums add up to its sum');
});
assert.equal(ev.durablePath.at(-1).value, lang('durable').rust, 'the durable story ends at the current number');

const home = fs.readFileSync('js/pages/home.js', 'utf8');
assert(home.includes('window.ArkStatsHighlights') && !home.includes("ArkCopy.text('HOME.STATUS'"), 'home reads the shared measurements, not separate copy');

// /monitor: registered like every route, honest about being simulated, disposes its timer.
const catalog = fs.readFileSync('js/pages/catalog.js', 'utf8');
assert(/monitor:\s*\{\s*path:\s*'\/monitor'[^}]*module:\s*'monitor'[^}]*scripts:\s*\['js\/pages\/monitor\.js'\]/.test(catalog), '/monitor is in the page catalog');
assert(fs.readFileSync('index.html', 'utf8').includes('css/monitor.css'), 'monitor styles are linked');
const monitor = fs.readFileSync('js/pages/monitor.js', 'utf8');
assert(monitor.includes("'Simulated feed'"), '/monitor labels its data as simulated');
assert(/arkDispose\s*=\s*function\s*\(\)\s*\{\s*clearInterval\(timer\)/.test(monitor), '/monitor stops its timer on unmount');

console.log('PASS: /stats mounts as a bento grid with headline figures that match its evidence; /monitor is registered, labelled simulated, and disposes cleanly.');
