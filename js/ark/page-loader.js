/* Local page dependency loading, separate from route/presence state. */
(function () {
  'use strict';
  var scripts = new Map();
  var pageAssetVersion = '20261006-system1';
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
  async function loadPage(page, definition) {
    for (var url of definition.scripts) await loadScript(url);
    var module = ArkUI.pageModules[definition.module];
    if (!module) throw new Error('Page module missing: ' + page);
    return module;
  }
  ArkUI.loadPage = loadPage;
})();
