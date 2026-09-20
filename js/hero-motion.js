(function () {
  'use strict';

  var scene = document.querySelector('#scene > [data-pattern="F-SCENE-RZERO_V0"]');
  if (!scene) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var paused = false;
  var visible = true;
  var frame = 0;
  var pointer = null;

  function make(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /* Background 001 / Tide. The values mirror the source example. */
  var shapes = [
    [8,12,42,'#76d7d3',1.4,-18], [32,20,34,'#d6ece6',1.15,28],
    [72,10,48,'#113348',1.5,-12], [96,28,38,'#46aab1',.72,22],
    [18,70,46,'#0f4654',1.35,12], [48,58,28,'#9edbd4',1.75,-38],
    [76,76,52,'#061927',1.2,18], [102,84,32,'#d7e8e3',.82,-20],
    [42,104,44,'#2b7680',1.4,8]
  ];
  var extras = [
    [-8,45,30,'#d8eeea',.7,30], [62,108,48,'#0c3748',1.6,-10],
    [108,-6,36,'#6cc9c4',.8,35]
  ];

  function addShape(layer, values) {
    var shape = make('i', 'hero-atmosphere__shape');
    shape.style.setProperty('--x', values[0] + '%');
    shape.style.setProperty('--y', values[1] + '%');
    shape.style.setProperty('--size', values[2] + 'vmax');
    shape.style.setProperty('--color', values[3]);
    shape.style.setProperty('--aspect', values[4]);
    shape.style.setProperty('--rotation', values[5] + 'deg');
    shape.style.setProperty('--opacity', values[6] === undefined ? 1 : values[6]);
    layer.appendChild(shape);
  }

  var atmosphere = make('div', 'hero-atmosphere');
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.dataset.source = 'ark-background-001-tide';
  var sub = make('div', 'hero-atmosphere__layer hero-atmosphere__sub');
  var base = make('div', 'hero-atmosphere__layer hero-atmosphere__base');
  shapes.forEach(function (shape) {
    addShape(sub, shape);
    addShape(base, shape);
  });
  extras.forEach(function (shape) { addShape(base, shape); });
  atmosphere.appendChild(sub);
  atmosphere.appendChild(base);
  atmosphere.appendChild(make('div', 'hero-atmosphere__fill'));
  scene.insertBefore(atmosphere, scene.firstChild);

  var toggle = make('button', 'hero-motion-toggle');
  toggle.type = 'button';
  scene.appendChild(toggle);
  scene.classList.add('hero-alive');

  function enabled() { return !paused && !reduced.matches && visible && !document.hidden; }

  function resetPointer() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    scene.style.removeProperty('--hero-x');
    scene.style.removeProperty('--hero-y');
  }

  function sync() {
    scene.classList.toggle('hero-still', !enabled());
    toggle.hidden = reduced.matches;
    toggle.textContent = paused ? 'Motion / off' : 'Motion / on';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume hero animation' : 'Pause hero animation');
    if (!enabled() || !finePointer.matches) resetPointer();
  }

  toggle.addEventListener('click', function () {
    paused = !paused;
    sync();
  });
  reduced.addEventListener('change', sync);
  finePointer.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);

  scene.addEventListener('pointermove', function (event) {
    if (!enabled() || !finePointer.matches || event.pointerType !== 'mouse') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      if (!pointer || !enabled()) return;
      var rect = scene.getBoundingClientRect();
      var x = Math.max(-1, Math.min(1, (pointer.x - rect.left) / rect.width * 2 - 1));
      var y = Math.max(-1, Math.min(1, (pointer.y - rect.top) / rect.height * 2 - 1));
      scene.style.setProperty('--hero-x', (x * 5).toFixed(2) + 'px');
      scene.style.setProperty('--hero-y', (y * 3).toFixed(2) + 'px');
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', resetPointer);

  if ('IntersectionObserver' in window) {
    var observer = new window.IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    observer.observe(scene);
  }

  sync();
})();
