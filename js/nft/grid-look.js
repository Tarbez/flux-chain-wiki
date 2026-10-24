/* DEFXN identity card: the GRID LOOK a worn card gives the site's ring world (docs/home-redesign/GRID-LOOK.md).

   DefxnGridLook.derive(traits) -> { version, params, why, notes }
     params: the card's values for the ring world's closed `grid` knobs (glass, edgeGlow, edgeHue, detail,
             detailDensity, texture, textureAmount, lightAHue, lightBHue, lightCHue, lightStrength, baseHue,
             baseGlow, rim, vivid, particles, hazeTint, bloom). kindTint is never set by a card.
     why:    one plain line per value that needed a choice (the texture scores, a tie, the spread side)
     notes:  what was left out and why (a 3D layer with no census leaves its knobs at the site's value)

   A pure function of the card's palette and the census of what its 3D layers build (each element's
   `census`, written into the bundles by make-layers.mjs from layers/census.flx). Nothing is authored per
   card and no rarity is read, so the same card always gives the same grid. The ring kit renders it, and
   the ring kit keeps the edge hue clear of the locked hues: this file sends the card's own hue.

   Two rules the spec left to this session, decided by measuring the palette (2026-10-24):
   - The one-hue spread. When the accent sits within 25 degrees of the light, the lights spread 28 degrees
     toward the side the palette itself leans: the accent's side of the light, else the tint's when it has
     any colour, else the + side (and `why` says no hue led). Both spread lights go to that side (B at 28,
     C at 14), so a one-hue palette stays in its own family. Amber leans red (accent 33 against light 38),
     so its lights become 10 and 24, not the prototype's yellow-green 66.
   - The texture tie. When the best two texture scores are within 0.05, the texture whose leading layer
     comes first in the card's own layer order wins, and `why` says so.
   Works in the browser (window.DefxnGridLook) and in Node (globalThis.DefxnGridLook). */
