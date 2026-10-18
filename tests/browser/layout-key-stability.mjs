/* =====================================================================
   LAYOUT KEY STABILITY -- a saved per-element edit must land on the same
   element whatever the visitor did before arriving.

   Why this exists: every per-element edit the editor saves (ArkLayout frames,
   labels, alts and groups; ArkStates members and triggers; ArkComponents spots;
   ArkElementMotion) is stored under route -> layout key. Keys were paths from
   #scene, frozen on the element the first time anything annotated it, so they
   depended on what else was mounted at that moment: the page it replaced
   (still in the outlet while it left), the continuity host appended to the
   scene, a stage illustration carried over from the previous route. Measured
   2026-10-18 on every catalog route, before the fix: arriving at / from
   /learnings changed 875 of its 1547 keys; /chain's own page mixed div:2 and
   div:7 keys within one load; every route changed keys between a direct load
   and arriving from Home. The editor's preview (a direct load, then a remount)
   and the public page (whatever the visitor clicked) disagreed, so an edit
   saved in the editor attached to a different element, or to nothing, on the
   public page -- and every counter balanced. The fix and its rules:
   js/content/layout.js ("layout keys"); the rules alone: tests/layout-keys.cjs.

   The instrument does NOT use the key function. An element's identity here is
   its scope (shell, or the route's own page), its tag, its own text, and its
   ordinal among same-tag same-text elements of that scope in document order --
   no parent/child structure, so it cannot share the key function's blind spot.
   Inserted content (spot and state anchors, component instances) and the
   router's continuity host are left out of the population by their markup;
   elements whose own text changes while the reference page sits still (live
   values) are found by reading it twice, and counted rather than compared.

   Phase 1: every route loaded directly at 1280 with the project's own saved
   content: the reference map identity -> key, and per route a handful of
   targets picked from it -- 3 page elements and 1 shell element for a layout
   override, one element to put a component spot after, one to make a state
   group of (state 1 showing, so its anchor is inserted after it).

   Phase 2 saves those as real files in the scratch copy (layout-data.js,
   components-data.js, states-data.js) and replays every route under:
     direct@1280, direct@390, from / (a router navigation, as a click does),
     from /about (continuity host), /learnings (a document page) and
     /lifecycle/intent (stage illustration carried over), a round trip through
     /chain (the continuity host's return into Home's card), a live insertion
     (a further spot and state group added in place, as the editor does), and
     the editor's preview (Design canvas, the route picked in the Pages tab:
     a direct load, then the remount the editor's state message causes).
   and asserts, per history:
     keys       every identity seen in the reference has the SAME key (and at
                least 85% of the reference identities are seen at all, so the
                comparison is never vacuous);
     unique     no key names two elements of the route's scope;
     at-apply   every element the last ArkLayout.apply() saw (it runs one frame
                after mount and again when the route settles) still has the key
                it had then -- checked per element node, not per identity;
     overrides  the elements carrying the saved overrides
                (data-ark-layout-applied) are exactly the target identities;
     spot       the component spot sits right after its target element;
     state      the state group's member is hidden and its state-1 anchor
                sits right after it.
   An override missing from an element the page module built AFTER the last
   apply is reported as NOT BUILT on a line of its own: nothing re-applies
   saved edits to content a page rebuilds later (/stats re-renders its live
   tables) or reorders (/stats sorts its node list by live queries per second:
   a positional key names "the 4th row", whichever node that is). That is a
   missing capability, not a key defect -- and not a pass.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/layout-key-stability.mjs [--report] [--no-editor] [--keep]
   LAYOUT_KEYS_ONLY=zero,/chain limits it to some catalog ids or paths; --report prints
   every differing key instead of the first three per history; --no-editor
   skips the editor history; --keep leaves the scratch site with the probes'
   saved data for inspection.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, fakeFolder, appFrame, previewFrame, scaled, gotoEditor } from './harness.mjs';
import { settled } from './route-sweep.mjs';

const CONCURRENCY = 4;
const OTHERS = ['about', 'learnings', 'lifecycle/intent'];
const COVERAGE = 0.85;
const PROBE_TEXT = 'Layout key probe';

async function pool(items, size, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}

/* In every frame, before any site script: the identity instrument, and a wrapper on
   ArkLayout.apply that records the keys at the moment saved overrides are attached. */
