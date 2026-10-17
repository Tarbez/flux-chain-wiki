ArkUI.pageModules.learnings = {
  mount: function (host) {
    var el = ArkUI.render('F-LEARNINGS-RLEARNINGS_V1', host);
    /* Anchor for reusable content blocks (js/content/components.js); rendering into it
       is centralized in js/main.js's onMount hook, not called here. */
    var components = ArkUI.el('div', 'learnings-components');
    components.setAttribute('data-ark-insert', 'main');
    el.appendChild(components);
    return el;
  }
};
