/* Persistent ARK shell + one live routed page. Only an outgoing page may overlap
   during its exit. Module/data promises are cached; page DOM is disposable. */
(function () {
  'use strict';
  ArkUI.createPageRouter = function (options) {
    var scene = options.scene, state = options.state;
    var outlet = options.outlet || scene.querySelector('[data-ark-layer="outlet"]');
    var catalog = options.catalog || ArkUI.pageCatalog;
    var load = options.load || ArkUI.loadPage;
    var mounted = Object.create(null), modules = new Map(), positions = new Map();
    var hooks = [], cleanups = new Map();
    var presence = ArkUI.createPresence(mounted);
    var active = null, request = 0, commit = 0, requested = 'zero';
    var report = function () {};
    function url(page) { return '#' + catalog[page].path; }
    function resolve(hash) {
      var path = (hash || '#/').replace(/^#/, '');
      /* the old Work page is the lab now: `#work` and `#/work` both land there instead of on a page that no longer exists */
      if (path === 'work' || path === '/work') return 'lab';
      if (path === 'proximity') return 'proximity';
      if (path === 'concept') return 'concept';
      if (Object.prototype.hasOwnProperty.call(catalog, path)) return path;
      return Object.keys(catalog).find(function (key) { return catalog[key].path === path; }) || 'zero';
    }
    function writeHistory(page, mode) {
      if (options.writeHistory) return options.writeHistory(page, mode);
      if (mode === 'none') return;
      if (location.hash !== url(page)) history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', url(page));
    }
    function remove(page) {
      var el = mounted[page];
      if (!el) return;
      positions.set(page, el.scrollTop || 0);
      (cleanups.get(page) || []).forEach(function (cleanup) { cleanup(); });
      cleanups.delete(page);
      el.getAnimations({ subtree: true }).forEach(function (animation) { animation.cancel(); });
      el.remove(); delete mounted[page];
    }
    async function navigate(page, settings) {
      settings = settings || {};
      if (!Object.prototype.hasOwnProperty.call(catalog, page)) throw new Error('Unknown page: ' + page);
      var ticket = ++request; requested = page;
      if (page === active) { outlet.setAttribute('aria-busy', 'false'); report('', false); writeHistory(page, settings.history); return true; }
      report('Loading ' + catalog[page].title.replace(' — SUBZERO', '') + '…', false);
      outlet.setAttribute('aria-busy', 'true');
      try {
        if (!modules.has(page)) modules.set(page, load(page, catalog[page]).catch(function (error) { modules.delete(page); throw error; }));
        var module = await modules.get(page);
        if (ticket !== request) return false;
        if (!mounted[page]) {
          var previous = Array.from(outlet.children);
          var el;
          try { el = module.mount(outlet, page); }
          catch (error) {
            Array.from(outlet.children).forEach(function (child) { if (previous.indexOf(child) < 0) child.remove(); });
            throw error;
          }
          el.dataset.arkPage = page; el.tabIndex = -1; el.hidden = true;
          el.inert = true; el.setAttribute('aria-hidden', 'true');
          mounted[page] = el;
          el.scrollTop = positions.get(page) || 0;
          var cleanup = hooks.map(function (hook) { return hook(el, page); }).filter(function (fn) { return typeof fn === 'function'; });
          cleanups.set(page, cleanup);
        }
        if (active && mounted[active]) positions.set(active, mounted[active].scrollTop || 0);
        // Hand focus back to shared chrome before disabling an outgoing page.
        if (typeof document !== 'undefined' && active && mounted[active] && mounted[active].contains(document.activeElement)) {
          var control = scene.querySelector('.hero-motion-toggle');
          if (control) control.focus({ preventScroll: true });
        }
        active = page; var generation = ++commit;
        scene.dataset.page = page; scene.dataset.transition = 'running';
        state.navigate(page);
        writeHistory(page, settings.history);
        if (typeof document !== 'undefined') document.title = catalog[page].title;
        report('', false); outlet.setAttribute('aria-busy', 'false');
        var immediate = state.get().paused || ArkUI.prefersReducedMotion();
        var entering = presence.show(page, immediate);
        mounted[page].scrollTop = positions.get(page) || 0;
        if (page !== 'zero') mounted[page].focus({ preventScroll: true });
        await entering;
        if (generation !== commit) return false;
        Object.keys(mounted).forEach(function (key) { if (key !== active) remove(key); });
        scene.dataset.transition = 'idle';

        return true;
      } catch (error) {
        if (ticket !== request) return false;
        outlet.setAttribute('aria-busy', 'false');
        report(active ? 'This page could not load. Your current page is still here.' : 'This page could not load. Please try again.', true);
        return false;
      }
    }
    return {
      pages: mounted, navigate: navigate, url: url, resolve: resolve,
      get active() { return active; },
      onMount: function (hook) { hooks.push(hook); },
      onStatus: function (handler) { report = handler; },
      retry: function () { return navigate(requested); }
    };
  };
})();
