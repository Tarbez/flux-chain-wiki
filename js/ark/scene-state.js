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
      concept: { mesh: 'zero', dissolve: 0, depth: 0 }
    };
    if (typeof LearningContent !== 'undefined') LearningContent.articles.forEach(function (article) {
      pages['article/' + article.slug] = { mesh: 'word', title: article.title, dissolve: 0, depth: 0 };
    });
    if (typeof ArkManifest !== 'undefined') ArkManifest.group('theory').forEach(function (entry) {
      pages['concept/' + entry.id] = { mesh: 'zero', dissolve: 0, depth: 0 };
    });
    store.set('scene', { page: initialPage || 'zero', shape: 'zero', paused: false, rotation: [0, 0], words: {} });
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
        update({ page: page });
      },
      selectShape: function (shape) {
        if (['zero', 'orb', 'knot'].indexOf(shape) < 0) return;
        if (store.get('scene').page === 'zero') update({ shape: shape });
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
        return { shape: state.page === 'zero' ? state.shape : page.mesh, dissolve: page.dissolve, depth: page.depth, text: state.words[state.page] || page.title || 'LEARN' };
      }
    };
  };
  ArkUI.sceneState = ArkUI.createSceneState();

  /* Cancellable presence built on ARK's native FluxAnimate. A replacement
     starts at the currently painted pose, and only its completion may hide. */
  ArkUI.createPresence = function (elements) {
    var engine = new ArkEngines.FluxAnimate({ observeMutations: false });
    var revisions = new WeakMap();
    var textPresence = ArkUI.createTextPresence && ArkUI.createTextPresence();
    function show(el, active, immediate) {
      var revision = (revisions.get(el) || 0) + 1;
      revisions.set(el, revision);
      var wasHidden = el.hidden;
      var style = getComputedStyle(el);
      var from = { opacity: el.hidden ? '0' : style.opacity, transform: style.transform === 'none' ? 'translate3d(0,0,0)' : style.transform };
      el.getAnimations().forEach(function (animation) { animation.cancel(); });
      el.hidden = false;
      el.inert = !active;
      el.setAttribute('aria-hidden', String(!active));
      var to = { opacity: active ? '1' : '0', transform: active ? 'translate3d(0,0,0)' : 'translate3d(0,-18px,0)' };
      var textJob = textPresence ? textPresence(el, active, immediate, wasHidden) : Promise.resolve();
      return Promise.all([textJob, engine.play(el, [from, to], {
        duration: immediate ? 0 : active ? 1800 : 1200,
        delay: 0, easing: 'cubic-bezier(.2,.72,.2,1)', fill: 'both'
      }, !active)]).then(function () {
        if (revisions.get(el) !== revision) return;
        el.hidden = !active;
        el.inert = !active;
        el.setAttribute('aria-hidden', String(!active));
      }).catch(function (error) {
        if (error.name !== 'AbortError') throw error;
      });
    }
    return {
      show: function (page, immediate) {
        return Promise.all(Object.keys(elements).map(function (key) { return show(elements[key], key === page, immediate); }));
      }
    };
  };
})();
