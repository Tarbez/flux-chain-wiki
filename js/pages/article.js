ArkUI.pageModules.article = {
  mount: function (host, page) {
    var el = ArkUI.render('F-ARTICLE-RARTICLE_V1\n-S-' + page.slice(8), host);
    /* Anchor for reusable content blocks (js/content/components.js); rendering into it
       is centralized in js/main.js's onMount hook, not called here. */
    var components = ArkUI.el('div', 'article-components');
    components.setAttribute('data-ark-insert', 'main');
    el.appendChild(components);
    return el;
  }
};
