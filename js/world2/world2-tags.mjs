/* World grammar, the labels of a view (docs/design/world-grammar/STAGE.md, "tags").

   A page asks for a view's layer with ArkWorldHost.tags(view) and fills it with [data-tag] items; the host places each item on a point
   of the world, every frame the world draws. A label that would cover the header, the footer, the page's [data-panel] or another label
   tries its other side, else it wipes out. This is the placing rule of the Three.js host's placeTags (removed with Three.js; the rule stays here).
   The points come from WSPOT records (the encoder read them from the stage files), not from stage code.
   Home's three labels (the kernel and two networks) are made here from the NAMES blob's tag lines and kept clear of the hero's words
   and the right rail, as home-descent.js clear() did. Nothing here draws or schedules a frame: place() runs inside the host's draw. */

const FLIP = { above: 'below', below: 'above', left: 'right', right: 'left' };

function placeBox(at, small, px, py, w, h) {
  const x = at === 'left' ? px - 16.5 - w : at === 'right' ? px + 16.5 : small ? px - w / 2 : px;
  const y = at === 'below' ? py + (small ? 13.5 : 15.5) : at === 'above' ? py - (small ? 13.5 : 15.5) - h : py - h / 2;
  return { x, y, r: x + w, b: y + h };
}
const hits = (a, b, m) => a.x < b.r + m && a.r > b.x - m && a.y < b.b + m && a.b > b.y - m;

/* env: { layerOf(view), here() -> the view the camera is at, panel(view) -> {x,y,w,h}|null, stageWidth() -> px|null, top(), foot(), width(),
          words() -> boxes the home labels keep clear of, side() -> left edge of the right rail } */
export function createTags(env) {
  const els = {}, ctx = {};
  function boxes(view, layer) {
    const pr = view === 'home' ? null : env.panel(view), sw = env.stageWidth();
    layer.classList.toggle('compact', sw != null && sw < 620);   /* on a small stage a label shows its title only */
    return { tY: env.top(), fY: env.foot(), W: env.width(), pb: pr ? { x: pr.x, y: pr.y, r: pr.x + pr.w, b: pr.y + pr.h } : null };
  }
  function place(view, spots) {
    const layer = env.layerOf(view); if (!layer) return;
    const live = env.here() === view;
    layer.classList.toggle('here', live);
    let e = els[view];
    if (!e || !e.list.length || !e.list[0].el.isConnected) {
      e = els[view] = { list: [], by: {} };
      layer.querySelectorAll('[data-tag]').forEach((el) => {
        el.dataset.home = el.dataset.home || el.dataset.at || 'above'; el.dataset.at = el.dataset.home;
        const t = { el, w: el.offsetWidth, h: el.offsetHeight, seen: el.classList.contains('seen') };
        e.list.push(t); e.by[el.dataset.tag] = t;
      });
    }
    const c = ctx[view] || (ctx[view] = boxes(view, layer)), placed = [];
    let order = 0;
    const free = (q) => {
      if (q.x < 8 || q.r > c.W - 8 || q.y < c.tY + 4 || q.b > c.fY - 4) return false;
      if (c.pb && hits(q, c.pb, 8)) return false;
      for (const p of placed) if (hits(q, p, 6)) return false;
      return true;
    };
    for (const p of spots) {
      const t = e.by[p.id]; if (!t) continue;
      const el = t.el, home = el.dataset.home, small = el.classList.contains('small'), on = p.on && live;
      let side = home, q = placeBox(side, small, p.x, p.y, t.w, t.h), ok = on && free(q);
      if (on && !ok) { const alt = placeBox(FLIP[home], small, p.x, p.y, t.w, t.h); if (free(alt)) { side = FLIP[home]; q = alt; ok = true; } }
      if (ok) placed.push(q);
      if (ok && el.dataset.at !== side) el.dataset.at = side;   /* a label that is out keeps its last side, so it wipes out where it was */
      if (ok !== t.seen) { el.style.transitionDelay = ok ? Math.min(400, order++ * 80) + 'ms' : '0ms'; el.classList.toggle('seen', ok); t.seen = ok; }
      if (ok || !t.seen) el.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px)';
    }
    if (!live) e.list.forEach((t) => { if (t.seen) { t.el.style.transitionDelay = '0ms'; t.el.classList.remove('seen'); t.seen = false; } });
  }
  /* a resize or a font landing changes every measurement */
  function reset() { for (const k of Object.keys(els)) delete els[k]; for (const k of Object.keys(ctx)) delete ctx[k]; sizes = {}; words = null; }

  /* ---- home's labels: the tag lines of the NAMES blob become spans in the home layer ---- */
  function fill(layer, tags) {
    if (!layer || layer.querySelector('[data-tag]')) return;
    for (const t of tags) {
      const span = document.createElement('span');
      span.className = 'tag' + (t.small ? ' small' : ''); span.dataset.tag = t.id; span.dataset.at = t.at;
      const b = document.createElement('b'); b.textContent = t.title;
      span.append(b, document.createTextNode(t.sub)); layer.appendChild(span);
    }
  }
  /* a home label shows only where it covers none of the hero's words, the action or the feature row, and stays left of the right column
     (home-descent.js measureWords and clear) */
  let words = null, sizes = {};
  function measure() {
    const home = document.querySelector('.view[data-view="home"], [data-world-home]'), side = home && home.querySelector('.rail'), out = [], z = env.scale ? env.scale() : 1;
    if (!home) return { out, sideL: innerWidth / z };
    const box = (rc, mx, my) => out.push({ left: rc.left / z - mx, right: rc.right / z + mx, top: rc.top / z - my, bottom: rc.bottom / z + my });
    ['.eyebrow', 'h1', '.lede'].forEach((q) => home.querySelectorAll(q).forEach((el) => {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange();
      let n;
      while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; rg.selectNodeContents(n); [].slice.call(rg.getClientRects()).forEach((rc) => box(rc, 8, 6)); }
    }));
    home.querySelectorAll('.cta, .paths a').forEach((el) => box(el.getBoundingClientRect(), 12, 12));
    return { out, sideL: side ? side.getBoundingClientRect().left / z : innerWidth / z };
  }
  function clear(layer, id, x, y) {
    words = words || measure();
    const el = layer && layer.querySelector('[data-tag="' + id + '"]'); if (!el) return true;
    const z = sizes[id] || (sizes[id] = { w: el.offsetWidth, h: el.offsetHeight, at: el.dataset.home || el.dataset.at || 'above', small: el.classList.contains('small') });
    const gx = z.small ? 13.5 : 16.5, gy = z.small ? 13.5 : 15.5;
    const l = z.at === 'left' ? x - gx - z.w : z.at === 'right' ? x + gx : z.small ? x - z.w / 2 : x, t = z.at === 'below' ? y + gy : z.at === 'above' ? y - gy - z.h : y - z.h / 2;
    if (l + z.w > words.sideL - 8) return false;
    for (const wd of words.out) if (l < wd.right && l + z.w > wd.left && t < wd.bottom && t + z.h > wd.top) return false;   /* no side of it fits: it stays hidden */
    return true;
  }
  return { place, reset, fill, clear };
}
