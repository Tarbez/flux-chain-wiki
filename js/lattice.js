/* The clean.html block field, mounted as a persistent home-page layer. */
(function () {
  'use strict';

  var scene = document.querySelector('#scene > [data-pattern="F-SCENE-RZERO_V0"]');
  var state = window.ArkUI && ArkUI.sceneState;
  var persistent = scene && scene.querySelector('[data-ark-layer="persistent"]');
  if (!scene || !state || !persistent) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var lattice = document.createElement('div');
  lattice.className = 'lattice lattice-idle';
  lattice.setAttribute('aria-hidden', 'true');
  lattice.dataset.source = 'clean.html';

  var fallback = persistent.querySelector('canvas[role="presentation"]');
  persistent.insertBefore(lattice, fallback || null);

  var handles = ['ZERO', 'FORM', 'FIELD', 'TRACE', 'SHIFT', 'SENSE', 'MESH', 'VOID', 'LINK', 'DEPTH', 'ORBIT', 'STATE'];
  var groups = ['cyan', 'violet', 'amber', 'neutral'];
  var cellWidth = 126;
  var cellHeight = 82;
  var cells = [];
  var timer = 0;
  var observerTimer = 0;
  var lastCell = null;
  var active = false;

  function makeCell(x, y, cols, rows, index) {
    var cell = document.createElement('div');
    var group = groups[(x * 3 + y + index) % groups.length];
    var handle = handles[(x * 5 + y * 7 + index) % handles.length];
    var manifest = 'F-' + handle + '-' + String((x + 1) * 17 + (y + 1) * 11).padStart(3, '0');
    cell.className = 'lattice-cell lattice-cell-' + group;
    cell.style.setProperty('--x', x);
    cell.style.setProperty('--y', y);
    cell.style.setProperty('--delay', ((x + y) * 0.09).toFixed(2) + 's');
    cell.dataset.x = x;
    cell.dataset.y = y;
    cell.dataset.s = handle;
    cell.dataset.l = manifest;
    cell.dataset.group = group;
    cell.title = manifest;
    lattice.appendChild(cell);
    cells.push(cell);
    return cell;
  }

  function build() {
    var rect = scene.getBoundingClientRect();
    var cols = Math.max(8, Math.ceil((rect.width || window.innerWidth) / cellWidth) + 1);
    var rows = Math.max(7, Math.ceil((rect.height || window.innerHeight) / cellHeight) + 1);
    var max = 320;
    var total = Math.min(max, cols * rows);
    lattice.style.setProperty('--cols', cols);
    lattice.style.setProperty('--rows', rows);
    lattice.replaceChildren();
    cells = [];
    for (var i = 0; i < total; i++) {
      var x = i % cols;
      var y = Math.floor(i / cols);
      makeCell(x, y, cols, rows, i);
    }
  }

  function clearDim() {
    cells.forEach(function (cell) { cell.classList.remove('is-current', 'is-dim'); });
    lastCell = null;
  }

  function reveal(cell) {
    if (!active || !finePointer.matches || lastCell === cell) return;
    lastCell = cell;
    var x = Number(cell.dataset.x), y = Number(cell.dataset.y);
    cells.forEach(function (other) {
      var distance = Math.abs(Number(other.dataset.x) - x) + Math.abs(Number(other.dataset.y) - y);
      other.classList.toggle('is-current', other === cell);
      other.classList.toggle('is-dim', distance > 2);
    });
  }

  function ping() {
    if (!active || reduce.matches || document.hidden) return;
    var index = Math.floor(Math.random() * cells.length);
    var cell = cells[index];
    if (!cell) return;
    cell.classList.remove('is-ping');
    void cell.offsetWidth;
    cell.classList.add('is-ping');
    timer = window.setTimeout(ping, 1700 + Math.random() * 2600);
  }

  function observe() {
    if (!active || reduce.matches || document.hidden) return;
    lattice.style.setProperty('--observer-x', (Math.random() * 2 - 1).toFixed(2));
    lattice.style.setProperty('--observer-y', (Math.random() * 2 - 1).toFixed(2));
    observerTimer = window.setTimeout(observe, 9000 + Math.random() * 5000);
  }

  function stop() {
    window.clearTimeout(timer);
    window.clearTimeout(observerTimer);
    timer = observerTimer = 0;
  }

  function sync(current) {
    active = current.page === 'zero';
    lattice.classList.toggle('lattice-active', active);
    lattice.classList.toggle('lattice-idle', !active);
    lattice.classList.toggle('lattice-still', reduce.matches || current.paused || document.hidden);
    if (!active || reduce.matches || current.paused || document.hidden) stop();
    else {
      if (!timer) ping();
      if (!observerTimer) observe();
    }
  }

  lattice.addEventListener('pointerover', function (event) {
    var cell = event.target.closest('.lattice-cell');
    if (cell && lattice.contains(cell)) reveal(cell);
  });
  lattice.addEventListener('pointerleave', clearDim);
  document.addEventListener('visibilitychange', function () { sync(state.get()); });
  reduce.addEventListener('change', function () { sync(state.get()); });
  window.addEventListener('resize', function () { window.clearTimeout(lattice._resize); lattice._resize = window.setTimeout(build, 180); }, { passive: true });

  build();
  state.subscribe(sync);
})();
