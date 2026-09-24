/* =====================================================================
   RESOLVER  RHEADER_V1  —  the top bar
   ---------------------------------------------------------------------
   Spans the full width of the screen (not the centred poster): logo at
   one end, navigation at the other. At compact widths the links move
   into an index panel beneath the header.

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
    identity.setAttribute('aria-label', 'Flux Protocol — home');
    var mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('class', 'ark-brand-mark');
    mark.setAttribute('viewBox', '0 0 32 32');
    mark.setAttribute('width', '32');
    mark.setAttribute('height', '32');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('focusable', 'false');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M5 4H29L25 10H11V28H5Z M15 14H25L21 20H15Z');
    mark.appendChild(path);
    identity.appendChild(mark);
    el.appendChild(identity);
    var toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.type = 'button';
    function toggleIcon(className, pathData) {
      var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', className);
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('width', '20');
      icon.setAttribute('height', '20');
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('focusable', 'false');
      var iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      iconPath.setAttribute('d', pathData);
      iconPath.setAttribute('fill', 'none');
      iconPath.setAttribute('stroke', 'currentColor');
      iconPath.setAttribute('stroke-width', '1.75');
      iconPath.setAttribute('stroke-linecap', 'round');
      iconPath.setAttribute('stroke-linejoin', 'round');
      icon.appendChild(iconPath);
      toggle.appendChild(icon);
    }
    toggleIcon('nav-icon-menu', 'M4 7h16M4 12h16M4 17h16');
    toggleIcon('nav-icon-close', 'M5 5l14 14M19 5 5 19');
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.setAttribute('title', 'Open navigation');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'primary-navigation');
    el.appendChild(toggle);
  },
  emerge: { delay: 0, dur: 400 }
});
