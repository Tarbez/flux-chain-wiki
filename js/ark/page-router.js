/* Persistent ARK shell + one live routed page. Only an outgoing page may overlap
   during its exit. Module/data promises are cached; page DOM is disposable. */
(function () {
  'use strict';

  /* Upserts <meta name="description">: an admin SEO override for this route (js/content/seo.js),
     falling back to whatever index.html already shipped with (the page's own tag, never removed). */
  function applyMetaDescription(entry) {
    if (typeof ArkSEO === 'undefined' || !entry) return;
    var fallback = document.querySelector('meta[name="description"]');
    var fallbackText = fallback ? fallback.getAttribute('content') : '';
    var text = entry.seoArticle ? ArkSEO.articleDescription(entry.seoArticle, fallbackText)
      : entry.seoId ? ArkSEO.pageDescription(entry.seoId, fallbackText) : fallbackText;
    if (!text) return;
    var tag = fallback || document.createElement('meta');
    tag.setAttribute('name', 'description'); tag.setAttribute('content', text);
    if (!fallback) document.head.appendChild(tag);
  }

  ArkUI.createPageRouter = function (options) {
    var scene = options.scene, state = options.state;
    var outlet = options.outlet || scene.querySelector('[data-ark-layer="outlet"]');
    var catalog = options.catalog || ArkUI.pageCatalog;
    var load = options.load || ArkUI.loadPage;
    var mounted = Object.create(null), modules = new Map(), positions = new Map();
    var hooks = [], cleanups = new Map();
    var presence = ArkUI.createPresence(mounted);
    var lifecycleTiming = ArkUI.lifecycleTransition;
    var active = null, request = 0, commit = 0, requested = 'zero';
    var report = function () {};
    function isLifecycle(page) { return page === 'lifecycle' || page.indexOf('lifecycle/') === 0; }
    function url(page) { return '#' + catalog[page].path; }
    function resolve(hash) {
      var path = (hash || '#/').replace(/^#/, '').split('?')[0];
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
    function isDocumentPage(page) {
      return mounted[page] && mounted[page].classList.contains('learning-page');
    }
    function pageScroll(page) {
      return isDocumentPage(page) ? Number(window.scrollY) || 0 : mounted[page].scrollTop || 0;
    }
    function restoreScroll(page) {
      if (isDocumentPage(page)) {
        if (window.scrollTo) window.scrollTo(0,positions.get(page) || 0);
      } else {
        mounted[page].scrollTop = positions.get(page) || 0;
        if (window.scrollTo && window.scrollY) window.scrollTo(0,0);
      }
    }
    function remove(page) {
      var el = mounted[page];
      if (!el) return;
      if (page === active) positions.set(page,pageScroll(page));
      (cleanups.get(page) || []).forEach(function (cleanup) { cleanup(); });
      cleanups.delete(page);
      el.getAnimations({ subtree: true }).forEach(function (animation) { animation.cancel(); });
      el.remove(); delete mounted[page];
    }
    async function navigate(page, settings) {
      settings = settings || {};
      if (!Object.prototype.hasOwnProperty.call(catalog, page)) throw new Error('Unknown page: ' + page);
      var ticket = ++request; requested = page;
      var run = null;
      if (page === active) {
        if (scene.dataset.transition === 'running') {
          if (state.lifecycleRun) await state.lifecycleRun.when('complete');
          await presence.show(page, state.get().paused || ArkUI.prefersReducedMotion());
        }
        if (ticket !== request) return false;
        Object.keys(mounted).forEach(function (key) { if (key !== active) remove(key); });
        scene.dataset.transition = 'idle';
        scene.classList.remove('is-lifecycle-transition');
        state.lifecycleRun = null;
        outlet.setAttribute('aria-busy', 'false'); report('', false); writeHistory(page, settings.history);
        return true;
      }
      report('Loading ' + catalog[page].title.replace(' — Flux Protocol', '') + '…', false);
      outlet.setAttribute('aria-busy', 'true');
      try {
        if (!modules.has(page)) modules.set(page, load(page, catalog[page]).catch(function (error) { modules.delete(page); throw error; }));
        var module = await modules.get(page);
        if (ticket !== request) return false;
        report('', false);
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
          if (!el.classList.contains('learning-page')) el.scrollTop = positions.get(page) || 0;
          var cleanup = hooks.map(function (hook) { return hook(el, page); }).filter(function (fn) { return typeof fn === 'function'; });
          cleanups.set(page, cleanup);
        }
        if (page === 'zero') mounted[page].classList.remove('lifecycle-departing');
        if (active && mounted[active]) positions.set(active,pageScroll(active));
        // Hand focus back to shared chrome before disabling an outgoing page.
        if (typeof document !== 'undefined' && active && mounted[active] && mounted[active].contains(document.activeElement)) {
          var control = scene.querySelector('.hero-motion-toggle');
          if (control) control.focus({ preventScroll: true });
        }
        var immediate = state.get().paused || ArkUI.prefersReducedMotion();
        scene.dataset.transition = 'running';
        var outgoing = active;
        var zoomTransition = !immediate && outgoing && (isLifecycle(outgoing) || isLifecycle(page));
        if (state.lifecycleRun) state.lifecycleRun.cancel();
        run = zoomTransition ? lifecycleTiming.createRun() : null;
        state.lifecycleRun = run;
        scene.classList.toggle('is-lifecycle-transition',!!zoomTransition);
        var leaveHome = zoomTransition && outgoing === 'zero' && isLifecycle(page);
        if (leaveHome) mounted[outgoing].classList.add('lifecycle-departing');
        if (!zoomTransition && outgoing) await presence.hide(outgoing, immediate);
        if (ticket !== request) return false;
        active = page; var generation = ++commit;
        scene.dataset.page = page;
        state.navigate(page);
        writeHistory(page, settings.history);
        if (typeof document !== 'undefined') {
          document.title = catalog[page].title;
          applyMetaDescription(catalog[page]);
        }
        report('', false); outlet.setAttribute('aria-busy', 'false');
        var entering;
        if (zoomTransition) {
          await run.when('zoom');
          if (ticket !== request) return false;
          var leaving = presence.hide(outgoing, false, { duration: lifecycleTiming.fadeMs, quick: true });
          await run.when('overlap');
          if (ticket !== request) return false;
          entering = Promise.all([leaving, presence.enter(page, false, { duration: lifecycleTiming.fadeMs, quick: true })]);
        } else entering = presence.show(page, immediate);
        if (page !== 'zero') mounted[page].focus({ preventScroll: true });
        await Promise.all([entering,run ? run.when('complete') : Promise.resolve()]);
        if (ticket !== request || generation !== commit) return false;
        restoreScroll(page);
        Object.keys(mounted).forEach(function (key) { if (key !== active) remove(key); });
        scene.dataset.transition = 'idle';
        scene.classList.remove('is-lifecycle-transition');
        if (state.lifecycleRun === run) state.lifecycleRun = null;

        return true;
      } catch (error) {
        if (ticket !== request) return false;
        outlet.setAttribute('aria-busy', 'false');
        scene.classList.remove('is-lifecycle-transition');
        if (run && state.lifecycleRun === run) { run.cancel(); state.lifecycleRun = null; }
        if (window.console) console.error('[ark] page failed to load:', page, error);
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
