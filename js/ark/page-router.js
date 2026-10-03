/* Persistent ARK shell + one live routed page. Only an outgoing page may overlap
   during its exit. Module/data promises are cached; page DOM is disposable. */
(function () {
  'use strict';

  /* Keep description, social tags and explicit canonical overrides in step with
     the committed route. This is browser metadata, not server prerendering. */
  var initialDescription;
  function applyRouteMetadata(entry) {
    if (typeof ArkSEO === 'undefined' || !entry) return;
    var fallback = document.querySelector('meta[name="description"]');
    if (initialDescription === undefined) initialDescription = fallback ? fallback.getAttribute('content') : '';
    var fallbackText = initialDescription;
    var text = entry.seoArticle ? ArkSEO.articleDescription(entry.seoArticle, fallbackText)
      : entry.seoId ? ArkSEO.pageDescription(entry.seoId, fallbackText) : fallbackText;
    if (!text) return;
    var tag = fallback || document.createElement('meta');
    tag.setAttribute('name', 'description'); tag.setAttribute('content', text);
    if (!fallback) document.head.appendChild(tag);
    // Remove optional route metadata when the next route has no override.
    // Never carry an image or canonical URL across a navigation boundary.
    function meta(attribute, key, value) {
      var node = document.querySelector('meta[' + attribute + '="' + key + '"]');
      if (!value) { if (node) node.remove(); return; }
      if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, key); document.head.appendChild(node); }
      node.setAttribute('content', value);
    }
    var map = entry.seoArticle ? 'articles' : 'pages';
    var id = entry.seoArticle || entry.seoId;
    var image = ArkSEO.ogImage(map, id);
    var canonical = ArkSEO.canonical(map, id);
    meta('property', 'og:title', document.title);
    meta('property', 'og:description', text);
    meta('property', 'og:type', entry.seoArticle ? 'article' : 'website');
    meta('property', 'og:image', image);
    meta('property', 'og:url', canonical);
    meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    meta('name', 'twitter:title', document.title);
    meta('name', 'twitter:description', text);
    meta('name', 'twitter:image', image);
    var link = document.querySelector('link[rel="canonical"]');
    if (!canonical) { if (link) link.remove(); }
    else {
      if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
      link.setAttribute('href', canonical);
    }
  }

  ArkUI.createPageRouter = function (options) {
    var scene = options.scene, state = options.state;
    var outlet = options.outlet || scene.querySelector('[data-ark-layer="outlet"]');
    var catalog = options.catalog || ArkUI.pageCatalog;
    var load = options.load || ArkUI.loadPage;
    var mounted = Object.create(null), modules = new Map(), positions = new Map();
    var hooks = [], cleanups = new Map();
    var presence = ArkUI.createPresence(mounted);
    var continuity = ArkUI.createPanelContinuity && scene.getBoundingClientRect ? ArkUI.createPanelContinuity(scene) : null;
    var stageRetention=ArkUI.createStageRetention&&scene.getBoundingClientRect?ArkUI.createStageRetention(scene):null;
    var lifecycleTiming = ArkUI.lifecycleTransition;
    var active = null, request = 0, commit = 0, requested = 'zero', requestedSettings = {};
    var report = function () {};
    function isLifecycle(page) { return page === 'lifecycle' || page.indexOf('lifecycle/') === 0; }
    function isLifecycleStage(page) { return String(page).indexOf('lifecycle/') === 0; }
    function animateLifecycleInformation(el, immediate) {
      if (immediate || !el || !el.querySelectorAll) return Promise.resolve();
      var targets = Array.from(el.querySelectorAll('.story-kicker,.lifecycle-answer h1,.lifecycle-view,.lifecycle-boundary,.lifecycle-next'));
      var runs = targets.filter(function (item) { return typeof item.animate === 'function'; }).map(function (item) {
        return item.animate([{ transform:'translate3d(0,4px,0)' }, { transform:'translate3d(0,0,0)' }], {
          duration:180, easing:'cubic-bezier(.2,.65,.2,1)'
        });
      });
      return Promise.all(runs.map(function (run) { return run.finished.catch(function () {}); }));
    }
    function url(page) { return ArkUI.route.href(catalog[page].path); }
    function resolve(address) {
      var path = String(address == null || address === '' ? '/' : address).replace(/^#/, '').split('?')[0];
      if (path.length > 1) path = path.replace(/\/+$/, '');
      /* the explorer used to live at /explorer; /explore is its address now */
      if (path === '/explorer') return 'explorer';
      /* the old Work page is the lab now: `#work` and `#/work` both land there instead of on a page that no longer exists */
      if (path === 'work' || path === '/work') return 'lab';
      if (path === 'proximity') return 'proximity';
      if (path === 'concept') return 'concept';
      if (Object.prototype.hasOwnProperty.call(catalog, path)) return path;
      return Object.keys(catalog).find(function (key) { return catalog[key].path === path; }) || 'zero';
    }
    function writeHistory(page, mode, query) {
      if (options.writeHistory) return options.writeHistory(page, mode, query);
      if (mode === 'none') return;
      ArkUI.route.write(catalog[page].path, query || '', mode === 'replace' ? 'replace' : 'push');
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
      (cleanups.get(page) || []).forEach(function (cleanup) { cleanup(); });
      cleanups.delete(page);
      if (typeof el.arkDispose === 'function') el.arkDispose();
      el.getAnimations({ subtree: true }).forEach(function (animation) { animation.cancel(); });
      el.remove(); delete mounted[page];
    }
    async function navigate(page, settings) {
      settings = Object.assign({}, settings || {});
      if (settings.query === undefined && settings.history !== 'none' && continuity) settings.query = continuity.returnQuery(page);
      if (!Object.prototype.hasOwnProperty.call(catalog, page)) throw new Error('Unknown page: ' + page);
      var ticket = ++request; requested = page; requestedSettings = settings;
      var run = null;
      if (page === active) {
        if(stageRetention)stageRetention.restore();
        if (page === 'reference') {
          try {
            var reader = await modules.get(page);
            await reader.prepare(page, settings);
            if (ticket !== request) return false;
            reader.update(mounted[page]); mounted[page].focus({ preventScroll:true });
          } catch (error) { if (ticket !== request) return false; report('This reference could not load. Your current source is still here.', true); return false; }
        }
        if (scene.dataset.transition === 'running') {
          if (state.lifecycleRun) await state.lifecycleRun.when('complete');
          await presence.show(page, state.get().paused || ArkUI.prefersReducedMotion());
        }
        if (ticket !== request) return false;
        Object.keys(mounted).forEach(function (key) { if (key !== active) remove(key); });
        scene.dataset.transition = 'idle';
        scene.classList.remove('is-lifecycle-transition');
        state.lifecycleRun = null;
        outlet.setAttribute('aria-busy', 'false'); report('', false); writeHistory(page, settings.history, settings.query);
        return true;
      }
      report('Loading ' + catalog[page].title.replace(' — Flux Protocol', '') + '…', false);
      outlet.setAttribute('aria-busy', 'true');
      try {
        // Reject a mismatched scene registry before mounting or hiding the
        // current page. A late state.navigate failure would leave no page up.
        if (state.pages && !Object.prototype.hasOwnProperty.call(state.pages, page)) {
          throw new Error('Unknown scene page: ' + page);
        }
        if (!modules.has(page)) modules.set(page, load(page, catalog[page]).catch(function (error) { modules.delete(page); throw error; }));
        var module = await modules.get(page);
        if (module.prepare) await module.prepare(page, settings);
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
        if (active && mounted[active]) positions.set(active,pageScroll(active));
        // Hand focus back to shared chrome before disabling an outgoing page.
        if (typeof document !== 'undefined' && active && mounted[active] && mounted[active].contains(document.activeElement)) {
          var control = scene.querySelector('.hero-motion-toggle');
          if (control) control.focus({ preventScroll: true });
        }
        var immediate = state.get().paused || ArkUI.prefersReducedMotion();
        scene.dataset.transition = 'running';
        var outgoing = active;
        var stageSwap = isLifecycleStage(outgoing) && isLifecycleStage(page);
        var panel = continuity && continuity.begin(outgoing, page, mounted, settings.source, immediate);
        var zoomTransition = !stageSwap && !panel && !immediate && outgoing && (isLifecycle(outgoing) || isLifecycle(page));
        if (state.lifecycleRun) state.lifecycleRun.cancel();
        if(stageRetention)stageRetention.hold(mounted[outgoing],mounted[page],immediate || stageSwap);
        // Outgoing content must leave under its OWN route styles. Switching the
        // ancestor's data-page first reflows home cards into the incoming layout.
        if (outgoing) await presence.hide(outgoing, immediate || stageSwap, zoomTransition ? { duration: lifecycleTiming.fadeMs, quick: true } : undefined);
        if (ticket !== request) return false;
        // Discard interrupted exits as well: no third page may leak into this handoff.
        Object.keys(mounted).forEach(function (key) { if (key !== page) remove(key); });
        run = zoomTransition ? lifecycleTiming.createRun() : null;
        state.lifecycleRun = run;
        scene.classList.toggle('is-lifecycle-transition',!!zoomTransition);
        active = page; var generation = ++commit;
        scene.dataset.page = page;
        state.navigate(page);
        writeHistory(page, settings.history, settings.query);
        if (mounted[page].arkRestore) mounted[page].arkRestore();
        if (typeof document !== 'undefined') {
          document.title = catalog[page].title;
          applyRouteMetadata(catalog[page]);
        }
        report('', false); outlet.setAttribute('aria-busy', 'false');
        var panelRun = panel ? panel.commit(mounted[page], immediate) : Promise.resolve();
        if(stageRetention)stageRetention.commit(mounted[page]);
        var entering;
        if (stageSwap) {
          entering = presence.show(page, true).then(function () {
            if (stageRetention) stageRetention.activate(mounted[page]);
            return animateLifecycleInformation(mounted[page], immediate);
          });
        } else if (zoomTransition) {
          // The old page has already exited under its own styles. Reveal the
          // new page as the mesh begins moving; waiting for its late overlap
          // marker leaves a conspicuous blank content interval.
          entering = presence.enter(page, false, { duration: lifecycleTiming.fadeMs, quick: true });
        } else entering = presence.show(page, immediate).then(function () {
          if (stageRetention) stageRetention.activate(mounted[page]);
        });
        // Reveal sets up its first animation frame synchronously. Restore scroll
        // now, before it paints, rather than jumping after the entry completes.
        restoreScroll(page);
        if (page !== 'zero') mounted[page].focus({ preventScroll: true });
        await Promise.all([entering,panelRun,run ? run.when('complete') : Promise.resolve()]);
        if (ticket !== request || generation !== commit) return false;
        Object.keys(mounted).forEach(function (key) { if (key !== active) remove(key); });
        scene.dataset.transition = 'idle';
        scene.classList.remove('is-lifecycle-transition');
        if (state.lifecycleRun === run) state.lifecycleRun = null;

        return true;
      } catch (error) {
        if (ticket !== request) return false;
        if(stageRetention)stageRetention.restore();
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
      get panelHost() { return continuity && continuity.host; },
      onMount: function (hook) { hooks.push(hook); },
      onStatus: function (handler) { report = handler; },
      retry: function () { return navigate(requested, requestedSettings); }
    };
  };
})();
