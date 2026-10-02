/* Shared route intent. Page presence and the persistent renderer subscribe to
   the same atomic snapshot; animation frames never enter store history. */
(function () {
  'use strict';
  ArkUI.createSceneState = function (initialPage) {
    var store = new ArkEngines.FluxMemoryStore({ historyLimit: 40, timelineLimit: 80 });
    var pages = {
      zero: { mesh: 'zero', dissolve: 0, depth: 0 },
      proximity: { mesh: 'proximity', dissolve: .5, depth: 1 },
      lab: { mesh: 'proximity', dissolve: .5, depth: 1 },
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
    if (ArkUI.pageCatalog) Object.keys(ArkUI.pageCatalog).forEach(function (key) {
      if (!pages[key]) pages[key] = { mesh: 'zero', dissolve: 0, depth: 0 };
    });
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
      '.concept-principles > section,.concept-links > a,.theory-footer > a,.deploy-step,.deploy-caveat,' +
      '.learning-list > li,.hero-experiment-kicker,.hero-experiment-index,.hero-experiment-copy h1,' +
      '.hero-experiment-question,.hero-experiment-note,.hero-experiment-copy a,' +
      '.section-heading > div,.section-heading > p,.lab-toolbar,.experiment-stage,.lab-bottom > *,.lab-note,' +
      '.article-topline,.article-title,.article-core,.article-contents,.article-reading > section,' +
      '.article-answer-controls,.article-next,.mechanism-depth,.mechanism-inner-title,' +
      '.mechanism-inner,.mechanism-status-summary,.content-layer-path,' +
      '.lifecycle-page > h1,.lifecycle-scenario,.lifecycle-page > section,.lifecycle-evidence';

    function targets(el) {
      if (!el.querySelectorAll) return [];
      var matches = Array.from(el.querySelectorAll(el.dataset.arkPage === 'zero' ? homeItems : pageItems));
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
      var items = targets(el);
      var canStagger = items.length && items.every(function (item) { return typeof item.animate === 'function'; });
      var from = { opacity: currentOpacity };
      el.hidden = false;
      var animation;
      if (canStagger) {
        var maxDelay = timing && timing.quick ? Math.min(48,(items.length - 1) * 8)
          : Math.min(active ? 220 : 160,(items.length - 1) * (active ? 26 : 18));
        var step = items.length > 1 ? maxDelay / (items.length - 1) : 0;
        var animations = items.map(function (item,index) {
          var base = getComputedStyle(item).transform;
          var shifted = 'translate3d(0,' + (active ? 8 : -6) + 'px,0)' + (base === 'none' ? '' : ' ' + base);
          var delay = step * (active ? index : items.length - index - 1);
          var duration = timing && timing.quick
            ? active ? timing.duration - maxDelay : (timing.duration * ArkUI.lifecycleTransition.overlap - delay) / ArkUI.lifecycleTransition.overlap
            : active ? 290 : 230;
          return item.animate(active
            ? [{ opacity: 0, transform: shifted }, { opacity: 1, transform: base }]
            : [{ opacity: getComputedStyle(item).opacity, transform: base }, { opacity: 0, transform: shifted }], {
              duration: duration,
              delay: delay,
              easing: timing && timing.quick ? 'linear' : active ? 'cubic-bezier(.2,.65,.2,1)' : 'linear',
              fill: 'both'
            });
        });
        // The root envelopes ALL content, including new controls, decorative
        // cards and status rows not listed in the stagger selectors. It also
        // prevents a cancelled exit from flashing back to full opacity.
        if (typeof el.animate === 'function') animations.push(el.animate(
          [{ opacity: currentOpacity }, { opacity: active ? '1' : '0' }], {
            duration: timing && timing.duration || (active ? 290 + maxDelay : 230 + maxDelay),
            easing: 'linear', fill: 'both'
          }
        ));
        running.set(el,animations);
        animation = Promise.all(animations.map(function (item) { return item.finished.catch(function () {}); }));
      } else {
        animation = engine.play(el,[from,{ opacity: active ? '1' : '0' }],{
          duration: timing && timing.duration || (active ? 420 : 550), delay: 0,
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