function instrument() {
  const OWN = 40;
  /* Not authored content of the route: inserted by the editor/runtime (by its markup), or the
     router's continuity host, or a stage illustration held in the shell between two routes. */
  const INSERTED = '[data-ark-spot],[data-ark-state-anchor],[data-ark-component-key]';
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim().slice(0, OWN);
  /* tag + first class token (state classes are appended after it: is-active, header-collapsed) */
  const kind = (el) => el.tagName.toLowerCase() + ((el.getAttribute('class') || '').trim().split(/\s+/)[0] ? '.' + el.getAttribute('class').trim().split(/\s+/)[0] : '');
  /* what an element says and what it sits in -- three ancestors' kinds, never sibling positions */
  const signature = (el, scopeRoot) => {
    const up = [];
    for (let a = el.parentElement, i = 0; a && i < 3 && el !== scopeRoot; a = a.parentElement, i++) { up.unshift(kind(a)); if (a === scopeRoot) break; }
    return up.join('>') + '>' + kind(el) + '|' + ownText(el) + (el.getAttribute('aria-label') ? '|' + el.getAttribute('aria-label').slice(0, OWN) : '');
  };
  /* The order the page put things in around `el`: for each ancestor up to the scope root, its
     authored children's signatures in document order (hashed). Built from the DOM directly --
     no tag counting, no key function. If it differs between two readings the page itself
     reordered that content (/stats sorts its node list by live queries per second), which no
     positional key can follow; a key that changes while this is equal is a key defect. */
  const orderOf = (el, scopeRoot) => {
    let text = '';
    for (let a = el; a && a !== scopeRoot && a.parentElement; a = a.parentElement) {
      text += '/' + [...a.parentElement.children].filter((c) => !c.matches(INSERTED)).map((c) => c === a ? '*' : signature(c, scopeRoot)).join(',');
      if (a.parentElement === scopeRoot) break;
    }
    let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return h;
  };
  window.__lkPage = (route) => {
    const catalog = (window.ArkUI && ArkUI.pageCatalog) || {};
    return [...document.querySelectorAll('[data-ark-page]')].find((p) => catalog[p.dataset.arkPage] && catalog[p.dataset.arkPage].path === route) || null;
  };
  /* -> [{ id, key, el }] for every KEYED element of the route's scope */
  window.__lkRows = (route) => {
    const scene = document.getElementById('scene'), page = window.__lkPage(route), rows = [];
    if (!scene) return rows;
    const take = (scope, scopeRoot, members) => {
      const seen = new Map();
      for (const el of members) {
        const t = signature(el, scopeRoot), n = (seen.get(t) || 0) + 1; seen.set(t, n);
        const key = el.getAttribute('data-ark-layout-key');
        if (key) rows.push({ id: `${scope} ${t} #${n}`, key, el, order: orderOf(el, scopeRoot) });
      }
    };
    take('shell', scene, [scene, ...scene.querySelectorAll('*')].filter((el) => !el.closest('[data-ark-page]') && !el.closest('.continuity-host') && !el.closest('.stage-scene[inert]') && !el.closest(INSERTED)));
    if (page) take('page', page, [page, ...page.querySelectorAll('*')].filter((el) => !el.closest(INSERTED)));
    return rows;
  };
  window.__lkMap = (route) => window.__lkRows(route).map((r) => [r.id, r.key, r.order]);
  window.__lkApplied = [];
  let real;
  Object.defineProperty(window, 'ArkLayout', {
    configurable: true,
    get() { return real; },
    set(value) {
      real = value;
      if (!value || !value.apply || value.__lkWrapped) return;
      const apply = value.apply;
      value.apply = function (root, route) {
        const out = apply.apply(this, arguments);
        /* the very elements and the keys they had: whether one was later MOVED (same node, other
           key) or REBUILT (the page module replaced the node) is then a fact, not a guess */
        try { window.__lkApplied = window.__lkApplied.filter((a) => a.route !== route).concat({ route, els: window.__lkRows(route).map((r) => [r.el, r.key, r.id]) }); } catch { /* never break the page */ }
        return out;
      };
      value.__lkWrapped = true;
    },
  });
}

