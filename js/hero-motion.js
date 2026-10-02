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
  var paths = make('nav', 'corner-navigation');
  paths.setAttribute('aria-label', 'Explore Flux Protocol');
  [['HOME.CORNER.USECASES', 'concept'], ['HOME.CORNER.TUTORIALS', 'learnings'], ['HOME.CORNER.EXPERIMENTS', 'proximity']].forEach(function (item) {
    var link = make('a'); link.href = router.url(item[1]); link.dataset.sceneLink = item[1];
    link.textContent = ArkCopy.text(item[0]) + ' ↗'; paths.appendChild(link);
  });
  scene.appendChild(paths);

  var latest = make('a', 'theory-invitation');
  latest.href = router.url('concept');
  latest.dataset.sceneLink = 'concept';
  var latestLabel = make('span', 'theory-invitation-label'); latestLabel.textContent = ArkCopy.text('HOME.INVITE.LABEL');
  var latestTitle = make('strong'); latestTitle.textContent = ArkCopy.text('HOME.INVITE.TITLE');
  var latestFoot = make('span', 'theory-invitation-link'); latestFoot.textContent = ArkCopy.text('HOME.INVITE.LINK') + ' ↗';
  latest.appendChild(latestLabel); latest.appendChild(latestTitle); latest.appendChild(latestFoot);
  scene.appendChild(latest);

  router.onMount(function (page, name) {
    var bindings = [];
    if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(page);
    page.querySelectorAll('[data-mesh-anchor]').forEach(function (anchor) {
      if (!scene.classList.contains('has-particle-shapes')) return;
      anchor.removeAttribute('aria-hidden');
      bindings.push(ArkUI.bindMeshDrag(anchor, state));
    });
    page.querySelectorAll('[data-scene-link]').forEach(function (link) { link.href = router.url(link.dataset.sceneLink)+(link.dataset.routeQuery?'?'+link.dataset.routeQuery:''); });
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
      if (labLink) { event.preventDefault(); navigate('lab'); }
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
    scene.querySelectorAll('.ark-header a').forEach(function (link) {
      if (router.resolve(link.getAttribute('href')) === current.page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    var paused = current.paused;
    var isEnabled = enabled();
    scene.classList.toggle('hero-still', !isEnabled);
    toggle.hidden = current.page === 'zero';
    paths.hidden = current.page !== 'zero';
    var isArticle = current.page.indexOf('article/') === 0;
    toggle.textContent = '← ' + ArkCopy.text(current.page === 'lab' ? 'NAV.BACK.EXPERIMENTS' : isArticle ? 'NAV.BACK.TUTORIALS' : isTheory ? 'NAV.BACK.THEORY' : 'NAV.BACK.ZERO');
    toggle.setAttribute('aria-expanded', String(current.page !== 'zero'));
    toggle.setAttribute('aria-label', current.page === 'lab' ? 'Return to experiments' : current.page === 'zero' ? 'Show the experiment' : isArticle ? 'Return to learnings' : isTheory ? 'Return to the operating model' : 'Return to the zero hero');
    latest.hidden = current.page !== 'zero';
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
    return router.navigate(page, { source: source,query:source&&source.dataset.routeQuery||undefined }).then(function (result) { sync(); return result; });
  }
  toggle.addEventListener('click', function () {
    var page = state.get().page;
    navigate(page === 'lab' ? 'proximity' : page === 'zero' ? 'proximity' : page.indexOf('article/') === 0 ? 'learnings' : page.indexOf('concept/') === 0 ? 'concept' : 'zero');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (header && header.classList.contains('nav-open')) {
      event.preventDefault(); closeNavigation(true); return;
    }
    if (state.get().page === 'zero') return;
    navigate(state.get().page === 'lab' ? 'proximity' : state.get().page.indexOf('article/') === 0 ? 'learnings' : state.get().page.indexOf('concept/') === 0 ? 'concept' : 'zero');
    toggle.focus({ preventScroll: true });
  });
  /* An old https://host/#/explore link is opened once, then its address is rewritten to the clean path. */
  function restoreRoute() {
    var rewrite = ArkUI.route.isLegacyHash();
    var options = rewrite ? { history: 'replace', query: ArkUI.route.search() || undefined } : { history: 'none' };
    return router.navigate(router.resolve(ArkUI.route.raw()), options).then(sync);
  }
  window.addEventListener('popstate', restoreRoute);
  window.addEventListener('hashchange', restoreRoute);
  document.addEventListener('ark:enter', function () { navigate('proximity'); });
  scene.querySelectorAll('.ark-header a').forEach(function (link) {
    link.addEventListener('click', function (event) { event.preventDefault(); navigate(router.resolve(link.getAttribute('href'))); });
  });
  var skip = document.querySelector('.skip');
  if (skip) skip.addEventListener('click', function (event) {
    event.preventDefault(); navigate('lab');
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
