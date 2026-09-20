/* One bounded 18fps scheduler, only while route headings are transitioning.
   Generated symbols live in CSS overlays; the real text never changes. */
(function () {
  'use strict';
  var jobs = new Map(), timer = 0;
  var symbols = '01<>/[]{}+*#_';
  function finish(page) {
    var job = jobs.get(page);
    if (!job) return;
    job.glyphs.forEach(function (glyph) { glyph.removeAttribute('data-scramble'); });
    jobs.delete(page); job.resolve();
    if (!jobs.size && timer) { window.clearInterval(timer); timer = 0; }
  }
  function tick() {
    var now = performance.now();
    jobs.forEach(function (job, page) {
      var progress = Math.min(1, (now - job.start) / job.duration);
      if (progress >= 1) { finish(page); return; }
      job.glyphs.forEach(function (glyph, index) {
        var threshold = (index + 1) / job.glyphs.length;
        var scramble = job.active ? progress < .2 + threshold * .8 : progress > threshold * .7;
        if (scramble) glyph.setAttribute('data-scramble', symbols[(index * 7 + Math.floor((now - job.start) / 55)) % symbols.length]);
        else glyph.removeAttribute('data-scramble');
      });
    });
  }
  ArkUI.scrambleText = function (page, glyphs, active, immediate) {
    finish(page);
    if (immediate || !glyphs.length) return Promise.resolve();
    return new Promise(function (resolve) {
      jobs.set(page, { glyphs: glyphs.slice(0, 48), active: active, start: performance.now(), duration: active ? 1250 : 850, resolve: resolve });
      tick();
      if (!timer) timer = window.setInterval(tick, 55);
    });
  };
})();
