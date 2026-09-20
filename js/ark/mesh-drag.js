/* Direct manipulation shared by the persistent form and article title anchors. */
(function () {
  'use strict';
  ArkUI.bindMeshDrag = function (element, state) {
    var drag = null;
    var page = state.get().page;
    element.tabIndex = 0;
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', 'Rotate shape. Drag to turn and tilt. Use arrow keys to rotate, Home to reset.');
    element.classList.add('mesh-drag-target');
    function stop() {
      if (!drag) return;
      var id = drag.id;
      drag = null;
      element.classList.remove('is-dragging');
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    }
    element.addEventListener('pointerdown', function (event) {
      if (drag || event.button !== 0 || event.isPrimary === false) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angles: state.get().rotation.slice(), sensitivity: 180 / Math.max(240, element.getBoundingClientRect().width) };
      element.setPointerCapture(event.pointerId);
      element.classList.add('is-dragging');
      element.focus({ preventScroll: true });
      event.preventDefault();
    });
    element.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      state.orient(drag.angles[0] - (event.clientY - drag.y) * drag.sensitivity,
        drag.angles[1] + (event.clientX - drag.x) * drag.sensitivity);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) {
      element.addEventListener(name, function (event) { if (drag && event.pointerId === drag.id) stop(); });
    });
    element.addEventListener('keydown', function (event) {
      var angles = state.get().rotation, step = event.shiftKey ? 15 : 5;
      if (event.key === 'Home') state.orient(0, 0);
      else if (event.key === 'ArrowLeft') state.orient(angles[0], angles[1] - step);
      else if (event.key === 'ArrowRight') state.orient(angles[0], angles[1] + step);
      else if (event.key === 'ArrowUp') state.orient(angles[0] + step, angles[1]);
      else if (event.key === 'ArrowDown') state.orient(angles[0] - step, angles[1]);
      else return;
      event.preventDefault();
    });
    var unsubscribe = state.subscribe(function (current) { if (page !== current.page) { page = current.page; stop(); } });
    return { cancel: stop, dispose: function () { stop(); unsubscribe(); } };
  };
})();
