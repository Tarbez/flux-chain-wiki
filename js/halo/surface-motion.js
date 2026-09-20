/* One timeline for the underlying mesh. The renderer supplies its pausable clock. */
var SurfaceMotion = Object.freeze({
  names: Object.freeze(['full', 'inside', 'full-screen']),
  // Depth, spread, tilt, horizontal bias, foreground-zero mask.
  forPage: function (page) {
    if (page.indexOf('article/') === 0) return [-1.25, .32, -.10, 1.5, 0, 0,0,0,0,0,1];
    var profiles = {
      zero: [0, 1, 0, 0, 1, 0,0,0,0,0,0],
      proximity: [-.55, .48, .18, 1.25, 0, 1,0,0,0,0,0],
      lab: [-.85, .40, .28, 1.4, 0, 0,1,0,0,0,0],
      learnings: [-1.0, .38, -.16, 1.45, 0, 0,0,1,0,0,0],
      concept: [-.40, .42, -.12, 1.35, 0, 0,0,0,1,0,0],
      about: [-.65, .38, .12, 1.4, 0, 0,0,0,0,1,0]
    };
    return (Object.prototype.hasOwnProperty.call(profiles, page) ? profiles[page] : profiles.zero).slice();
  },
  sample: function (seconds) {
    var phase = Math.max(0, seconds) / 8;
    var current = Math.floor(phase) % 3;
    // Two seconds of fast travel, three of settling, three fully still.
    var local = (phase % 1) * 8;
    var t = Math.min(1, local / 5);
    var blend = 1 - Math.pow(1 - t, 3);
    var weights = [0, 0, 0, 0];
    var slots = [0, 2, 3];
    weights[slots[current]] = 1 - blend;
    weights[slots[(current + 1) % 3]] += blend;
    return { name: this.names[current], weights: weights, stage: local < 2 ? 'fast' : local < 5 ? 'slow' : 'pause', time: Math.floor(phase) * 5 + blend * 5 };
  }
});
