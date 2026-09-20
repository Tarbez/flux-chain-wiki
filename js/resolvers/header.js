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
    zIndex: '4'
  },
  decorate: function (el) {
    el.classList.add('ark-header');
    var identity = document.createElement('a');
    identity.className = 'ark-studio-identity';
    identity.href = '#/';
    identity.dataset.sceneLink = 'zero';
    identity.setAttribute('aria-label', 'Subzero — home');
    var wordmark = document.createElement('span');
    wordmark.className = 'ark-wordmark';
    wordmark.textContent = 'SUBZERO';
    identity.appendChild(wordmark);
    var label = document.createElement('span');
    label.className = 'ark-studio-label';
    label.textContent = 'INDEPENDENT STUDIO';
    identity.appendChild(label);
    el.appendChild(identity);
  },
  emerge: { delay: 0, dur: 400 }
});
