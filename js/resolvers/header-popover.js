/* The header's Ark popover swap: loaded (and loading js/ark/vendor/ark-kit-popover.js) on the first press (or a resting
   mouse) of the network pill or the Resolutions menu, never on page load (js/resolvers/header.js lazyHeaderPopover;
   docs/cms-architecture.md Budget). Site code, so it is its own file and not part of the Ark vendor chunk.
   Renders Ark's `popover` block in place of the plain control: the block's root takes the wrapper's class,
   attributes and place among its siblings (structural layout keys and the row fit do not move), its button takes the
   plain button's class, id, attributes and children (the site's styling, an icon, a live label and any CMS style
   survive), and its panel is emptied for the caller's content (`spec.content`, moved in; `spec.fallback`, the plain panel, removed; `spec.done`, if any, told; `spec.align` defaults to start). Checked by tests/header-ark-parts.cjs. */
var ArkHeaderPopover = (function () {
  function parts(spec) {
    var root = ArkKit.renderArkBlock({ block: 'popover', props: { label: spec.label, content: spec.label, align: spec.align, group: 'header' } }, { document: document });
    var trigger = root.querySelector('[data-ark-part="popover-trigger"]');
    var panel = root.querySelector('[data-ark-part="popover-panel"]');
    var old = spec.trigger;
    /* never carried: the new node's own Ark part, and a skin's marks (data-ark-skin-*, js/ark/skin-parts.js's
       data-defxn-part). Copied, they outlived the skin: its undo clears the nodes it marked, and the old button is gone. */
    var SKIN_OWNED = /^data-(ark-part|ark-skin.*|defxn-part)$/;
    function carry(from, to, skip) {
      Array.prototype.slice.call(from.attributes).forEach(function (attr) {
        if (skip.indexOf(attr.name) < 0 && !SKIN_OWNED.test(attr.name)) to.setAttribute(attr.name, attr.value);
      });
    }
    carry(spec.wrap, root, ['class']);
    root.classList.remove('ark-block');   /* the header's wrapper, not a block of the page: its own fonts and display */
    root.className += ' ' + spec.wrap.className;
    carry(old, trigger, ['class', 'type', 'aria-expanded', 'aria-haspopup', 'aria-controls', 'aria-busy']);
    trigger.className = old.className;
    old.removeAttribute('id');
    trigger.replaceChildren.apply(trigger, Array.prototype.slice.call(old.childNodes));
    panel.replaceChildren();
    panel.id = spec.id;
    panel.className += ' ' + spec.id;
    trigger.setAttribute('aria-controls', spec.id);
    panel.append.apply(panel, spec.content);
    spec.wrap.replaceWith(root);
    spec.fallback.remove();
    return { root: root, trigger: trigger, panel: panel };
  }
  /* The all-pages MENU (spec.menu = the header): the layer stack (navLayers) stays the site's and moves to the new panel; the
     header mirrors the block's state as .nav-open (the row fit and the bar's styles read it) and the button's name. */
  function menu(spec, made) {
    var header = spec.menu;
    made.panel.navLayers = spec.fallback.navLayers;
    made.panel.setAttribute('role', 'navigation'); made.panel.setAttribute('aria-label', 'Primary');
    new MutationObserver(function () {
      var open = made.root.getAttribute('data-state') === 'open';
      header.classList.toggle('nav-open', open);
      /* the "you" button's name says who and which network (js/resolvers/header.js refreshAccountNav keeps data-label) */
      made.trigger.setAttribute('aria-label', open ? 'Close your account, network and pages' : made.trigger.dataset.label || 'Open your account, network and pages');
      if (!open) made.panel.navLayers.reset();
    }).observe(made.root, { attributes: true, attributeFilter: ['data-state'] });
  }
  /* Called by the stub once this file is in; resolves to the controller { isOpen, want }. It first makes sure the page
     has the public kit (a route that lists no block scripts gets them here, in order) and Ark's popover chunk
     (js/ark/vendor/ark-kit-popover.js, 3.2 KB gz; skipped where the block is already registered: /explore, the editor's
     full kit). `ask` is what the visitor has asked for so far -- { open, intent } (intent: a resting mouse, not a
     press) -- read when the block is ready, not when it was asked for. Opening is the block button's click, closing the
     block's own `ark:close`, so Ark's state is never written around. */
  function attach(spec, ask) {
    var chain = function (urls) { return urls.reduce(function (p, url) { return p.then(function () { return ArkUI.loadScript(url); }); }, Promise.resolve()); };
    return chain(typeof ArkKit === 'undefined' ? ArkUI.blockScripts : []).then(function () {
      return chain(ArkKit.ARK_BLOCKS.popover ? [] : ['js/ark/vendor/ark-kit-popover.js']);
    }).then(function () {
      var focus = document.activeElement === spec.trigger;
      var made = parts(spec), hoverAt = ask.intent ? Date.now() : 0;
      function isOpen() { return made.root.getAttribute('data-state') === 'open'; }
      /* the press that follows a hover-open is not a second toggle */
      made.trigger.addEventListener('click', function (event) {
        if (event.isTrusted && isOpen() && hoverAt && Date.now() - hoverAt < 400) event.stopImmediatePropagation();
      }, true);
      if (spec.done) spec.done(made);
      if (spec.menu) menu(spec, made);
      if (focus) made.trigger.focus();
      if (ask.open) made.trigger.click();
      return {
        isOpen: isOpen,
        want: function (open, byHover) {
          if (open === isOpen()) return;
          if (open && byHover) hoverAt = Date.now();
          if (open) made.trigger.click();
          else made.root.dispatchEvent(new CustomEvent('ark:close'));
        }
      };
    });
  }
  return { parts: parts, attach: attach };
})();
