/* A title is a stencil, not a hard-coded model. The ordinary article heading
   remains available if Canvas2D or WebGL cannot render this decoration. */
var WordGeometry = (function () {
  'use strict';
  function normalize(text) { return String(text || '').trim().replace(/\s+/g, ' ').slice(0, 72) || 'LEARN'; }
  function create(text, count) {
    var canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 500;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    text = normalize(text).toUpperCase();
    var fontSize = 128, lines;
    function wrap() {
      ctx.font = '500 ' + fontSize + 'px "Albert Sans", Arial, sans-serif';
      var result = [], line = '';
      // Character wrapping also bounds a single long word.
      Array.from(text).forEach(function (letter) {
        if (ctx.measureText(line + letter).width > 840 && line) {
          var split = line.lastIndexOf(' ');
          if (split > line.length / 2) { result.push(line.slice(0, split)); line = line.slice(split + 1) + letter; }
          else { result.push(line); line = letter; }
        } else line += letter;
      });
      if (line.trim()) result.push(line.trim());
      return result;
    }
    do { lines = wrap(); if (lines.length * fontSize * 1.14 <= 400) break; fontSize -= 4; } while (fontSize > 36);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach(function (line, i) { ctx.fillText(line, 480, 250 + (i - (lines.length - 1) / 2) * fontSize * 1.14); });
    var pixels = ctx.getImageData(0, 0, 960, 500).data, filled = [];
    for (var y = 0; y < 500; y += 2) for (var x = 0; x < 960; x += 2) {
      if (pixels[(y * 960 + x) * 4 + 3] > 100) filled.push([x, y]);
    }
    if (!filled.length) return null;
    var result = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var sample = filled[Math.floor(((i * .61803398875) % 1) * filled.length)];
      result[i * 3] = (sample[0] - 480) / 480;
      result[i * 3 + 1] = (250 - sample[1]) / 480;
      result[i * 3 + 2] = (((i * .754877666) % 1) - .5) * .10;
    }
    return result;
  }
  return { create: create, normalize: normalize };
})();
