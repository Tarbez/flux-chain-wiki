/* Locally tracked domain names -- a browser-side bookmark list, not an index
   the mesh can give us. The names/* registry only supports exact-name lookup
   (see ark-miner-cli/src/explorer/adapters/expanded.js: "Exact-name lookup
   until a signed name index exists."), so there is no query that returns
   "every name owned by this identity." This list just remembers which names
   this browser cares about; js/pages/account-domains.js re-verifies each one
   live against the mesh on every view, so this file never stores ownership,
   only which names to check. */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || (typeof ArkUI !== 'undefined' ? ArkUI : {});
  var ui = window.ArkUI;
  var KEY = 'defxn-local-domains-v1';
  var EVENT = 'defxn:domains-change';
  var listeners = new Set();
  var storageError = '';

  function isValidName(name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 253 && !/\s/.test(name) && /\.(fxn|ark)$/i.test(name);
  }
  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || !Array.isArray(data.names)) return [];
      return data.names.filter(isValidName);
    } catch (_) {
      storageError = 'Browser storage is unavailable. Tracked domains will only last this session.';
      return current || [];
    }
  }
  function write(names) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ version: 1, names: names })); storageError = ''; }
    catch (_) { storageError = 'Browser storage is unavailable. Tracked domains will only last this session.'; }
  }
  var current = read();
  function notify() { listeners.forEach(function (listener) { listener(current.slice()); }); }
  function publish() { window.dispatchEvent(new Event(EVENT)); }
  window.addEventListener(EVENT, function () { current = read(); notify(); });
  window.addEventListener('storage', function (event) { if (event.key === KEY || event.key === null) { current = read(); notify(); } });

  ui.localDomains = {
    list: function () { return current.slice(); },
    storageError: function () { return storageError; },
    subscribe: function (listener) { listeners.add(listener); listener(current.slice()); return function () { listeners.delete(listener); }; },
    add: function (name) {
      var clean = String(name || '').trim().toLowerCase();
      if (!isValidName(clean)) throw new Error('Enter an exact name ending in .fxn or .ark.');
      if (current.indexOf(clean) === -1) { current = current.concat(clean); write(current); publish(); }
      return clean;
    },
    remove: function (name) {
      current = current.filter(function (item) { return item !== name; });
      write(current);
      publish();
    }
  };
})();
