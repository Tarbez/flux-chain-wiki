/* Shared route intent. Page presence and the persistent renderer subscribe to
   the same atomic snapshot; animation frames never enter store history. */
(function () {
  'use strict';
  ArkUI.createSceneState = function (initialPage) {
    var store = new ArkEngines.FluxMemoryStore({ historyLimit: 40, timelineLimit: 80 });
    var pages = {
      zero: { mesh: 'zero', dissolve: 0, depth: 0 },
      learnings: { mesh: 'zero', dissolve: 0, depth: 0 },
      about: { mesh: 'zero', dissolve: 0, depth: 0 },
      concept: { mesh: 'zero', dissolve: 0, depth: 0 },
      download: { mesh: 'zero', dissolve: 0, depth: 0 },
      deploy: { mesh: 'zero', dissolve: 0, depth: 0 },
      dao: { mesh: 'zero', dissolve: 0, depth: 0 }
    };
    pages.lifecycle = { mesh: 'zero', dissolve: 0, depth: 0 };
    ['intent', 'offer', 'agreement', 'fulfillment', 'receipt'].forEach(function (id) {
      pages['lifecycle/' + id] = { mesh: 'zero', dissolve: 0, depth: 0 };
    });
    if (typeof LearningContent !== 'undefined') LearningContent.articles.forEach(function (article) {
      pages['article/' + article.slug] = { mesh: 'zero', title: article.title, dissolve: 0, depth: 0 };
    });
    if (typeof ArkManifest !== 'undefined') ArkManifest.group('theory').forEach(function (entry) {
      pages['concept/' + entry.id] = { mesh: 'zero', dissolve: 0, depth: 0 };
    });
    /* Every routed page needs scene state. New content pages can inherit the
       neutral mesh unless they declare a more specific shape below. */
    function addPages(keys) { keys.forEach(function (key) { if (!pages[key]) pages[key] = { mesh: 'zero', dissolve: 0, depth: 0 }; }); }
    if (ArkUI.pageCatalog) addPages(Object.keys(ArkUI.pageCatalog));
    /* A manifest's shape section overrides the built-in config for its page:
       the manifest route names the scene page ('/' is the home scene). */
    if (typeof ArkManifest !== 'undefined') ArkManifest.all().forEach(function (entry) {
      if (!entry.shape) return;
      var key = entry.route === '/' ? 'zero' : entry.route.slice(1);
      if (!pages[key]) return;
      var config = Object.assign({}, entry.shape, { shape: entry.shape.kind });
      delete config.kind;
      pages[key] = Object.assign({}, pages[key], config);
    });
    var initial = initialPage || 'zero';
    store.set('scene', { page: initial, shapes: {}, rotation: (pages[initial].rotation || [0, 0]).slice(), paused: false, words: {} });
    function update(patch) { store.set('scene', Object.assign({}, store.get('scene'), patch)); }
    return {
      store: store,
      pages: pages,
      /* routes the catalog gained after load (the editor's canvas routing a page that exists only
         as a draft: js/main.js, ArkUI.catalogContentRoutes) get the same neutral scene state */
      addPages: addPages,
      get: function () { return store.get('scene'); },
      subscribe: function (listener) {
        var dispose = store.subscribe('scene', listener);
        listener(store.get('scene'));
        return dispose;
      },
      navigate: function (page) {
        if (!pages[page]) throw new Error('Unknown scene page: ' + page);
        /* A page's configured starting rotation applies on arrival; without one, the current viewing angle is kept. */
        update(pages[page].rotation ? { page: page, rotation: pages[page].rotation.slice() } : { page: page });
      },
      /* The picked shape belongs to the current page, not to one global slot:
         each page keeps its own choice. */
      selectShape: function (shape) {
        if (['zero', 'orb', 'knot'].indexOf(shape) < 0) return;
        var shapes = Object.assign({}, store.get('scene').shapes);
        shapes[store.get('scene').page] = shape;
        update({ shapes: shapes });
      },
      orient: function (tilt, turn) {
        tilt = Number(tilt) || 0; turn = Number(turn) || 0;
        update({ rotation: [Math.max(-90, Math.min(90, tilt)), ((turn + 180) % 360 + 360) % 360 - 180] });
      },
      rotate: function (axis, degrees) {
        if (axis !== 0 && axis !== 1) return;
        var rotation = store.get('scene').rotation.slice();
        var limit = axis === 0 ? 90 : 180;
        rotation[axis] = Math.max(-limit, Math.min(limit, Number(degrees) || 0));
        update({ rotation: rotation });
      },
      setWord: function (text) {
        var current = store.get('scene');
        if (pages[current.page].mesh !== 'word') return;
        var words = Object.assign({}, current.words);
        words[current.page] = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 72) || pages[current.page].title;
        update({ words: words });
      },
      pause: function (paused) { update({ paused: !!paused }); },
      mesh: function (state) {
        var page = pages[state.page];
        var shape = state.shapes[state.page] || page.shape || page.mesh;
        return { shape: shape, dissolve: page.dissolve, depth: page.depth, text: state.words[state.page] || page.title || 'LEARN' };
      }
    };
  };
  ArkUI.sceneState = ArkUI.createSceneState();

  ArkUI.lifecycleTransition = Object.freeze({
    zoomMs: 500,
    fadeMs: 180,
    overlap: .8,
    elementDelayMs: 6,
    elementGroups: 6,
    get enterMs() { return this.zoomMs + this.fadeMs * this.overlap; },
    get totalMs() { return this.enterMs + this.fadeMs + this.elementDelayMs * (this.elementGroups - 1); },
    opacityOut: function (elapsed, index) {
      if (index == null) index = this.elementGroups - 1;
      var delay = (this.elementGroups - 1 - index) * this.elementDelayMs;
      return Math.max(0,Math.min(1,1 - (elapsed - this.zoomMs - delay) /
        (this.fadeMs - delay / this.overlap)));
    },
    opacityIn: function (elapsed, index) {
      if (index == null) index = 0;
      return Math.max(0,Math.min(1,(elapsed - this.enterMs - index * this.elementDelayMs) / this.fadeMs));
    },
    createRun: function () {
      var timing = this;
      var reached = { zoom: false, overlap: false, complete: false };
      var waiters = { zoom: [], overlap: [], complete: [] };
      function reach(phase) {
        if (reached[phase]) return;
        reached[phase] = true;
        waiters[phase].splice(0).forEach(function (resolve) { resolve(); });
      }
      return {
        when: function (phase) {
          return reached[phase] ? Promise.resolve() : new Promise(function (resolve) { waiters[phase].push(resolve); });
        },
        advance: function (elapsed) {
          if (elapsed >= timing.zoomMs) reach('zoom');
          if (elapsed >= timing.enterMs) reach('overlap');
          if (elapsed >= timing.totalMs) reach('complete');
        },
        finish: function () { this.advance(timing.totalMs); },
        cancel: function () { Object.keys(reached).forEach(reach); }
      };
    }
  });

  /* Page presence animates content, never the whole page as one slab. */
  ArkUI.createPresence = function (elements) {
    var engine = new ArkEngines.FluxAnimate({ observeMutations: false });
    var revisions = new WeakMap();
    var running = new WeakMap();
    var homeItems = '.ark-hero-eyebrow,.home-title-kicker,.home-title-main,.home-title-finish,' +
      '.ark-hero-copy,.home-hero-actions a,.home-lifecycle-caption,.home-lifecycle-all,' +
      '.home-stage-link,.home-tools a';
    var pageItems = '.learning-eyebrow,.learning-heading,.learning-intro,.concept-deck,' +
      '.concept-links > a,.theory-footer > a,.deploy-step,.deploy-caveat,' +
      '.learning-list > li,.hero-experiment-kicker,.hero-experiment-index,.hero-experiment-copy h1,' +
      '.hero-experiment-question,.hero-experiment-note,.hero-experiment-copy a,' +
      '.section-heading > div,.section-heading > p,.lab-toolbar,.experiment-stage,.lab-bottom > *,.lab-note,' +
      '.article-topline,.article-title,.article-core,.article-contents,.article-reading > section,' +
      '.article-answer-controls,.article-next,.mechanism-depth,.mechanism-inner-title,' +
      '.mechanism-inner,.content-layer-path,' +
      '.guided-page > h1,.guided-body,.guided-page > .story-depth,.lifecycle-next,' +
      // the story template (js/pages/story.js): its blocks, and the depth column -- never the
      // figure column as one slab (a retained stage illustration must not fade; see below)
      '.story-page > [data-ark-block],.story-page .story-main';

    /* Per-element animation overrides (js/content/element-motion.js, Part H of the
       follow-up Studio plan): additive, never a replacement of the stagger above.
       An item with no data-ark-layout-key, or one with a key but no stored route+key
       entry, returns null here and keeps its exact existing computed delay/duration/
       translate/easing untouched below -- this function's only job is to say
       "is there an override for THIS item," never to compute a default itself.
       Guarded the same defensive way js/ark/page-router.js's fadeCanvas() already is:
       a missing script, a missing route, or any unexpected lookup failure degrades
       silently to "no override," never a thrown error reaching a real navigation. */
    function elementMotionOverride(pageEl, item) {
      if (!window.ArkElementMotion || !item || typeof item.getAttribute !== 'function') return null;
      try {
        var pageKey = pageEl && pageEl.dataset && pageEl.dataset.arkPage;
        var catalogEntry = pageKey && ArkUI.pageCatalog && ArkUI.pageCatalog[pageKey];
        var route = catalogEntry && catalogEntry.path;
        if (!route) return null;
        /* the scope the page's edits are stored under (one per document on /reference): ArkLayout.pageScope */
        if (window.ArkLayout && ArkLayout.pageScope) route = ArkLayout.pageScope(pageEl) || route;
        var saved = window.ArkElementMotion.get();
        if (!saved.routes || !saved.routes[route]) return null;
        /* The key computed now, not read off the element: a page shown before ArkLayout's
           deferred pass has run (a direct load) carries no key attribute yet, and the
           override was silently skipped. Same function the editor saved it under. */
        var key = window.ArkLayout && ArkLayout.keyFor ? ArkLayout.keyFor(item, document.getElementById('scene')) : item.getAttribute('data-ark-layout-key');
        if (!key) return null;
        return window.ArkElementMotion.entryFor(saved, route, key);
      } catch (e) { return null; }
    }
    function targets(el) {
      if (!el.querySelectorAll) return [];
      var matches = Array.from(el.querySelectorAll(el.dataset.arkPage === 'zero' ? homeItems : pageItems));
      // A lifecycle illustration's frame never belongs to a fading ancestor: its contents are
      // animated as separate targets.
      if(el.querySelector('.stage-scene')){
        matches=matches.concat(Array.from(el.querySelector('.stage-scene').children));
      }
      return matches.filter(function (item) {
        for (var current = item; current && current !== el; current = current.parentElement) {
          if (current.hidden) return false;
        }
        return !matches.some(function (other) { return other !== item && other.contains(item); });
      });
    }

    function stop(el) {
      (running.get(el) || []).forEach(function (animation) { animation.cancel(); });
      running.delete(el);
      el.getAnimations().forEach(function (animation) { animation.cancel(); });
    }

    function show(el, active, immediate, timing) {
      var revision = (revisions.get(el) || 0) + 1;
      revisions.set(el, revision);
      var wasHidden = el.hidden;
      var currentOpacity = wasHidden ? '0' : getComputedStyle(el).opacity;
      stop(el);
      el.inert = !active;
      el.setAttribute('aria-hidden', String(!active));
      if (immediate || (!active && wasHidden)) {
        el.hidden = !active;
        return Promise.resolve();
      }
      /* a world page (js/world/world-host.js ArkUI.worldRise): its words rise and leave by transform and clip, with the
         timings of ArkWorld.motion, and nothing fades */
      if (el.classList && el.classList.contains('world-page') && ArkUI.worldRise && typeof el.animate === 'function') {
        el.hidden = false;
        var rise = ArkUI.worldRise(el, active);
        running.set(el, rise.animations);
        return rise.done.then(function () {
          if (revisions.get(el) !== revision) return;
          el.hidden = !active; el.inert = !active; el.setAttribute('aria-hidden', String(!active)); stop(el);
        });
      }
      var items = targets(el);
      var canStagger = items.length && items.every(function (item) { return typeof item.animate === 'function'; });
      var from = { opacity: currentOpacity };
      el.hidden = false;
      var animation;
      if (canStagger) {
        var maxDelay = timing && timing.quick ? Math.min(48,(items.length - 1) * 8)
          : Math.min(active ? 80 : 48,(items.length - 1) * (active ? 16 : 8));
        var step = items.length > 1 ? maxDelay / (items.length - 1) : 0;
        var animations = items.map(function (item,index) {
          var base = getComputedStyle(item).transform;
          var override = elementMotionOverride(el, item);
          var shifted, delay, duration, easing;
          if (override) {
            // A stored override replaces direction/distance/duration/delay/easing for
            // THIS item only, computed from the SAME translate3d/base-transform shape
            // the default path builds below -- never a parallel animator. The sign
            // flips with `active` the same way the hardcoded 8/-6 default already does:
            // entering starts FROM the offset point, exiting ends AT it, both moving in
            // the one direction the override names.
            var vec = window.ArkElementMotion.vectorFor(override.direction);
            var sign = active ? 1 : -1;
            var ox = vec[0] * override.distance * sign, oy = vec[1] * override.distance * sign;
            shifted = 'translate3d(' + ox + 'px,' + oy + 'px,0)' + (base === 'none' ? '' : ' ' + base);
            delay = override.delay; duration = override.duration; easing = override.easing;
          } else {
            shifted = 'translate3d(0,' + (active ? 8 : -6) + 'px,0)' + (base === 'none' ? '' : ' ' + base);
            delay = step * (active ? index : items.length - index - 1);
            duration = timing && timing.quick
              ? active ? timing.duration - maxDelay : (timing.duration * ArkUI.lifecycleTransition.overlap - delay) / ArkUI.lifecycleTransition.overlap
              : active ? 260 : 160;
            easing = timing && timing.quick ? 'linear' : active ? 'cubic-bezier(.2,.65,.2,1)' : 'linear';
          }
          return item.animate(active
            ? [{ opacity: 0, transform: shifted }, { opacity: 1, transform: base }]
            : [{ opacity: getComputedStyle(item).opacity, transform: base }, { opacity: 0, transform: shifted }], {
              duration: duration,
              delay: delay,
              easing: easing,
              fill: 'both'
            });
        });
        // The root envelopes ALL content, including new controls, decorative
        // cards and status rows not listed in the stagger selectors. It also
        // prevents a cancelled exit from flashing back to full opacity.
        if (typeof el.animate === 'function') animations.push(el.animate(
          [{ opacity: currentOpacity }, { opacity: active ? '1' : '0' }], {
            duration: timing && timing.duration || (active ? 260 + maxDelay : 160 + maxDelay),
            easing: 'linear', fill: 'both'
          }
        ));
        running.set(el,animations);
        animation = Promise.all(animations.map(function (item) { return item.finished.catch(function () {}); }));
      } else {
        animation = engine.play(el,[from,{ opacity: active ? '1' : '0' }],{
          duration: timing && timing.duration || (active ? 300 : 180), delay: 0,
          easing: timing && timing.quick ? 'linear' : 'cubic-bezier(.2,.72,.2,1)', fill: 'both'
        },!active);
      }
      return animation.then(function () {
        if (revisions.get(el) !== revision) return;
        el.hidden = !active;
        el.inert = !active;
        el.setAttribute('aria-hidden', String(!active));
        stop(el);
      }).catch(function (error) {
        if (error.name !== 'AbortError') throw error;
      });
    }
    return {
      hide: function (page, immediate, timing) {
        return elements[page] ? show(elements[page], false, immediate, timing) : Promise.resolve();
      },
      enter: function (page, immediate, timing) {
        return elements[page] ? show(elements[page], true, immediate, timing) : Promise.resolve();
      },
      show: function (page, immediate) {
        return Promise.all(Object.keys(elements).map(function (key) { return show(elements[key], key === page, immediate); }));
      }
    };
  };
})();
