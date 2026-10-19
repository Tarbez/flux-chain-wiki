/* Local page dependency loading, separate from route/presence state. */
(function () {
  'use strict';
  var scripts = new Map();
  var pageAssetVersion = '20261019-ark027';
  function loadScript(url) {
    if (!/^js\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(url)) return Promise.reject(new Error('Invalid page asset'));
    if (scripts.has(url)) return scripts.get(url);
    var promise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = (location.protocol === 'file:' ? url : '/' + url) + '?v=' + pageAssetVersion; script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { scripts.delete(url); script.remove(); reject(new Error('Could not load ' + url)); };
      document.head.appendChild(script);
    });
    scripts.set(url, promise);
    return promise;
  }
  /* Ark blocks (js/ark/blocks.js) need ArkUI.blockScripts loaded before the page mounts. A page
     built from blocks lists them in its own scripts (js/pages/catalog.js); this adds them, derived
     from the data, where nothing in the code can say so: a route (or the shell, '*') holding a
     saved Ark block instance, and every route in the editor's canvas, where the Library can
     insert one anywhere. The glossary comes with them where a saved block uses it ([[term]]
     markup or a term block) and in the canvas. Other routes never pay for either. */
  function inPreview() { return typeof location !== 'undefined' && /[?&]cms-preview=1(?:&|$)/.test(location.search || ''); }
  function savedBlocks(definition) {
    if (typeof ArkComponents === 'undefined' || !ArkComponents.get) return [];
    var data = ArkComponents.get(), prefix = 'ARK_BLOCK_', out = [];
    [definition.path, ArkComponents.SHELL].forEach(function (scope) {
      var anchors = (data.routes && data.routes[scope]) || {};
      Object.keys(anchors).forEach(function (anchor) {
        (anchors[anchor] || []).forEach(function (instance) {
          var master = data.masters && data.masters[instance.masterId];
          if (master && String(master.resolver || '').indexOf(prefix) === 0) out.push({ master: master, instance: instance });
        });
      });
    });
    return out;
  }
  function blockScriptsFor(definition) {
    var preview = inPreview(), saved = preview ? [] : savedBlocks(definition);
    if (!preview && !saved.length) return [];
    var glossary = preview || saved.some(function (entry) {
      return entry.master.resolver === 'ARK_BLOCK_TERM' || JSON.stringify([entry.master.props, entry.instance.overrides]).indexOf('[[') >= 0;
    });
    return (ArkUI.blockScripts || []).concat(glossary && ArkUI.glossaryScript ? [ArkUI.glossaryScript] : []);
  }
  function needsBlocks(definition) { return blockScriptsFor(definition).length > 0; }
  async function loadPage(page, definition) {
    var urls = blockScriptsFor(definition).concat(definition.scripts);
    for (var url of urls) await loadScript(url);
    var module = ArkUI.pageModules[definition.module];
    if (!module) throw new Error('Page module missing: ' + page);
    return module;
  }
  ArkUI.loadPage = loadPage;
  ArkUI.pageNeedsBlocks = needsBlocks;
  /* One script by its site path, once (js/ark/blocks.js loads the live chunk through it). */
  ArkUI.loadScript = loadScript;
})();
