/* =====================================================================
   RESOLVER  RHEADER_V1  —  the top bar
   ---------------------------------------------------------------------
   Spans the full width of the screen (not the centred poster): logo at
   one end, navigation at the other. If they do not fit side by side, the
   navigation wraps underneath rather than overflowing.

   Its padding follows the smaller screen dimension, with a 20px floor.
   ===================================================================== */
ArkUI.register('RHEADER_V1', {
  tag: 'header',
  base: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px ' + Tokens.u(3),
    padding: 'max(18px, 2.35cqmin) max(20px, 2.8cqmin)',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    zIndex: '4'
  },
  decorate: function (el) {
    el.classList.add('ark-header');
    var status = document.createElement('span');
    status.className = 'ark-live-status';
    status.setAttribute('aria-label', 'Subzero field is live');
    status.innerHTML = '<i aria-hidden="true"></i><span>FIELD 001</span><b>LIVE</b>';
    el.appendChild(status);
  },
  emerge: { delay: 1500, dur: 600 }
});