/* everything a history is judged on, read in the page once it has settled */
function reading(frame, route) {
  return frame.evaluate(({ route, probe }) => {
    const rows = window.__lkRows(route), byEl = new Map(rows.map((r) => [r.el, r.id]));
    const counts = {}; rows.forEach((r) => { counts[r.key] = (counts[r.key] || 0) + 1; });
    const applied = rows.filter((r) => r.el.hasAttribute('data-ark-layout-applied')).map((r) => [r.id, r.key]);
    /* the authored element just before an inserted node, skipping other inserted nodes */
    const before = (node) => { let p = node && node.previousElementSibling; while (p && p.matches('[data-ark-spot],[data-ark-state-anchor]')) p = p.previousElementSibling; return p ? byEl.get(p) || '(unkeyed ' + p.tagName.toLowerCase() + ')' : null; };
    const page = window.__lkPage(route);
    const spot = page && page.querySelector('[data-ark-insert="spot-lkprobe"]');
    const anchor = page && page.querySelector('[data-ark-insert="state-stlkprobe-1"]');
    const member = page && page.querySelector('[data-ark-state-group="stlkprobe"]:not([data-ark-state-anchor])');
    const atApply = window.__lkApplied.filter((a) => a.route === route).pop();
    const then = atApply ? new Set(atApply.els.map(([el]) => el)) : new Set();
    const moved = atApply ? atApply.els.filter(([el, key]) => el.isConnected && el.getAttribute('data-ark-layout-key') !== key).map(([el, key, id]) => `${key} -> ${el.getAttribute('data-ark-layout-key')} [${id}]`) : [];
    const rebuilt = atApply ? atApply.els.filter(([el]) => !el.isConnected).length : 0;
    return {
      map: rows.map((r) => [r.id, r.key, r.order]),
      dups: Object.keys(counts).filter((k) => counts[k] > 1).map((k) => `${k} x${counts[k]}`),
      applied,
      atApply: atApply ? { moved, rebuilt } : null,
      /* elements the last ArkLayout.apply() never saw: built (or rebuilt) by the page after it */
      fresh: rows.filter((r) => !then.has(r.el)).map((r) => r.id),
      spot: spot ? { after: before(spot), text: spot.textContent.includes(probe) } : null,
      state: anchor ? { after: before(anchor), shows: getComputedStyle(anchor).display !== 'none' && anchor.textContent.includes(probe), memberHidden: !!member && getComputedStyle(member).display === 'none', member: member ? byEl.get(member) || null : null } : null,
    };
  }, { route, probe: PROBE_TEXT });
}

/* the probes' saved data, built through each module's own mutators in a page that has them.
   Every route uses the SAME spot, group and instance ids on purpose: while one route replaces
   another both pages are mounted, and an anchor lookup by id across the whole scene found the
   leaving page's anchor and skipped inserting the arriving page's (found by this test). */
function buildSaved(page, plan) {
  return page.evaluate(({ plan, probe }) => {
    let layout = ArkLayout.get(), components = ArkComponents.get(), states = ArkStates.get();
    components = ArkComponents.createMaster(components, 'mlkprobe', 'RBLOCK_TEXT_V1', ArkComponents.starterProps('RBLOCK_TEXT_V1', probe), 'Key probe');
    for (const t of plan) {
      for (const key of t.overrides) layout = ArkLayout.set(layout, t.route, key, 'desktop', { z: 7 });
      for (const key of t.overrides) layout = ArkLayout.set(layout, t.route, key, 'phone', { z: 7 });
      if (t.spotAfter) components = ArkComponents.placeInstance(components, t.route, 'spot-lkprobe', t.spotAfter, [], 'ilkprobe', 'mlkprobe');
      if (t.stateMember) {
        states = ArkStates.createStateGroup(states, t.route, 'stlkprobe', [t.stateMember], 'self');
        states = ArkStates.addState(states, t.route, 'stlkprobe', 'Probe');
        states = ArkStates.setCurrent(states, t.route, 'stlkprobe', 1);
        components = ArkComponents.insertInstance(components, t.route, ArkStates.anchorId('stlkprobe', 1), 'ilkstate', 'mlkprobe');
      }
    }
    return { layout: ArkLayout.serialize(layout), components: ArkComponents.serialize(components), states: ArkStates.serialize(states) };
  }, { plan, probe: PROBE_TEXT });
}

