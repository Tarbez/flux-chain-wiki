(function () {
  'use strict';

  var scene = document.querySelector('#scene > [data-pattern="F-SCENE-RZERO_V0"]');
  if (!scene) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var visible = true;
  var state = ArkUI.sceneState;
  var persistent = scene.querySelector('[data-ark-layer="persistent"]');
  var router = ArkUI.pageRouter;
  var pages = router.pages;
  var frame = 0;
  var pointer = null;

  function make(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /* A near-black field with faint cyan/violet/amber glows: the lattice veil. */
  var atmosphere = make('div', 'hero-atmosphere');
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.dataset.source = 'flux-chain-lattice';
  persistent.insertBefore(atmosphere, persistent.firstChild);

  var header = scene.querySelector('.ark-header');
  var navToggle = header && header.querySelector('.nav-toggle');
  function closeNavigation(restoreFocus) {
    if (!navToggle) return;
    header.classList.remove('nav-open');
    var menu = header.querySelector('#primary-navigation');
    if (menu && menu.navLayers) menu.navLayers.reset();
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open all pages');
    navToggle.title = 'All pages';
    if (restoreFocus) navToggle.focus();
  }
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      if (header.classList.contains('nav-open')) { closeNavigation(false); return; }
      header.classList.add('nav-open');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close all pages');
      navToggle.title = 'Close all pages';
    });
    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) closeNavigation(false);
    });
    header.addEventListener('focusout', function (event) {
      if (!header.contains(event.relatedTarget)) closeNavigation(false);
    });
    window.matchMedia('(max-width: 1000px)').addEventListener('change', function () { closeNavigation(false); });
  }

  var wordTimer = 0;

  var toggle = make('button', 'hero-motion-toggle');
  toggle.type = 'button';
  scene.appendChild(toggle);
  scene.classList.add('hero-alive');

  var settings = make('div', 'site-settings');
  scene.appendChild(settings);
  // Persistent footer chrome: who runs this, and the standing rights line.
  // Both sit beside the settings gear, the one other thing that is always
  // on screen regardless of route.
  var credit = make('p', 'site-credit');
  credit.textContent = 'Powered, deployed and made by FLX';
  scene.appendChild(credit);
  var rights = make('p', 'site-copyright');
  rights.textContent = '© ' + new Date().getFullYear() + ' FLX';
  scene.appendChild(rights);
  /* The footer strip: one link per journey, to the page where that journey starts, derived from
     js/content/site-pages.js (the same table the "All pages" menu and the sitemap read), on every
     route. It replaces the scene's corner navigation (Spec / Notes / Interactive model) and the
     theory invitation, which were built on all 69 routes and visible on none (display:none in
     css/site-direction.css), yet were the only link to /experiments (docs/ux-audit/pages.md
     "Footer strip"; regression: tests/site-journeys.cjs, tests/browser/site-fixes.mjs). Kept
     minimal on purpose: the brand pass restyles the site footer later. */
  var paths = make('nav', 'site-footer-strip');
  paths.setAttribute('aria-label', 'Site sections');
  if (typeof ArkSitePages !== 'undefined') ArkSitePages.journeys().forEach(function (journey) {
    var lead = ArkSitePages.pages().find(function (row) { return row.journey === journey.id && row.lead && ArkUI.pageCatalog[row.key]; });
    if (!lead) return;
    var link = make('a', 'site-footer-link'); link.href = router.url(lead.key); link.dataset.sceneLink = lead.key;
    link.dataset.journey = journey.id;
    link.title = journey.title + ': ' + journey.note;
    link.textContent = lead.label; paths.appendChild(link);
  });
  scene.appendChild(paths);

  /* A scene link's query is read by ArkUI.route.linkQuery (js/ark/route.js): its
     data-route-query, else the query already in its href -- both for the href rewrite on mount
     and for the click. A doc link that names no `from` is given the page it was clicked on, so
     the reader's "Return" goes back there (docs/ux-audit/pages.md P1). */
  var sceneQuery = ArkUI.route.linkQuery;
  /* The reader returns to the page the link was CLICKED on: that is the source page, whatever
     `from` the link was built with (a resolution detail page built its doc links with its
     manifest's route, /resolutions, so "Return" left the page you were reading). A doc link
     inside the reader itself keeps the origin it already has. */
  function referenceQuery(query) {
    var params = new URLSearchParams(query || '');
    if (ArkUI.route.path() !== '/reference' || !params.get('from')) params.set('from', ArkUI.route.current());
    return params.toString();
  }
  router.onMount(function (page, name) {
    var bindings = [];
    if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(page);
    page.querySelectorAll('[data-mesh-anchor]').forEach(function (anchor) {
      if (!scene.classList.contains('has-particle-shapes')) return;
      anchor.removeAttribute('aria-hidden');
      bindings.push(ArkUI.bindMeshDrag(anchor, state));
    });
    page.querySelectorAll('[data-scene-link]').forEach(function (link) { var query = sceneQuery(link); link.href = router.url(link.dataset.sceneLink) + (query ? '?' + query : ''); });
    var input = page.querySelector('[data-word-input]');
    if (input && state.get().words[name]) input.value = state.get().words[name];
    return function () { bindings.forEach(function (binding) { binding.dispose(); }); };
  });
  var status = make('div', 'route-load-status');
  status.hidden = true; status.setAttribute('role', 'status');
  var statusText = make('span'); status.appendChild(statusText);
  var retry = make('button'); retry.type = 'button'; retry.textContent = 'TRY AGAIN'; status.appendChild(retry);
  retry.addEventListener('click', function () { router.retry(); });
  scene.appendChild(status);
  router.onStatus(function (message, failed) { status.hidden = !message; statusText.textContent = message; retry.hidden = !failed; });
  scene.addEventListener('input', function (event) {
    if (event.target.dataset.wordInput !== undefined) {
      window.clearTimeout(wordTimer);
      var page = state.get().page, value = event.target.value;
      wordTimer = window.setTimeout(function () { if (state.get().page === page) state.setWord(value); }, 160);
    }
  });
  scene.addEventListener('click', function (event) {
    var documentLink = event.target.closest('a[href^="docs/"]');
    if (documentLink && !documentLink.dataset.referenceOriginal && ArkUI.referenceDocs.indexOf(documentLink.getAttribute('href')) >= 0) {
      event.preventDefault();
      var query = new URLSearchParams({doc:documentLink.getAttribute('href'),from:ArkUI.route.current()}).toString();
      router.navigate('reference', {query:query,source:documentLink}).then(sync);
      return;
    }
    var target = event.target.closest('[data-scene-link], [data-reset-word], [data-section-target]');
    if (!target) {
      var labLink = event.target.closest('a[href="#work"]');
      if (labLink) { event.preventDefault(); navigate('proximity'); }
      return;
    }
    if (target.dataset.sceneLink) { event.preventDefault(); navigate(target.dataset.sceneLink, target); }
    else if (target.dataset.resetWord !== undefined) {
      window.clearTimeout(wordTimer);
      pages[state.get().page].querySelector('[data-word-input]').value = target.dataset.resetWord;
      state.setWord(target.dataset.resetWord);
    } else {
      var section = document.getElementById(target.dataset.sectionTarget);
      section.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      section.focus({ preventScroll: true });
    }
  });

  function enabled() { return !state.get().paused && !reduced.matches && visible && !document.hidden; }

  function resetPointer() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    scene.style.removeProperty('--hero-x');
    scene.style.removeProperty('--hero-y');
  }

  function sync() {
    var current = state.get();
    var isTheory = current.page.indexOf('concept/') === 0;
    scene.querySelectorAll('.ark-header a, .site-footer-strip a').forEach(function (link) {
      if (router.resolve(link.getAttribute('href')) === current.page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    var paused = current.paused;
    var isEnabled = enabled();
    scene.classList.toggle('hero-still', !isEnabled);
    toggle.hidden = current.page === 'zero';
    var isArticle = current.page.indexOf('article/') === 0;
    toggle.textContent = '← ' + ArkCopy.text(isArticle ? 'NAV.BACK.TUTORIALS' : isTheory ? 'NAV.BACK.THEORY' : 'NAV.BACK.ZERO');
    toggle.setAttribute('aria-expanded', String(current.page !== 'zero'));
    toggle.setAttribute('aria-label', current.page === 'zero' ? 'Show the experiment' : isArticle ? 'Return to the notes' : isTheory ? 'Return to the operating model' : 'Return to the zero hero');
    var meshControl=scene.querySelector('.mesh-drag-surface.mesh-drag-target');if(meshControl){var decorative=current.page!=='zero';meshControl.inert=decorative;meshControl.tabIndex=decorative?-1:0;meshControl.setAttribute('aria-hidden',String(decorative));}
    var active = pages[current.page];
    if (!active) return;
    if (!active.id) active.id = 'scene-page-' + current.page.replace(/[^a-z0-9-]/g, '-');
    toggle.setAttribute('aria-controls', active.id);
    var fallbackWord = active.querySelector('.article-word-fallback');
    if (fallbackWord) fallbackWord.textContent = state.mesh(current).text;
    document.documentElement.classList.toggle('has-learning-page', current.page === 'learnings' || isArticle);
    if (!isEnabled || !finePointer.matches || current.page==='zero') resetPointer();
    document.dispatchEvent(new CustomEvent('hero:motionchange', {
      detail: { enabled: isEnabled }
    }));
  }

  function navigate(page, source) {
    closeNavigation(header && header.contains(document.activeElement) && header.classList.contains('nav-open'));
    window.clearTimeout(wordTimer);
    var query = source && source.dataset ? sceneQuery(source) : '';
    if (page === 'reference') query = referenceQuery(query);
    return router.navigate(page, { source: source, query: query || undefined }).then(function (result) { sync(); return result; });
  }
  toggle.addEventListener('click', function () {
    var page = state.get().page;
    navigate(page === 'zero' ? 'proximity' : page.indexOf('article/') === 0 ? 'learnings' : page.indexOf('concept/') === 0 ? 'concept' : 'zero');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (header && header.classList.contains('nav-open')) {
      event.preventDefault(); closeNavigation(true); return;
    }
    if (state.get().page === 'zero') return;
    navigate(state.get().page.indexOf('article/') === 0 ? 'learnings' : state.get().page.indexOf('concept/') === 0 ? 'concept' : 'zero');
    toggle.focus({ preventScroll: true });
  });
  /* An old https://host/#/explore link is opened once, then its address is rewritten to the clean path. */
  function restoreRoute() {
    var resolutionSlug = ArkUI.route.path() === '/resolutions' ? new URLSearchParams(ArkUI.route.search()).get('r') : '';
    var resolutionPage = resolutionSlug && ArkUI.pageCatalog['resolutions/' + resolutionSlug] ? 'resolutions/' + resolutionSlug : '';
    var rewrite = ArkUI.route.isLegacyHash() || !!resolutionPage;
    var options = rewrite ? { history: 'replace', query: resolutionPage ? undefined : ArkUI.route.search() || undefined } : { history: 'none' };
    return router.navigate(resolutionPage || router.resolve(ArkUI.route.raw()), options).then(sync);
  }
  window.addEventListener('popstate', restoreRoute);
  window.addEventListener('hashchange', restoreRoute);
  document.addEventListener('ark:enter', function () { navigate('proximity'); });
  scene.querySelectorAll('.ark-header a').forEach(function (link) {
    link.addEventListener('click', function (event) { event.preventDefault(); navigate(router.resolve(link.getAttribute('href'))); });
  });
  /* Skip link (index.html, the first thing Tab reaches): past the header's ~10 controls to the
     page itself. It used to have no element at all, and this handler navigated to the old lab
     page (docs/ux-audit/pages-ux-a.md cross-page 7; regression: tests/browser/site-fixes.mjs). */
  var skip = document.querySelector('.skip');
  if (skip) skip.addEventListener('click', function (event) {
    var active = router.active && pages[router.active];
    if (!active) return;
    event.preventDefault();
    active.focus({ preventScroll: false });
  });
  reduced.addEventListener('change', sync);
  finePointer.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);

  scene.addEventListener('pointermove', function (event) {
    if (state.get().page==='zero' || !enabled() || !finePointer.matches || event.pointerType !== 'mouse') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      if (!pointer || !enabled()) return;
      var rect = scene.getBoundingClientRect();
      var x = Math.max(-1, Math.min(1, (pointer.x - rect.left) / rect.width * 2 - 1));
      var y = Math.max(-1, Math.min(1, (pointer.y - rect.top) / rect.height * 2 - 1));
      scene.style.setProperty('--hero-x', (x * 5).toFixed(2) + 'px');
      scene.style.setProperty('--hero-y', (y * 3).toFixed(2) + 'px');
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', resetPointer);

  if ('IntersectionObserver' in window) {
    var observer = new window.IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    observer.observe(scene);
  }

  state.subscribe(sync);
  restoreRoute();
})();
