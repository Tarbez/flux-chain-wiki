/* DefxnProfileCard (js/ark/profile-card.js): the NFT card on /account, and the switch that wears its look.
   Why each case exists:
   - Only a review sample named in the address shows a card. No lookup from an FXN ID to a card is built, so any
     other value shows nothing, and record 009 (it carries a .eth name) never reaches the site.
   - The card loads through DefxnSkinSite.art() and not a copy of its own: art() first, then the sample, then
     js/nft/card.js, then one mount. The art's own load order (three.js before art3d.js, the recipe before it) and
     the one-three.js rule (a ring-world tag already loading is waited for) are DefxnSkinSite's and are held in
     tests/skin-site.cjs; a second copy of that loader here is what that test exists to prevent.
   - The card's sheet is linked only when a card shows: scripts/page-styles.mjs leaves a sheet a script links
     itself out of every route list. Its :root palette had put it on every route, for every visitor.
   - close() leaves nothing behind: the card's unmount runs (it frees the shared WebGL renderer) and the
     defxn:skin listener goes, so a route change does not keep a detached page alive. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');

function boot(search) {
  const dom = new JSDOM('<!doctype html><head></head><body><div id="box"></div></body>', { url: 'http://127.0.0.1:4640/account' + search, runScripts: 'outside-only' });
  const w = dom.window, calls = [], skinCalls = [];
  w.ArkUI = {
    loadScript: (f) => { calls.push(f); if (f === 'js/nft/card.js') w.DefxnCard = card; return Promise.resolve(); },
    loadSheet: (f) => { calls.push(f); return Promise.resolve(); }
  };
  let active = null, unmounted = 0;
  const card = { mount: (host, rec, opts) => { const m = w.document.createElement('div'); m.className = 'nft-mount'; host.appendChild(m); calls.push('mount:' + rec.genesisId + ':' + opts.release); return { ready: Promise.resolve(m), unmount: () => { m.remove(); unmounted++; } }; } };
  w.DefxnSkinSite = {
    SAMPLES: ['27', '263', '512'],
    art: () => { calls.push('art'); return Promise.resolve(); },
    sample: (n) => { calls.push('sample:' + n); return ['27', '263', '512'].includes(String(n)) ? Promise.resolve({ genesisId: String(n).padStart(3, '0') }) : Promise.reject(new Error(n + ' is not a review sample')); },
    apply: (rec) => { skinCalls.push('apply:' + rec.genesisId); active = { record: rec }; w.document.dispatchEvent(new w.CustomEvent('defxn:skin', { detail: { on: true } })); return Promise.resolve({ ok: true }); },
    remove: () => { skinCalls.push('remove'); active = null; w.document.dispatchEvent(new w.CustomEvent('defxn:skin', { detail: { on: false } })); return true; },
    active: () => active
  };
  w.eval(fs.readFileSync(path.join(root, 'js/ark/profile-card.js'), 'utf8'));
  return { w, calls, skinCalls, unmounts: () => unmounted };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  // 1. only a review sample in the address shows a card; 009 and anything else show nothing
  for (const [search, want] of [['?skin-sample=263', '263'], ['?skin-sample=27', '27'], ['?skin-sample=009', null], ['?skin-sample=9', null], ['?skin-sample=abc', null], ['', null]]) {
    assert.equal(boot(search).w.DefxnProfileCard.fromAddress(), want, `fromAddress for "${search}" is ${want}`);
  }

  // 2. the load goes through DefxnSkinSite.art(), then the sample, then card.js, then one mount with release on
  {
    const { w, calls } = boot('?skin-sample=263');
    const pc = w.DefxnProfileCard.open(w.document.getElementById('box'), '263');
    const el = await pc.ready;
    assert.ok(el && el.className === 'nft-mount', 'ready resolves to what the card mounted');
    assert.deepEqual(calls, ['art', 'sample:263', 'js/nft/card.js', 'mount:263:true'],
      'the shared art loader, the recipe sample, card.js, then one mount that frees the renderer when the last card leaves');
  }

  // 3. the card keeps no loader of its own: no sheet, mark or three.js path is written in the file
  {
    const src = fs.readFileSync(path.join(root, 'js/ark/profile-card.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/three-r180|mark-data|nft-card\.css|art3d/.test(src), 'a second copy of the art loader in the card would drift from DefxnSkinSite.art()');
  }

  // 4. the switch follows the look, whoever changed it, and close() leaves nothing behind
  {
    const { w, skinCalls, unmounts } = boot('?skin-sample=263');
    const box = w.document.getElementById('box'), before = box.outerHTML;
    const pc = w.DefxnProfileCard.open(box, '263');
    let changes = 0; pc.onChange(() => { changes++; });
    await pc.ready;
    assert.equal(pc.wearing(), false, 'the look is off until it is put on');
    await pc.wear(true);
    assert.deepEqual(skinCalls, ['apply:263'], 'wear(true) applies this card\'s record');
    assert.equal(pc.wearing(), true);
    w.DefxnSkinSite.remove();
    assert.equal(pc.wearing(), false, 'the look taken off elsewhere reads as off');
    assert.equal(changes, 2, 'onChange runs on each change, from the switch or from elsewhere');
    pc.close();
    assert.equal(box.outerHTML, before, 'close() leaves the box exactly as it was');
    assert.equal(unmounts(), 1, 'the card\'s own unmount ran (it frees the WebGL renderer)');
    w.DefxnSkinSite.apply({ genesisId: '027' });
    assert.equal(changes, 2, 'after close() the page no longer listens');
  }

  // 5. closed while loading: no card appears and ready resolves null
  {
    const { w, calls } = boot('?skin-sample=27');
    const box = w.document.getElementById('box');
    const pc = w.DefxnProfileCard.open(box, '27');
    pc.close();
    assert.equal(await pc.ready, null, 'ready resolves null when closed first');
    assert.ok(!calls.some((c) => c.startsWith('mount:')) && !box.children.length, 'and nothing is mounted');
  }

  // 6. the card's sheet loads only with a card: no route lists it and index.html does not link it
  const styles = await import(path.join(root, 'scripts/page-styles.mjs'));
  assert.ok(styles.lazySheets().has('css/nft-card.css'), 'page-styles reads css/nft-card.css as a sheet a script links itself');
  assert.ok(!/css\/nft-card\.css/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')), 'index.html does not link the card\'s sheet: no visitor without a card pays for it');
  const derived = /BEGIN derived page styles[\s\S]*?END derived page styles/.exec(fs.readFileSync(path.join(root, 'js/pages/catalog.js'), 'utf8'))[0];
  assert.ok(!derived.includes('css/nft-card.css'), 'and no route lists it');

  console.log('profile-card: ok (address, shared loader, switch, close, lazy sheet)');
})().catch((e) => { console.error(e); process.exit(1); });