(function (root) {
  'use strict';

  var ORDER = ['backdrop', 'aura', 'mark', 'signal', 'particles'];   // the 3D layers, in the card's own order
  var ZERO = { cubes: 0, glass: 0, pts: 0, thin: 0 };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lg(x, top) { return clamp(Math.log10(1 + x) / top, 0, 1); }
  function arc(a, b) { return Math.abs(((a - b) % 360 + 540) % 360 - 180); }
  function signed(from, to) { return ((to - from) % 360 + 540) % 360 - 180; }
  function wrap(h) { return ((h % 360) + 360) % 360; }
  function hsl(s) { var p = String(s || '0 0% 0%').trim().split(/\s+/); return { h: parseFloat(p[0]) || 0, s: (parseFloat(p[1]) || 0) / 100, l: (parseFloat(p[2]) || 0) / 100 }; }
  function sum(list) { return list.reduce(function (a, c) { return { cubes: a.cubes + c.cubes, glass: a.glass + c.glass, pts: a.pts + c.pts, thin: a.thin + c.thin }; }, ZERO); }
  function all(c) { return c.cubes + c.glass + c.pts + c.thin; }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function r1(v) { return Math.round(v * 10) / 10; }

  function derive(traits) {
    var picks = traits.picks, pal = (picks.palette && picks.palette.attrs) || {}, why = {}, notes = [];
    var a = hsl(pal.a), b = hsl(pal.b || pal.a), c = hsl(pal.c || pal.b || pal.a);
    var Ly = {}, missing = {};
    ORDER.forEach(function (k) {
      var e = picks[k];
      if (e && e.census) Ly[k] = e.census;
      else { Ly[k] = ZERO; missing[k] = true; notes.push('The ' + k + ' layer (' + (e ? e.name : 'none') + ') has no census, so the knobs it sets keep the site\'s value. Run make-census.mjs, then make-layers.mjs.'); }
    });
    var p = {};

    /* colour: the palette's own three hues */
    p.vivid = clamp(0.2 + 0.85 * (b.s + c.s) / 2, 0.2, 1);
    p.lightAHue = b.h;
    if (arc(b.h, c.h) >= 25) {
      p.lightBHue = c.h;
      p.lightCHue = a.s >= 0.3 && arc(a.h, b.h) >= 25 ? a.h : wrap(b.h - 28);
      why.spread = 'two hues: light B is the accent';
    } else {
      var lean = signed(b.h, c.h), side;
      if (Math.abs(lean) >= 2) { side = lean < 0 ? -1 : 1; why.spread = 'one hue: the accent leans ' + (side < 0 ? 'down' : 'up') + ' by ' + Math.abs(Math.round(lean)) + ' degrees, so the lights spread that way'; }
      else if (a.s >= 0.08 && Math.abs(signed(b.h, a.h)) >= 2) { side = signed(b.h, a.h) < 0 ? -1 : 1; why.spread = 'one hue: the tint leads the spread'; }
      else { side = 1; why.spread = 'one hue and no hue leads: the + side'; }
      p.lightBHue = wrap(b.h + side * 28);
      p.lightCHue = a.s >= 0.3 && arc(a.h, b.h) >= 25 ? a.h : wrap(b.h + side * 14);
    }
    p.baseHue = p.lightBHue;
    p.edgeHue = c.h;
    why.edgeHue = 'the accent\'s own hue; the ring kit keeps it clear of the locked hues';

    /* strength: how light the palette is */
    p.lightStrength = clamp(0.45 + 0.9 * (b.l - 0.4), 0.45, 0.9);
    p.bloom = clamp(0.35 + 0.8 * (c.l - 0.4), 0.35, 0.75);

    /* material and amount: what the card builds */
    var solid = Ly.mark.cubes + Ly.mark.glass + Ly.aura.cubes + Ly.aura.glass;
    var thin = Ly.mark.thin + Ly.aura.thin + Ly.signal.thin;
    var gShare = (Ly.mark.glass + Ly.aura.glass) / (solid + 1);
    if (!missing.mark && !missing.aura) {
      p.glass = clamp(0.35 + 0.55 * Math.min(1, gShare * 1.6), 0.35, 0.9);
      p.detailDensity = lg(solid, 4.2);
    }
    if (!missing.mark && !missing.aura && !missing.signal) p.detail = solid + thin < 12 ? 'none' : thin / (solid + 1) >= 0.05 ? 'panels' : 'voxels';
    if (!missing.signal) p.edgeGlow = 0.5 + 0.4 * lg(all(Ly.signal), 2.2);
    if (!missing.aura) p.baseGlow = 0.35 + 0.45 * lg(all(Ly.aura), 2.6);
    if (!missing.backdrop) { p.rim = 0.35 + 0.4 * lg(all(Ly.backdrop), 3.6); p.hazeTint = 0.3 * lg(all(Ly.backdrop), 3.6); }
    if (!missing.particles) p.particles = lg(all(Ly.particles), 3.5);

    /* texture: the strongest of three scores, with the tie rule */
    if (!Object.keys(missing).length) {
      var amb = ['backdrop', 'aura', 'signal', 'particles'];
      var ambient = sum(amb.map(function (k) { return Ly[k]; }));
      var cand = [
        { t: 'dots', s: lg(ambient.pts, 3.6), lead: lead(amb, 'pts') },
        { t: 'scan', s: lg(ambient.thin + Ly.mark.thin, 2.5), lead: lead(amb.concat(['mark']), 'thin') },
        { t: 'frost', s: gShare >= 0.2 ? 0.5 + gShare / 2 : 0, lead: lead(['aura', 'mark'], 'glass') }
      ].sort(function (x, y) { return y.s - x.s; });
      var top = cand[0];
      if (cand[1].s > 0 && top.s - cand[1].s < 0.05) {
        var tied = cand.filter(function (x) { return top.s - x.s < 0.05; }).sort(function (x, y) { return ORDER.indexOf(x.lead) - ORDER.indexOf(y.lead); });
        why.tie = top.t + ' ' + top.s.toFixed(2) + ' and ' + cand[1].t + ' ' + cand[1].s.toFixed(2) + ' are within 0.05: ' + tied[0].t + ' wins, its leading layer (' + tied[0].lead + ') comes first';
        top = tied[0];
      }
      p.texture = top.s < 0.45 ? 'clear' : top.t;
      p.textureAmount = p.texture === 'clear' ? 0 : clamp(top.s * 0.55, 0.2, 0.55);
      why.texture = cand.map(function (x) { return x.t + ' ' + x.s.toFixed(2); }).join(', ');
    }
    function lead(layers, key) { return layers.slice().sort(function (x, y) { return Ly[y][key] - Ly[x][key] || ORDER.indexOf(x) - ORDER.indexOf(y); })[0]; }

    var params = {};
    Object.keys(p).forEach(function (k) { params[k] = typeof p[k] === 'number' ? (/Hue$/.test(k) ? r1(p[k]) : r3(p[k])) : p[k]; });
    return { version: 1, params: params, why: why, notes: notes };
  }

  root.DefxnGridLook = { derive: derive, LAYERS: ORDER.slice() };
})(typeof window !== 'undefined' ? window : globalThis);
