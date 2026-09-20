/* Original filament geometry, inspired by Blurry's line-sampling approach.
   Three folded ribbons share a centre but separate in depth. Stable particle
   identities allow the persistent zero to morph without swapping canvases. */
var ProximityGeometry = (function () {
  'use strict';
  function point(t, band, strand) {
    var phase = band * Math.PI * 2 / 3;
    var across = (strand / 23 - .5) * .19;
    var twist = t * 3 + phase;
    var radius = .56 + .17 * Math.cos(t * 3) + (band - 1) * .045 + across * Math.cos(twist);
    return [
      Math.cos(t * 2) * radius,
      Math.sin(t * 2) * radius * 1.2,
      .34 * Math.sin(t * 3) + across * Math.sin(twist) + (band - 1) * .09
    ];
  }
  function create() {
    var segments = [], total = 0;
    for (var band = 0; band < 3; band++) {
      for (var strand = 0; strand < 24; strand++) {
        var previous = point(0, band, strand);
        for (var step = 1; step <= 128; step++) {
          var next = point(step / 128 * Math.PI * 2, band, strand);
          var length = Math.hypot(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]);
          total += length;
          segments.push({ a: previous, b: next, end: total, length: length });
          previous = next;
        }
      }
    }
    return {
      sample: function (fraction) {
        var distance = Math.max(0, Math.min(1, fraction)) * total;
        var lo = 0, hi = segments.length - 1;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (segments[mid].end < distance) lo = mid + 1; else hi = mid; }
        var segment = segments[lo];
        var t = (distance - segment.end + segment.length) / segment.length;
        return segment.a.map(function (value, axis) { return value + (segment.b[axis] - value) * t; });
      },
      segments: segments.length
    };
  }
  return { create: create, point: point };
})();