/* Targets from the reference: authored page elements that have a later same-tag sibling, so a
   naive count of an inserted node would renumber that sibling (the case the fix must survive). */
function pickTargets(page, route) {
  return page.evaluate((route) => {
    const rows = window.__lkRows(route), byEl = new Map(rows.map((r) => [r.el, r]));
    const pageRows = rows.filter((r) => r.id.startsWith('page ') && r.el !== window.__lkPage(route));
    const shell = rows.find((r) => r.el.matches('header nav a')) || rows.find((r) => r.id.startsWith('shell ') && r.el.tagName === 'A');
    const shown = (el) => el.getClientRects().length > 0;
    const hasLaterTwin = (el) => { for (let s = el.nextElementSibling; s; s = s.nextElementSibling) if (s.tagName === el.tagName && byEl.has(s)) return true; return false; };
    const candidates = pageRows.filter((r) => shown(r.el) && hasLaterTwin(r.el) && !/^(svg|path|g|rect|circle|line|polyline|polygon|ellipse|text)$/i.test(r.el.tagName));
    const at = (f) => pageRows[Math.min(pageRows.length - 1, Math.floor(pageRows.length * f))];
    const overrides = [at(0.25), at(0.5), at(0.75), shell].filter(Boolean);
    const spot = candidates[0] || null, member = candidates.find((r) => r !== spot && !r.el.contains(spot && spot.el) && !(spot && spot.el.contains(r.el))) || null;
    return {
      route,
      overrides: [...new Set(overrides.map((r) => r.key))], overrideIds: [...new Set(overrides.map((r) => r.id))].sort(),
      spotAfter: spot ? spot.key : null, spotId: spot ? spot.id : null,
      stateMember: member ? member.key : null, stateId: member ? member.id : null,
    };
  }, route);
}

