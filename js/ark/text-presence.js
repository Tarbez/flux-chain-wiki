/* Text stays semantic and in its original layout. Bounded transform/opacity effects avoid
   repainting masks over hundreds of rotating letters; ARK owns timing and cancellation. */
(function () {
  'use strict';
  var running = new WeakMap();
  var selector = 'h1,h2,h3,p,.ark-hero-eyebrow,.learning-eyebrow,.learning-read,.article-back';
  function letters(el) {
    if (!el.matches('h1,h2')) return [];
    if (!el.dataset.rotationPrepared && el.textContent.length <= 120) {
      var text = el.textContent;
      el.setAttribute('aria-label', text);
      var walker = document.createTreeWalker(el, 4);
      var nodes = [], node;
      while ((node = walker.nextNode())) nodes.push(node);
      nodes.forEach(function (source) {
      var fragment = document.createDocumentFragment();
      source.textContent.split(/(\s+)/).forEach(function (word) {
        if (/^\s+$/.test(word)) { fragment.appendChild(document.createTextNode(word)); return; }
        var group = document.createElement('span');
        group.className = 'reveal-word';
        Array.from(word).forEach(function (letter) {
          var glyph = document.createElement('span');
          glyph.className = 'reveal-letter'; glyph.textContent = letter;
          glyph.setAttribute('aria-hidden', 'true');
          group.appendChild(glyph);
        });
        fragment.appendChild(group);
      });
      source.replaceWith(fragment);
      });
      el.dataset.rotationPrepared = 'true';
    }
    return Array.from(el.querySelectorAll('.reveal-letter'));
  }
  ArkUI.createTextPresence = function () {
    var engine = new ArkEngines.FluxAnimate({ observeMutations: false });
    return function (page, active, immediate, wasHidden) {
      var bounds = page.getBoundingClientRect();
      var targets = Array.from(page.querySelectorAll(selector)).filter(function (el) {
        if (el.closest('[data-mesh-anchor]') || el.querySelector(selector)) return false;
        var rect = el.getBoundingClientRect();
        return rect.width && rect.height && rect.bottom > bounds.top && rect.top < bounds.bottom;
      });
      // Bound compositor layers and do every style read before starting animations.
      targets = targets.slice(0, 12);
      var heading = targets.find(function (el) { return el.matches('h1,h2'); });
      var glyphs = heading ? letters(heading).slice(0, 48) : [];
      var scrambleJob = ArkUI.scrambleText ? ArkUI.scrambleText(page, glyphs, active, immediate) : Promise.resolve();
      var jobs = targets.map(function (el, index) { return { el: el, index: index, glyph: false }; })
        .concat(glyphs.map(function (el, index) { return { el: el, index: index, glyph: true }; }));
      jobs.forEach(function (item) {
        var style = getComputedStyle(item.el);
        item.pose = style.transform; item.opacity = style.opacity;
        item.before = item.el.getAnimations();
      });
      return Promise.all([scrambleJob].concat(jobs.map(function (item) {
        var el = item.el, index = item.index;
        var previous = running.get(el);
        if (previous) previous.forEach(function (animation) { animation.cancel(); });
        if (immediate) { running.delete(el); return Promise.resolve(); }
        var frames;
        if (item.glyph) {
          var folded = 'perspective(500px) rotateX(65deg) rotateZ(' + (index % 2 ? 28 : -28) + 'deg)';
          frames = [
            { offset: 0, transform: wasHidden ? folded : item.pose },
            { offset: .32, transform: active ? folded : item.pose },
            { transform: active ? 'perspective(500px) rotateX(0deg) rotateZ(0deg)' : folded }
          ];
        } else {
          // Transform/opacity only: no animated polygon masks over rotating glyphs.
          frames = [
            { offset: 0, opacity: wasHidden ? '0' : item.opacity, transform: wasHidden ? 'translateX(-5px)' : item.pose },
            { offset: .2, opacity: active ? '.85' : '.95', transform: 'translateX(3px)' },
            { offset: .4, opacity: active ? '.7' : '.6', transform: 'translateX(-1px)' },
            { offset: 1, opacity: active ? '1' : '0', transform: active ? 'translateX(0)' : 'translateX(-7px)' }
          ];
        }
        var job = engine.play(el, frames, { duration: active ? 1400 : 900,
          delay: Math.min(index, item.glyph ? 20 : 7) * (item.glyph ? 10 : active ? 32 : 20),
          fill: 'both', easing: 'cubic-bezier(.2,.72,.2,1)' }, false);
        var owned = el.getAnimations().filter(function (animation) { return item.before.indexOf(animation) < 0; });
        running.set(el, owned);
        return job.then(function () {
          if (active && running.get(el) === owned) {
            owned.forEach(function (animation) { animation.cancel(); }); running.delete(el);
          }
        }).catch(function (error) { if (error.name !== 'AbortError') throw error; });
      })));
    };
  };
})();
