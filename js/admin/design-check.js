/* =====================================================================
   ADMIN EDITOR · DESIGN CHECK (js/admin/design-check.js)
   ---------------------------------------------------------------------
   Owns: the Design check -- the layout, colour, typography, search and AI rules as
   measurable checks on the rendered canvas page (checkMeasurable, previewSettled,
   measureChecks, runChecks), and the header popover that lists them.
   Must not: score a rule it could not measure (notBuilt / unmeasured never count), or
   measure before the preview settled.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, cmsPreview = A.cmsPreview, $ = A.$, refreshPop = A.refreshPop,
      realLinkIndex = A.realLinkIndex, renderStatus = A.renderStatus, closePop = A.closePop,
      openPageSeo = A.openPageSeo, openSiteSeo = A.openSiteSeo, openPop = A.openPop, esc = A.esc, h = A.h,
      ic = A.ic, postCmsSelectKey = A.postCmsSelectKey;

  function cmsSeoValue(value) {
    value = value || {};
    return { t: value.title || '', d: value.description || '', img: value.ogImage || '', can: value.canonical || '' };
  }
  function cmsPageSeo(site, route) {
    const seo = site.seo || { pages: {}, articles: {} };
    if (route.seoArticle) return cmsSeoValue((seo.articles || {})[route.seoArticle]);
    return cmsSeoValue((seo.pages || {})[route.seoId]);
  }

  /* =========================================================================
     Design check: the layout, color, typography and conversion rules as
     measurable checks on the rendered page, each with a fix where one is safe
     ========================================================================= */
  /* Step 1 port: these used to measure the dense-array `.frame`'s own rendered DOM via
     getComputedStyle, which is invisible once connected (.cms-connected .frame{display:
     none}) -- every rendered() check saw zero elements and reported false failures. They
     now read the real rendered page inside cmsPreview (same-origin iframe, so its document
     is directly readable) plus realLinkIndex()/cmsRoutes/cmsPageSeo.
     The original 14 rules (numbered in the comments below): 1-2 hierarchy, 3 ghost buttons,
     4 buttons stand out, 5 text contrast, 6 60-30-10 balance, 7 plain body font, 8 scanning,
     9 lead with the point, 10-11 links/reachability, 12 search, 13 AI, 14 audience. The
     port first kept only the 8 structural ones (1-2, 8-13): 3-7 measured colours against the
     deleted canvas's own palette (theme.colors/PALETTE_RGB). 3-7 are restored (2026-10-18)
     against the real page: computed colours of the real elements, composited over their
     real backdrop, and the real SDK tokens (--canvas/--primary/--accent..., --font-sans/
     --font-display/--font-mono) resolved inside the preview -- not a palette copied here.
     Two parts are NOT ported, on purpose: 7's second half (the body font must be on a hand-
     written list of "safe" faces -- the SDK's sans slot is the body face by definition, and a
     list of approved fonts is exactly the authored list the laws forbid), and the old checks'
     one-click fixes (they wrote the dense tree; a safe real fix would be an ArkLayout
     colour override per element, which is a design decision, so these offer "Show" instead).
     14 (who the site is for) read an audience field that only the deleted canvas had: no
     real draft stores one, so it reports notBuilt -- never pass, never 0 -- and names what
     would build it. A rule whose every candidate sits on an image/gradient (or a colour
     space this parser does not read) reports 'unmeasured' rather than a guess. Neither of
     those two states counts toward the score; the badge is passes / measured rules. */
  /* WHAT the checks measure: the active route's own content, as the visitor is given it. The
     score moved between runs on an unchanged home page (9/13, 6/13, 7/13, 8/13) and reported
     "2 H1s": the second H1 was #fallback, the no-JS copy main.js keeps for screen readers but
     marks aria-hidden and clips to 1px (css/fallback.css); and a run that landed mid-entrance
     measured text still fading in (presence animations, opacity 0 -> 1). An element counts
     only when nothing marks it as not-the-page -- `hidden`, `inert` (the router's outgoing or
     not-yet-shown route), aria-hidden="true", the editor's own [data-ark-studio-ui] chrome --
     it is not visibility:hidden, and no ancestor clips it to nothing (a box of 1px or less
     that hides its overflow or clips its paint). Structure, not a list of ids: any visually-
     hidden copy is left out the same way (regression: tests/design-check-measurable.cjs). */
  function checkMeasurable(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const win = el.ownerDocument.defaultView;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.hidden || e.inert || e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('data-ark-studio-ui')) return false;
      const st = win.getComputedStyle(e);
      if (st.visibility === 'hidden' || st.visibility === 'collapse') return false;
      const clips = st.overflow !== 'visible' || (st.clipPath && st.clipPath !== 'none') || (st.clip && st.clip !== 'auto');
      if (clips) { const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return false; }
    }
    return true;
  }
  /* WHEN they measure: after the preview reported the route ready (cmsPreviewReady), its fonts
     loaded, the router finished its transition (#scene's data-transition) and every finite
     animation ended -- an infinite one (the hero's ambient motion) never ends and changes no
     rule. Resolves false if the page is still moving after `budget` ms; the popover says so
     rather than presenting a mid-animation reading as the page's. */
  const MAX_SETTLE_MS = 20000;
  async function previewSettled(budget) {
    const start = Date.now(), pause = (ms) => new Promise((r) => setTimeout(r, ms));
    let end = start + budget;
    while (Date.now() < end) {
      const doc = (() => { try { return cmsPreview.contentDocument; } catch (e) { return null; } })();
      if (state.cmsPreviewReady && doc && doc.readyState === 'complete' && doc.body) {
        if (doc.fonts && doc.fonts.status !== 'loaded') { await Promise.race([doc.fonts.ready, pause(250)]); continue; }
        const scene = doc.getElementById('scene');
        const moving = (doc.getAnimations ? doc.getAnimations() : []).filter((a) => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime));
        if (!(scene && scene.dataset.transition === 'running') && !moving.length) return true;
        if (moving.length) {
          /* A page whose scene plays once and settles (no idle loop, by law) can run longer than the
             budget; wait for the animations actually running when they end within MAX_SETTLE_MS of
             the start, instead of reporting a mid-play reading as "not settled". */
          const remaining = Math.max.apply(null, moving.map((a) => { const t = a.effect.getComputedTiming(); return (t.endTime || 0) - (a.currentTime || 0); }));
          if (Number.isFinite(remaining) && Date.now() + remaining <= start + MAX_SETTLE_MS) end = Math.max(end, Date.now() + remaining + 250);
          await Promise.race([Promise.all(moving.map((a) => a.finished.catch(() => {}))), pause(250)]); continue;
        }
      }
      await pause(100);
    }
    return false;
  }
  let lastChecks = [], checkRun = 0, latestRun = null;
  const scoreByRoute = Object.create(null);   /* the last reading per page: "worse" is against it */
  /* the one way the checks run: settle, then measure. An older run that a newer one superseded
     measures nothing -- and its caller gets the NEWER run's reading, never lastChecks as the
     older run found it. It used to return lastChecks there: the preview's ready message starts
     a run (queueCheck) while ArkAdminApp.designCheck()'s run is settling, so the first reading
     of a fresh page came back empty -- "0/0, settled" (regression: tests/design-check-supersede.cjs,
     tests/browser/design-check-stable.mjs). */
  function measureChecks() {
    const run = ++checkRun;
    const done = (async () => {
      const settled = await previewSettled(6000);
      if (run !== checkRun) return latestRun;
      state.lastChecksSettled = settled;
      runChecks();
      if (state.popAnchor === $('btnCheck')) refreshPop();
      return lastChecks;
    })();
    latestRun = done;
    return done;
  }
  function runChecks() {
    const out = [], add = (o) => out.push(o);
    const doc = (() => { try { return cmsPreview.contentDocument; } catch (e) { return null; } })();
    const route = state.cmsRoutes.find((r) => r.path === state.cmsCurrentRoute) || { path: state.cmsCurrentRoute };
    if (!doc || !doc.body) { lastChecks = out; return out; }
    const rendered = checkMeasurable;
    const fsz = (el) => parseFloat(getComputedStyle(el).fontSize);
    const words = (el) => (el.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    const heads = [...doc.querySelectorAll('h1,h2,h3,h4')].filter(rendered);
    const h1s = heads.filter((el) => el.tagName === 'H1'), h2s = heads.filter((el) => el.tagName === 'H2');
    const paras = [...doc.querySelectorAll('p')].filter((el) => rendered(el) && words(el) > 0);
    // 1 one clear H1
    add({ law: 'Hierarchy', title: 'One H1 says what the page is about', status: h1s.length === 1 ? 'pass' : 'fail', detail: h1s.length === 1 ? `"${h1s[0].textContent.trim().slice(0, 60)}"` : h1s.length ? `${h1s.length} H1s compete for attention.` : 'This page has no H1.' });
    // 2 H1 > H2 > paragraph
    const h1z = h1s.length ? Math.max(...h1s.map(fsz)) : 0, h2z = h2s.length ? Math.max(...h2s.map(fsz)) : 0;
    const bodyParas = paras.filter((el) => words(el) > 12), pz = bodyParas.length ? Math.max(...bodyParas.map(fsz)) : 0;
    const hierOk = (!h1s.length || !h2z || h1z > h2z * 1.1) && (!h2s.length || !pz || h2z > pz * 1.1);
    add({ law: 'Hierarchy', title: 'Biggest for the most important', status: hierOk ? 'pass' : 'warn', detail: hierOk ? `H1 ${Math.round(h1z)} px, H2 ${Math.round(h2z)} px, text ${Math.round(pz)} px.` : `Sizes are close: H1 ${Math.round(h1z)} px, H2 ${Math.round(h2z)} px, text ${Math.round(pz)} px.` });
    /* ---- colour/typography measurement for rules 3-7 (see the comment above) ---- */
    const win = doc.defaultView, css = (el) => win.getComputedStyle(el);
    const notStudio = (el) => !el.closest('[data-ark-studio-ui]');
    const parseColor = (s) => {
      let m = /^rgba?\(([^)]+)\)$/.exec(s || '');
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; }
      m = /^color\(srgb ([^)]+)\)$/.exec(s || '');
      if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { c: p.slice(0, 3).map((v) => v * 255), a: p.length > 3 ? p[3] : 1 }; }
      return null;
    };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
    const over = (top, a, under) => top.map((v, i) => v * a + under[i] * (1 - a));
    /* The colour actually painted behind `el` (its own fill included when `self`): layers
       are composited upward until an opaque one; an image/gradient on the way, or a colour
       this parser cannot read, makes it unknowable (null) rather than guessed. Nothing opaque
       all the way up is the browser canvas, which is white. */
    const backdrop = (el, self) => {
      const layers = [];
      for (let e = self ? el : el.parentElement; e; e = e.parentElement) {
        const st = css(e);
        if (st.backgroundImage && st.backgroundImage !== 'none') return null;
        const c = parseColor(st.backgroundColor); if (!c) return null;
        if (c.a > 0) layers.push(c);
        if (c.a >= 0.99) break;
      }
      let out = [255, 255, 255];
      for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i].c, layers[i].a, out);
      return out;
    };
    const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(css(e).opacity); return o; };
    const keyOf = (el) => { const k = el && el.closest('[data-ark-layout-key]'); return k ? k.getAttribute('data-ark-layout-key') : ''; };
    const visible = (el) => rendered(el) && notStudio(el) && css(el).visibility !== 'hidden' && (() => { const r = el.getBoundingClientRect(); return r.width * r.height > 4; })() && opacityOf(el) > 0.05;
    const buttons = [...doc.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')].filter(visible);
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const texts = [...doc.body.querySelectorAll('*')].filter((el) => !(el instanceof win.SVGElement) && ownText(el) && visible(el));
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    // 3 ghost buttons: no fill of their own (transparent or nearly so, and no image/gradient)
    const ghosts = buttons.filter((el) => { const st = css(el), c = parseColor(st.backgroundColor); return (!st.backgroundImage || st.backgroundImage === 'none') && c && c.a < 0.5; });
    add({ law: 'Buttons', title: 'No ghost buttons', status: ghosts.length ? 'fail' : 'pass', show: keyOf(ghosts[0]),
      detail: ghosts.length ? `${plural(ghosts.length, 'outline-only button', 'outline-only buttons')} of ${buttons.length}. Visitors skip them; give each a solid fill.` : buttons.length ? `All ${plural(buttons.length, 'button has', 'buttons have')} a solid fill.` : 'No buttons on this page.' });
    // 4 calls to action stand out: a filled button's fill against what is behind it, >= 3:1
    let unknown4 = 0;
    const flat = buttons.filter((el) => !ghosts.includes(el)).filter((el) => { const fill = backdrop(el, true), behind = backdrop(el, false); if (!fill || !behind) { unknown4++; return false; } return contrast(fill, behind) < 3; });
    const filled = buttons.length - ghosts.length;
    add({ law: 'Buttons', title: 'Calls to action stand out', show: keyOf(flat[0]),
      status: !buttons.length ? 'warn' : filled && unknown4 === filled ? 'unmeasured' : flat.length ? 'fail' : 'pass',
      detail: !buttons.length ? 'No buttons on this page. Give visitors one clear next step.' : filled && unknown4 === filled ? `Every filled button sits on an image or gradient, so its contrast cannot be measured from colours alone.` : `${flat.length ? `${plural(flat.length, 'button blends', 'buttons blend')} into the background (under 3:1). Use the accent colour.` : `${filled - unknown4} filled ${filled - unknown4 === 1 ? 'button contrasts' : 'buttons contrast'} at least 3:1 with what is behind ${filled - unknown4 === 1 ? 'it' : 'them'}.`}${unknown4 ? ` ${unknown4} not measurable (image or gradient behind).` : ''}` });
    // 5 text contrast: WCAG AA, 4.5:1 (3:1 for large text), text colour composited with its own alpha and opacity
    let unknown5 = 0;
    const lowText = texts.filter((el) => {
      const st = css(el), fg = parseColor(st.color), bg = backdrop(el, true);
      if (!fg || !bg) { unknown5++; return false; }
      const size = parseFloat(st.fontSize), big = size >= 24 || (size >= 18.66 && Number(st.fontWeight) >= 700);
      return contrast(over(fg.c, fg.a * opacityOf(el), bg), bg) < (big ? 3 : 4.5);
    });
    add({ law: 'Contrast', title: 'Text is easy to read', show: keyOf(lowText[0]),
      status: texts.length && unknown5 === texts.length ? 'unmeasured' : lowText.length ? 'fail' : 'pass',
      detail: texts.length && unknown5 === texts.length ? 'All text sits on images or gradients; contrast cannot be measured from colours alone.' : `${lowText.length ? `${plural(lowText.length, 'text element falls', 'text elements fall')} below 4.5:1 (3:1 for large text), of ${texts.length - unknown5} measured.` : `All ${texts.length - unknown5} measured text elements meet WCAG AA.`}${unknown5 ? ` ${unknown5} not measurable (image or gradient behind).` : ''}` });
    // 6 60-30-10: painted area by nearest real SDK fill token, resolved inside the page
    const probe = doc.createElement('i'); probe.setAttribute('data-ark-studio-ui', ''); probe.style.display = 'none'; doc.body.appendChild(probe);
    const tokenRgb = {};
    /* an undefined token would make var() fall back to the inherited colour -- a false match -- so only defined ones are probed */
    for (const tok of ArkLayout.FILL_TOKENS) { if (!css(doc.documentElement).getPropertyValue('--' + tok).trim()) continue; probe.style.color = `hsl(var(--${tok}))`; const c = parseColor(css(probe).color); if (c) tokenRgb[tok] = c.c; }
    probe.remove();
    /* 60-30-10 counts ROLES by what they are, not token names: the 10 is the action colour on
       actions, the 30 the brand pair (primary and its complement), the 60 every surface and
       meaning fill. A palette may give two roles one colour -- the SDK's --accent now IS
       --complement, the teal of actions -- and then the token name decides nothing: the nearest
       colour can carry several names (all of them are kept), and a fill the accent shares with the
       brand pair counts as the 10 on an action (a link, a button) and as the 30 anywhere else. It
       counted all of that teal as one part or the other by whichever token was listed first. */
    const isAction = (el) => !!el.matches && el.matches('a[href], button, [role="button"], input[type="submit"], input[type="button"], summary');
    const roleOf = (toks, el) => {
      const accent = toks.indexOf('accent') >= 0, brand = toks.indexOf('primary') >= 0 || toks.indexOf('complement') >= 0;
      if (accent && (!brand || isAction(el))) return 'accent';
      return brand ? 'brand' : 'neutral';
    };
    const nearest = (rgb) => {
      let bd = Infinity, best = [];
      for (const [tok, v] of Object.entries(tokenRgb)) {
        const d = (v[0] - rgb[0]) ** 2 + (v[1] - rgb[1]) ** 2 + (v[2] - rgb[2]) ** 2;
        if (d < bd - 1) { bd = d; best = [tok]; } else if (Math.abs(d - bd) <= 1) best.push(tok);
      }
      return best;
    };
    const area = { neutral: 0, brand: 0, accent: 0 };
    const measure = (el, inherited) => {
      if (!notStudio(el) || el instanceof win.SVGElement) return;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const st = css(el), c = parseColor(st.backgroundColor);
      let mine = inherited;
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS' || (st.backgroundImage && st.backgroundImage !== 'none')) mine = 'skip';
      else if (c && c.a > 0.5) mine = roleOf(nearest(c.c), el);
      let kids = 0; for (const k of el.children) { const kr = k.getBoundingClientRect(); kids += kr.width * kr.height; measure(k, mine); }
      if (mine !== 'skip') area[mine] += Math.max(0, r.width * r.height - kids);
    };
    if (Object.keys(tokenRgb).length) measure(doc.body, 'neutral');
    const tot = area.neutral + area.brand + area.accent, pN = tot ? area.neutral / tot * 100 : 0, pB = tot ? area.brand / tot * 100 : 0, pA = tot ? area.accent / tot * 100 : 0;
    const ratioOk = pN >= 50 && pB <= 40 && pA <= 15, pct = (v) => (v > 0 && v < 10 ? v.toFixed(1) : String(Math.round(v)));
    add({ law: 'Color', title: '60-30-10 color balance', ratio: [pN, pB, pA],
      status: !tot ? 'unmeasured' : ratioOk ? 'pass' : 'warn',
      detail: !Object.keys(tokenRgb).length ? 'The page defines none of the SDK fill tokens (--canvas, --primary, --accent...), so there is nothing to measure balance against.' : !tot ? 'No measurable painted area on this page.' : `Neutral ${pct(pN)} % · brand ${pct(pB)} % · accent ${pct(pA)} %. ${ratioOk ? 'Accent stays reserved for calls to action.' : pA > 15 ? 'Too much accent: keep it for buttons only.' : pB > 40 ? 'Brand color dominates: let neutrals carry the page.' : 'Let neutral backgrounds carry most of the page.'}` });
    // 7 plain fonts for body text: long paragraphs set in the SDK's sans slot, not display/mono
    const rootSt = css(doc.documentElement), firstFace = (list) => String(list || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    const faces = { sans: firstFace(rootSt.getPropertyValue('--font-sans')), display: firstFace(rootSt.getPropertyValue('--font-display')), mono: firstFace(rootSt.getPropertyValue('--font-mono')) };
    const longParas = paras.filter((el) => notStudio(el) && words(el) > 18);
    const decor = faces.sans ? longParas.filter((el) => { const f = firstFace(css(el).fontFamily); return f !== faces.sans && (f === faces.display || f === faces.mono); }) : [];
    add({ law: 'Typography', title: 'Plain fonts for body text', show: keyOf(decor[0]),
      status: !faces.sans ? 'unmeasured' : decor.length ? 'fail' : 'pass',
      detail: !faces.sans ? 'The page defines no --font-sans token, so there is no body face to compare paragraphs against.' : decor.length ? `${plural(decor.length, 'paragraph uses', 'paragraphs use')} the ${faces.display && decor.some((el) => firstFace(css(el).fontFamily) === faces.display) ? 'display' : 'mono'} face. Switch long text to the sans (body) font.` : `${longParas.length} long ${longParas.length === 1 ? 'paragraph is' : 'paragraphs are'} set in the body face (${faces.sans}).` });
    // 8 scannable
    const longP = paras.filter((el) => words(el) > 60);
    const sections = [...doc.querySelectorAll('section')].filter(rendered);
    const bare = sections.filter((el) => !el.querySelector('h1,h2,h3,h4') && words(el) > 40);
    add({ law: 'Scanning', title: 'Easy to scan', status: longP.length || bare.length ? 'warn' : 'pass', detail: longP.length || bare.length ? `${longP.length ? `${longP.length} paragraph${longP.length > 1 ? 's' : ''} over 60 words. ` : ''}${bare.length ? `${bare.length} section${bare.length > 1 ? 's' : ''} with no heading.` : ''}` : 'Short paragraphs, and every section has a heading.' });
    // 9 lead with the point
    const actions = [...doc.querySelectorAll('a[href],button')].filter(rendered);
    /* "the first screen" is a place on the PAGE, not in the window: measured from the top of the
       document (scroll of the window and of any scrolled container undone), so the reading is
       the same however far the preview happens to be scrolled */
    const pageTop = (el) => { let t = el.getBoundingClientRect().top + win.scrollY; for (let e = el.parentElement; e; e = e.parentElement) t += e.scrollTop; return t; };
    const firstActTop = actions.length ? Math.min(...actions.map(pageTop)) : Infinity;
    const leadOk = h1s.length && pageTop(h1s[0]) < 640 && (route.seoArticle || firstActTop < 760);
    add({ law: 'Layout', title: 'Lead with the point', status: leadOk ? 'pass' : 'warn', detail: leadOk ? 'The H1 and a next step are visible without scrolling.' : 'Put the H1 and one clear call to action in the first screen.' });
    // 10 links work (site-wide, real manifest link fields)
    const li = realLinkIndex(), bad = li.filter((l) => !l.ok);
    add({ law: 'Friction', title: 'Every link goes somewhere', status: bad.length ? 'fail' : 'pass', detail: bad.length ? `${bad.length} link${bad.length > 1 ? 's point' : ' points'} to a missing route.` : `${li.length} internal links, all working.` });
    // 11 every page reachable
    const inbound = new Set(li.filter((l) => l.ok && (l.tgt !== l.src || l.src === 'nav')).map((l) => l.tgt));
    const orph = state.cmsRoutes.filter((r) => r.path !== '/' && !inbound.has(r.path));
    add({ law: 'Friction', title: 'Every page can be reached', status: orph.length ? 'warn' : 'pass', detail: orph.length ? `Nothing links to ${orph.map((r) => r.path).join(', ')}.` : 'Every page has at least one link to it.' });
    // 12 search readiness (real SEO: cmsPageSeo/cmsSeoValue are pure functions over cmsSourceSite)
    const seo = cmsPageSeo(state.cmsSourceSite || {}, route);
    const title = seo.t || route.title || state.cmsCurrentRoute, desc = seo.d || '';
    const titleOk = title.length >= 15 && title.length <= 60, descOk = desc.length >= 50 && desc.length <= 160;
    add({ law: 'Search', title: 'Ready for search results', status: titleOk && descOk ? 'pass' : 'warn', detail: `Title ${title.length} chars${titleOk ? '' : ' (aim for 15-60)'} · description ${desc.length} chars${descOk ? '' : desc ? ' (aim for 50-160)' : ' (missing)'}.`, fix: 'seo', fixLabel: 'Open SEO' });
    // 13 AI assistants (site-wide bot policy, real cmsSourceSite.seo.site.bots)
    const siteSeo = (state.cmsSourceSite && state.cmsSourceSite.seo && state.cmsSourceSite.seo.site) || {};
    const bots = siteSeo.bots || {};
    const answerBotsOpen = ArkSEO.AI_BOTS.filter(([b, train]) => !train && (bots[b] || 'allow') === 'allow').length, answerBotsTotal = ArkSEO.AI_BOTS.filter((b) => !b[1]).length;
    add({ law: 'AI', title: 'Answer-ready for AI assistants', status: answerBotsOpen > 0 ? 'pass' : 'warn', detail: `${answerBotsOpen} of ${answerBotsTotal} AI assistants that answer questions may read the site.`, fix: 'seo-site', fixLabel: 'Open site SEO' });
    // 14 designed for the visitor: needs a stated audience, which no real draft stores
    add({ law: 'Audience', title: 'Designed for the visitor', status: 'notBuilt',
      /* plain words (docs/ux-audit/cms.md P1-2): what is missing and what would fix it, without the file names */
      detail: 'Not built: this rule compares the design against who the site is for, and the editor has nowhere to write that down yet. Once the site style or search settings get a field for who the site is for, this rule can be measured.' });
    lastChecks = out;
    const scored = out.filter((c) => c.status === 'pass' || c.status === 'warn' || c.status === 'fail');
    const score = scored.filter((c) => c.status === 'pass').length;
    /* A quiet count of tips, in the Edit style lens only -- not a pink "7/13" on every page in both
       lenses (docs/ux-audit/cms.md P1-10). The score itself stays the badge's data-score (passes /
       measured; drivers and the list read it). Warning tone only when the person's own edits on
       this page just made the reading worse than the last one. */
    const badge = $('scoreBadge'), btn = $('btnCheck'), tips = scored.length - score;
    const prev = scoreByRoute[state.cmsCurrentRoute];
    scoreByRoute[state.cmsCurrentRoute] = score;
    badge.dataset.score = `${score}/${scored.length}`;
    badge.textContent = String(tips);
    btn.dataset.tone = prev !== undefined && score < prev ? 'worse' : '';
    btn.setAttribute('aria-label', `Design tips: ${tips} for this page (${score} of ${scored.length} measured rules pass)`);
    btn.title = `${tips} design tip${tips === 1 ? '' : 's'} for this page: ${score} of ${scored.length} measured rules pass` + (out.length > scored.length ? ` · ${out.length - scored.length} not measured (see the list)` : '') + (btn.dataset.tone ? ' · fewer pass than before your last change' : '');
    return out;
  }
  let checkT = 0;
  function queueCheck() { clearTimeout(checkT); checkT = setTimeout(() => { if (state.view === 'design') measureChecks().then(() => renderStatus()); }, 450); }
  function applyFix(c) {
    if (c.fix === 'seo') { closePop(); openPageSeo(); return; }
    if (c.fix === 'seo-site') { closePop(); openSiteSeo(); return; }
  }
  /* opens on the last reading at once, and repaints when the settled one lands (measureChecks) */
  $('btnCheck').addEventListener('click', (e) => { const opening = state.popAnchor !== e.currentTarget;
    /* a first open has no reading yet: measure NOW (marked as not settled) so every rule shows at
       once, and let the settled reading repaint it -- the settle wait can run as long as the page's
       own animation (up to MAX_SETTLE_MS), and an empty list for that long read as broken */
    if (opening && !lastChecks.length) { runChecks(); state.lastChecksSettled = false; }
    openPop(e.currentTarget, (p) => {
    const checks = lastChecks;
    const head = document.createElement('div'); head.className = 'checkhead';
    const measured = checks.filter((c) => c.status === 'pass' || c.status === 'warn' || c.status === 'fail'), unmeasured = checks.length - measured.length;
    head.innerHTML = `<div><b>Design tips for this page</b><p>${measured.filter((c) => c.status === 'pass').length} of ${measured.length} measured rules pass${unmeasured ? ` · ${unmeasured} not measured` : ''}</p></div>`;
    if (!state.lastChecksSettled) head.firstChild.appendChild(h('p', { class: 'hint', text: 'Measured while the page was still moving (loading fonts or animating), so this reading can change; it updates by itself once the page is still.' }));
    p.appendChild(head);
    const ul = document.createElement('ul'); ul.className = 'checks';
    for (const c of checks) {
      const li = document.createElement('li'); li.className = c.status;
      li.innerHTML = `<span class="st">${ic(c.status === 'pass' ? 'check' : c.status === 'fail' ? 'close' : 'info')}</span><div><b></b><p></p></div>`;
      li.querySelector('b').textContent = `${c.law} · ${c.title}${c.status === 'notBuilt' ? ' · not built' : c.status === 'unmeasured' ? ' · not measured' : ''}`; li.querySelector('p').textContent = c.detail;
      li.dataset.check = c.title;
      const d = li.lastChild;
      if ((c.status === 'warn' || c.status === 'fail') && (c.fix || c.show)) {
        const acts = document.createElement('div'); acts.className = 'acts';
        if (c.fix) { const f = document.createElement('button'); f.className = 'btn small primary'; f.innerHTML = ic('wand', 'sm') + (c.fixLabel || 'Fix'); f.addEventListener('click', () => applyFix(c)); acts.appendChild(f); }
        /* select the first offending element in the preview, so the toolbar opens on it */
        if (c.show) { const s = document.createElement('button'); s.className = 'btn small'; s.textContent = 'Show'; s.addEventListener('click', () => { closePop(); postCmsSelectKey(c.show); }); acts.appendChild(s); }
        d.appendChild(acts);
      }
      ul.appendChild(li);
    }
    p.appendChild(ul);
  }, 'right'); if (opening) measureChecks(); });
  A.provide({ measureChecks: measureChecks, queueCheck: queueCheck });
})();