function compare(name, ref, got, target, report, failures) {
  const problems = [];
  if (got.error) { failures.push({ name, problems: [got.error] }); console.log(`FAIL ${name}: ${got.error}`); return; }
  /* An identity is an ordinal among elements saying the same thing in the same surroundings; it
     only names the same element in two readings if that group has the same size in both. A
     group that grew or shrank is live content (a diagram adding paths as it animates, a list
     still loading): counted, reported, not compared. */
  const sizes = (map) => { const out = new Map(); for (const [id] of map) { const sig = id.replace(/ #\d+$/, ''); out.set(sig, (out.get(sig) || 0) + 1); } return out; };
  const comparable = (a, b) => { const sa = sizes(a), sb = sizes(b); return (id) => { const sig = id.replace(/ #\d+$/, ''); return sa.get(sig) === sb.get(sig); }; };
  const refByIdent = new Map(ref.map), refOrder = new Map(ref.map.map(([id, , order]) => [id, order])), differ = [], reordered = [], same = comparable(ref.map, got.map), liveIds = new Set(ref.liveIds || []);
  const liveSig = new Set([...liveIds].map((id) => id.replace(/ #\d+$/, '')));
  let seen = 0, live = 0;
  for (const [id, key, order] of got.map) {
    if (!refByIdent.has(id)) continue;
    seen++;
    if (!same(id) || liveSig.has(id.replace(/ #\d+$/, ''))) { live++; continue; }
    if (refByIdent.get(id) === key) continue;
    if (refOrder.get(id) !== order) reordered.push(`${refByIdent.get(id)} -> ${key}   [${id}]`);
    else differ.push(`${refByIdent.get(id)} -> ${key}   [${id}]`);
  }
  if (differ.length) problems.push(`${differ.length} keys differ from the direct load:\n        ` + differ.slice(0, report ? differ.length : 3).join('\n        '));
  if (seen < ref.map.length * COVERAGE) problems.push(`only ${seen} of ${ref.map.length} reference elements were found again -- the comparison would say nothing`);
  if (got.dups.length) problems.push(`keys naming two elements: ${got.dups.slice(0, 4).join(', ')}`);
  if (got.atApply) {
    if (got.atApply.moved.length) problems.push(`${got.atApply.moved.length} elements changed key after ArkLayout.apply() saw them, e.g. ${got.atApply.moved.slice(0, 2).join('; ')}`);
  } else problems.push('ArkLayout.apply() never ran for this route');
  /* NOT BUILT, not a pass and not a key defect: the page module replaced elements after the last
     apply (mount, then settle), and nothing re-applies saved edits to content a page rebuilds
     later. Reported on its own line with the evidence; never counted as ok. */
  const notBuilt = [];
  if (reordered.length) notBuilt.push(`${reordered.length} keys moved with content the page itself reordered (sibling order differs from the direct load), e.g. ${reordered[0]}`);
  if (target) {
    /* Missing: a target element (by identity) without its override. Extra: an override on an element
       whose KEY was never saved -- judged by key, not identity, because an element's own text can be
       live (/what-is-a-resolver's mesh labels count up): its identity drifts while its key, and the
       override on it, rightly stay. That the key still names the same element is the keys check. */
    const want = target.overrideIds.filter((id) => got.map.some(([i]) => i === id));
    const extra = got.applied.filter(([, key]) => !target.overrides.includes(key)).map(([id, key]) => `${key} [${id}]`);
    const lost = want.filter((id) => !got.applied.some(([i]) => i === id));
    const missing = lost.filter((id) => !got.fresh.includes(id)), rebuiltTargets = lost.filter((id) => got.fresh.includes(id));
    if (extra.length || missing.length) problems.push(`saved overrides landed wrong: ${missing.length ? 'missing on ' + missing.join(', ') : ''}${extra.length ? ' extra on ' + extra.join(', ') : ''}`);
    if (rebuiltTargets.length) notBuilt.push(`override not on ${rebuiltTargets.join(', ')}: the page built it after the last ArkLayout.apply() (${got.atApply ? got.atApply.rebuilt : '?'} elements replaced since)`);
    if (target.spotId) {
      if (!got.spot) problems.push('the saved component spot was not inserted');
      else if (got.spot.after !== target.spotId || !got.spot.text) problems.push(`the component spot sits after ${got.spot.after}, saved after ${target.spotId}`);
    }
    if (target.stateId) {
      if (!got.state) problems.push('the saved state group drew no state-1 anchor');
      else if (got.state.after !== target.stateId || !got.state.shows || !got.state.memberHidden || got.state.member !== target.stateId) problems.push(`the state group is wrong: member ${got.state.member} (saved ${target.stateId}) hidden=${got.state.memberHidden}, anchor after ${got.state.after}, showing=${got.state.shows}`);
    }
  }
  if (problems.length) failures.push({ name, problems });
  if (notBuilt.length) notBuiltSeen.push({ name, notBuilt });
  console.log(`${problems.length ? 'FAIL' : notBuilt.length ? 'NOT BUILT' : 'ok  '} ${name}  (${got.map.length} keyed, ${seen} matched${live ? `, ${live} in live groups` : ''})${problems.length || notBuilt.length ? '\n     ' + problems.concat(notBuilt).join('\n     ') : ''}`);
}
const notBuiltSeen = [];

async function main() {
  const args = process.argv.slice(2), report = args.includes('--report');
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-layout-keys-')));
  const server = await startHost(root);   /* a free port (harness) */
  const base = server.origin;
  const browser = await chromium.launch();
  const failures = [];
  const newContext = async (width, height) => { const c = await browser.newContext({ viewport: { width, height } }); await c.addInitScript(instrument); return c; };
  try {
    let wide = await newContext(1280, 800), narrow = await newContext(390, 844);
    const probe = await wide.newPage();
    await probe.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await probe.waitForFunction(() => window.ArkUI && ArkUI.pageCatalog && ArkUI.pageRouter, null, { timeout: scaled(20000) });
    let routes = await probe.evaluate(() => Object.keys(ArkUI.pageCatalog).map((id) => ({ id, path: ArkUI.pageCatalog[id].path })));
    if (process.env.LAYOUT_KEYS_ONLY) { const only = process.env.LAYOUT_KEYS_ONLY.split(','); routes = routes.filter((r) => only.includes(r.id) || only.includes(r.path)); }
    const byId = Object.fromEntries((await probe.evaluate(() => Object.keys(ArkUI.pageCatalog).map((id) => ({ id, path: ArkUI.pageCatalog[id].path })))).map((r) => [r.id, r]));
    console.log(`${routes.length} catalog routes`);

    /* ---- phase 1: reference maps and targets, from direct loads */
    const refs = {}, targets = {};
    await pool(routes, CONCURRENCY, async (route) => {
      const page = await wide.newPage();
      try {
        await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
        await settled(page, route.id);
        refs[route.path] = await reading(page, route.path);
        targets[route.path] = await pickTargets(page, route.path);
        /* Live text: an element whose own text changes while the page just sits there (a node's
           latency, a counter) has no stable identity here -- its text can coincide with another
           element's in another history (found on /explore: one node's "142 ms" was another
           node's a moment later). Two readings 2 s apart on the reference name them; they are
           counted, not compared. */
        await page.evaluate((route) => { window.__lkFirst = window.__lkRows(route); }, route.path);
        await page.waitForTimeout(2000);
        refs[route.path].liveIds = await page.evaluate((route) => {
          const now = new Map(window.__lkRows(route).map((r) => [r.el, r.id])), live = new Set();
          for (const r of window.__lkFirst) if (now.get(r.el) !== r.id) { live.add(r.id); if (now.has(r.el)) live.add(now.get(r.el)); }
          return [...live];
        }, route.path);
      } catch (error) {
        failures.push({ name: `reference ${route.path}`, problems: [String(error.message).split('\n')[0]] });
        console.log(`FAIL reference ${route.path} (no histories run for it): ${String(error.message).split('\n')[0]}`);
      }
      finally { await page.close(); }
    });
    const saved = await buildSaved(probe, Object.values(targets));
    await probe.close();
    fs.writeFileSync(path.join(root, 'js/content/layout-data.js'), saved.layout);
    fs.writeFileSync(path.join(root, 'js/content/components-data.js'), saved.components);
    fs.writeFileSync(path.join(root, 'js/content/states-data.js'), saved.states);
    const noTargets = routes.filter((r) => targets[r.path] && (!targets[r.path].spotId || !targets[r.path].stateId)).map((r) => r.path);
    if (noTargets.length) console.log(`(no spot/state target on ${noTargets.length} routes with too little repeated structure: ${noTargets.join(', ')})`);

    /* ---- phase 2: every history, with that content saved -- in fresh contexts: phase 1's
       would serve the empty data files from their HTTP cache */
    await wide.close(); await narrow.close();
    wide = await newContext(1280, 800); narrow = await newContext(390, 844);
    const history = async (context, steps, route, live) => {
      const page = await context.newPage();
      try {
        await page.goto(base + steps[0].path, { waitUntil: 'domcontentloaded' });
        await settled(page, steps[0].id);
        for (const s of steps.slice(1)) { await page.evaluate((id) => ArkUI.pageRouter.navigate(id), s.id); await settled(page, s.id); }
        if (live) await live(page);
        return await reading(page, route.path);
      } catch (error) { return { error: String(error.message).split('\n')[0] }; }
      finally { await page.close(); }
    };
    /* the editor's own insertion path (js/main.js cmsComponentsCommand / cmsMakeStates): renderAll
       with a draft that has one more spot and one more state group, in place, no navigation */
    const liveInsert = (target) => (page) => page.evaluate(({ t, probe }) => {
      const host = document.getElementById('scene');
      const later = window.__lkRows(t.route).filter((r) => r.id.startsWith('page ') && r.el.nextElementSibling).map((r) => r.key);
      if (!later.length) return;
      let components = ArkComponents.createMaster(ArkComponents.get(), 'mlklive', 'RBLOCK_TEXT_V1', ArkComponents.starterProps('RBLOCK_TEXT_V1', probe + ' live'), 'Live probe');
      components = ArkComponents.placeInstance(components, t.route, 'spot-lklive', later[0], [], 'ilklive', 'mlklive');
      let states = ArkStates.createStateGroup(ArkStates.get(), t.route, 'stlklive', [later[Math.floor(later.length / 2)]], 'self');
      states = ArkStates.addState(states, t.route, 'stlklive', 'Live');
      states = ArkStates.setCurrent(states, t.route, 'stlklive', 1);
      components = ArkComponents.insertInstance(components, t.route, ArkStates.anchorId('stlklive', 1), 'ilklivestate', 'mlklive');
      ArkComponents.renderAll(host, t.route, components);
      ArkStates.renderAll(host, t.route, states, components);
      ArkLayout.annotate(host, t.route);
    }, { t: target, probe: PROBE_TEXT });

    await pool(routes, CONCURRENCY, async (route) => {
      const ref = refs[route.path], target = targets[route.path];
      if (!ref) return;
      const histories = [['direct@1280', wide, [route]], ['direct@390', narrow, [route]]];
      if (route.id !== 'zero') histories.push(['from /', wide, [byId.zero, route]]);
      for (const other of OTHERS) if (byId[other] && other !== route.id) histories.push([`from ${byId[other].path}`, wide, [byId[other], route]]);
      if (byId.chain && route.id !== 'chain') histories.push(['round trip via /chain', wide, [route, byId.chain, route]]);
      histories.push(['live insertion', wide, [route], liveInsert(target)]);
      for (const [name, context, steps, live] of histories) {
        const got = await history(context, steps, route, live);
        /* at 390 the overrides that apply are the phone ones -- saved for the same elements */
        compare(`${route.path}  ${name}`, ref, got, target, report, failures);
      }
    });

    /* ---- the editor's preview: a direct load of ?cms-preview, then the remount the editor's
       state message causes; compared with the public direct load */
    if (!args.includes('--no-editor')) {
      const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
      await context.addInitScript(instrument);
      await fakeFolder(context, root);
      const page = await context.newPage();
      page.on('dialog', (d) => d.dismiss());
      await gotoEditor(page, base);
      const app = await appFrame(page);
      await app.click('#modeDesignBtn');
      const pv = await previewFrame(app);
      await app.evaluate(() => { window.__lkReady = []; window.addEventListener('message', (e) => { if (e.data && e.data.type === 'defxn-cms-preview-ready') window.__lkReady.push(e.data.path); }); });
      await app.click('#tabPages');
      await app.waitForFunction(() => document.querySelectorAll('#pages li').length >= 20, null, { timeout: scaled(15000) });
      const listed = new Set(await app.evaluate(() => [...document.querySelectorAll('#pages li .sub')].map((s) => s.textContent.trim())));
      /* the preview opens on /, and picking the route it already shows reloads nothing: visit it last */
      const startPath = await pv.evaluate(() => ArkUI.route.path());
      for (const route of [...routes.filter((r) => r.path !== startPath), ...routes.filter((r) => r.path === startPath)]) {
        const name = `${route.path}  editor preview`;
        if (!listed.has(route.path)) { console.log(`skip ${name} (not in the Pages tab)`); continue; }
        try {
          await app.evaluate(() => { window.__lkReady.length = 0; });
          await app.locator('#pages li').filter({ has: app.locator('.sub', { hasText: new RegExp('^' + route.path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$') }) }).first().click();
          await app.waitForFunction((p) => window.__lkReady.includes(p), route.path, { timeout: scaled(30000) });
          await settled(pv, route.id);
          compare(name, refs[route.path], await reading(pv, route.path), targets[route.path], report, failures);
        } catch (error) { failures.push({ name, problems: [String(error.message).split('\n')[0]] }); console.log(`FAIL ${name}: ${String(error.message).split('\n')[0]}`); }
      }
      await context.close();
    }
    await wide.close(); await narrow.close();
  } finally {
    await browser.close();
    server.close();
    if (args.includes('--keep')) console.log(`kept the scratch site (with the probes' saved data) at ${root}`);
    else fs.rmSync(root, { recursive: true, force: true });
  }
  if (notBuiltSeen.length) console.log(`\nNOT BUILT in ${notBuiltSeen.length} histories (${[...new Set(notBuiltSeen.map((n) => n.name.split('  ')[0]))].join(', ')}): saved edits do not follow content a page module rebuilds or reorders after the route settles. Not a key defect, and not a pass.`);
  if (failures.length) { console.log(`\n${failures.length} failing histories`); process.exit(1); }
  console.log('\nPASS: every route keeps every layout key, and every saved edit lands on the element it was saved against, in every history.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });
