/* =====================================================================
   ARK UI RUNTIME
   ---------------------------------------------------------------------
   A manifest registry, a builder and an emergence pass. Depends on
   ArkAtomizer and ArkFlux (loaded before this file); knows nothing about
   any particular resolver.

     register(id, manifest)    declare a resolver. A manifest may carry
                               `aliases: [...]`, extra fence ids that map
                               onto it, so an alias lives beside the thing
                               it names instead of in a list that can drift.
     alias(id, canonicalId)    the same mapping, done by hand
     base(cssText)             raw rules for the atomizer's base sheet
     render(fluxSource, host)  parse a pattern and mount it into host
     atomize(styleObject)      style object -> atomic class

   A resolver manifest is:
     tag        element to create                       (default 'div')
     schema     terse Flux key -> readable prop name    ({ N: 'count' })
     base       style object applied to every instance
     style(p)   style object computed from props
     attrs(p)   attributes to set
     text(p)    textContent
     decorate(el, p)   free-form child construction
     onMount(el, p)    runs once the tree is in the document
     emerge     { delay, dur } opacity fade-in, in ms
   ===================================================================== */
var ArkUI = (function () {
  'use strict';

  var registry = Object.create(null);

  function alias(id, canonicalId) {
    if (!registry[canonicalId]) throw new Error('ArkUI: unknown canonical resolver ' + canonicalId);
    registry[id] = registry[canonicalId];
  }

  function register(id, manifest) {
    registry[id] = manifest;
    var names = manifest.aliases || [];
    for (var i = 0; i < names.length; i++) alias(names[i], id);
  }

  /* ------------------------------------------------------------------
     BUILDER
     ------------------------------------------------------------------ */
  function build(node, ctx) {
    var m = registry[node.resolver];
    if (!m) {
      if (window.console) console.warn('[ArkUI] unresolved resolver: ' + node.resolver);
      return null;
    }

    /* map terse Flux keys through the resolver schema */
    var p = {};
    var schema = m.schema || {};
    for (var k in node.props) {
      if (!Object.prototype.hasOwnProperty.call(node.props, k)) continue;
      p[schema[k] || k] = node.props[k];
    }

    var el = document.createElement(m.tag || 'div');

    var classes = [];
    if (m.base) classes.push(ArkAtomizer.atomize(m.base));
    if (m.style) classes.push(ArkAtomizer.atomize(m.style(p)));
    var cls = classes.filter(Boolean).join(' ');
    if (cls) el.className = cls;

    if (m.attrs) {
      var attrs = m.attrs(p) || {};
      for (var a in attrs) {
        if (attrs[a] === null || attrs[a] === undefined) continue;
        el.setAttribute(a, String(attrs[a]));
      }
    }

    if (m.text) {
      var t = m.text(p);
      if (t !== null && t !== undefined) el.textContent = t;
    }

    if (m.decorate) m.decorate(el, p);

    if (m.onMount) ctx.mounts.push({ el: el, p: p, fn: m.onMount });
    if (m.emerge) ctx.emerge.push({ el: el, dur: m.emerge.dur, delay: m.emerge.delay });

    for (var ci = 0; ci < node.children.length; ci++) {
      var built = build(node.children[ci], ctx);
      if (built) el.appendChild(built);
    }
    return el;
  }

  /* ------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------ */
  var REDUCED = false;
  try {
    REDUCED = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { REDUCED = false; }

  function render(src, host) {
    var tree = ArkFlux.parse(src);
    var ctx = { mounts: [], emerge: [] };
    var el = build(tree, ctx);
    if (!el) throw new Error('ArkUI: scene root could not be resolved.');
    host.appendChild(el);

    /* Paint hooks run after the tree is in the document and has layout. */
    for (var i = 0; i < ctx.mounts.length; i++) {
      ctx.mounts[i].fn(ctx.mounts[i].el, ctx.mounts[i].p);
    }

    /* Emergence, not entrance. Nothing scales. Nothing bounces. */
    if (!REDUCED && ctx.emerge.length && !host.closest('[data-ark-layer="outlet"]')) {
      for (var a = 0; a < ctx.emerge.length; a++) ctx.emerge[a].el.classList.add('ark-zero');
      void el.offsetHeight;                       /* commit the ZERO state */
      for (var b = 0; b < ctx.emerge.length; b++) {
        var e = ctx.emerge[b];
        e.el.classList.add(ArkAtomizer.atomize({
          opacity: '1',
          transition: 'opacity ' + e.dur + 'ms cubic-bezier(0.22, 0.61, 0.36, 1) ' + e.delay + 'ms',
          willChange: 'opacity'
        }));
      }
    }
    return el;
  }

  return {
    register: register,
    alias: alias,
    render: render,
    base: ArkAtomizer.base,
    atomize: ArkAtomizer.atomize,
    parse: ArkFlux.parse,
    prefersReducedMotion: function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  };
})();
