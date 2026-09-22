/* =====================================================================
   IMAGE ASSETS
   ---------------------------------------------------------------------
   Small raster images the WebGL scene reads by id (for example the
   concept page's iceberg blocks, js/halo/image-shape.js). Edit them in
   admin.html; a hand edit of js/content/assets/<id>.js works too, as
   long as the object stays valid JSON. An asset carries its own bytes
   (base64), so it round-trips through the same .flx archive as
   manifests and articles instead of needing a separate file upload path.
   ===================================================================== */
var ArkAsset = (function () {
  'use strict';

  var ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  var MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  var MAX_BYTES = 3 * 1024 * 1024; // decoded; generous for a real photo, and matched by scripts/publish-host.mjs MAX_BODY (raised with it)
  var assets = [];

  function decodedLength(base64) { return Math.floor((base64 || '').replace(/=+$/, '').length * 3 / 4); }

  function sizeLabel(bytes){return bytes>=1048576?Math.round(bytes/1048576)+'MB':Math.floor(bytes/1024)+'KB'}

  function problems(a) {
    var out = [];
    if (!a || typeof a !== 'object') return ['an asset is an object'];
    if (!ID.test(a.id || '')) out.push('id must be lowercase letters, digits and hyphens, starting with a letter');
    if (typeof a.label !== 'string' || !a.label) out.push('label is missing');
    if (MIME.indexOf(a.mime) < 0) out.push('mime must be one of ' + MIME.join(', '));
    if (typeof a.dataBase64 !== 'string' || !a.dataBase64) out.push('dataBase64 is missing');
    else if (!/^[A-Za-z0-9+/]+=*$/.test(a.dataBase64)) out.push('dataBase64 is not base64');
    else if (decodedLength(a.dataBase64) > MAX_BYTES) out.push('the image is larger than ' + sizeLabel(MAX_BYTES) + '; use a smaller file');
    return out;
  }

  function define(a) {
    var bad = problems(a);
    if (bad.length) throw new Error('ArkAsset: ' + (a && a.id) + ': ' + bad.join('; '));
    var at = assets.findIndex(function (p) { return p.id === a.id; });
    if (at < 0) assets.push(a); else assets[at] = a;
    return a;
  }

  function get(id) { return assets.find(function (a) { return a.id === id; }); }
  function all() { return assets.slice(); }
  function remove(id) { assets = assets.filter(function (a) { return a.id !== id; }); }

  /* the value an <img src> or CSS url() can use directly */
  function dataUrl(id) {
    var a = get(id);
    return a ? 'data:' + a.mime + ';base64,' + a.dataBase64 : null;
  }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(a) {
    return '/* One image asset\'s bytes. Edit it in admin.html: this file is not meant for hand editing. */\n' +
      'ArkAsset.define(' + JSON.stringify(a, null, 2) + ');\n';
  }

  return { define: define, get: get, all: all, remove: remove, dataUrl: dataUrl,
           problems: problems, serialize: serialize, mimeTypes: MIME, maxBytes: MAX_BYTES, sizeLabel: sizeLabel };
})();
