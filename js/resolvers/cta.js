/* =====================================================================
   RESOLVER  RCTA_V1  —  the call to action ("ENTER")
   ---------------------------------------------------------------------
   The one primary action on the page, so it is the one solid, bright
   thing in a scene of greys: a soft white pill, lit from above, with a
   fine outline, a faint halo and a drop shadow so it sits on the ring
   instead of pasted over it. It has no arrow.

   Hover lifts it a pixel and widens the halo; pressing settles it back and
   shrinks it slightly. Those states live in Tokens.css() (individual
   `translate`/`scale` properties, so they never fight the centring
   transform). Reduced-motion turns the transitions off.

   Where it goes is not decided yet, so it does one of two things:
     -H- given    navigates there, but only within this site: a hash route (#/...)
                  or a same-origin path (/...). Anything else, such as javascript:,
                  data:, //host or https://..., is refused and does nothing, so copy
                  can never turn this button into a script URL or an open redirect.
     -H- absent   fires a bubbling `ark:enter` event on the document, so
                  the destination can be wired without touching this file:

                    document.addEventListener('ark:enter', function () { … });

   Flux props:
     -L-  label
     -K-  letter-spacing in em                     (0.22)
     -H-  optional destination URL
     -P-  anchor: the pill's vertical centre, %    (48pct)
     -G-  distance below that anchor, in u         (11)
   ===================================================================== */
ArkUI.register('RCTA_V1', {
  tag: 'button',
  schema: { L: 'label', K: 'tracking', H: 'href', P: 'position', G: 'gap' },
  copy: ['label'],
  base: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'max(' + Tokens.u(5.2) + ', 48px)',
    padding: '0 3px',
    border: '0',
    borderBottom: '1px solid rgba(255,255,255,0.38)',
    borderRadius: '0',
    background: 'transparent',
    color: Tokens.v('ink'),
    font: 'inherit',
    fontSize: 'max(11px, ' + Tokens.u(1.12) + ')',
    fontWeight: '500',
    lineHeight: '1',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    boxShadow: 'none',
    filter: 'none',
    transition: 'color 220ms ease, border-color 220ms ease, letter-spacing 260ms ease',
    WebkitTapHighlightColor: 'transparent',
    zIndex: '3'
  },
  style: function (p) {
    var k = ArkProps.num(p.tracking, 0.22);
    return {
      top: 'calc(' + ArkProps.num(p.position, 48) + '% + ' + Tokens.u(ArkProps.num(p.gap, 11)) + ')',
      letterSpacing: k + 'em',
      /* letter-spacing adds a gap after the last letter; pad the left to keep the word centred */
      paddingLeft: 'calc(3px + ' + k + 'em)'
    };
  },
  attrs: function () { return { type: 'button' }; },
  text: function (p) { return p.label || ''; },
  decorate: function (el, p) {
    el.classList.add('ark-cta');                    /* hover/active states live in Tokens.css() */
    el.addEventListener('click', function () {
      if (p.href) { if (ArkProps.isSiteHref(p.href)) window.location.assign(p.href); return; }
      document.dispatchEvent(new CustomEvent('ark:enter', { bubbles: true }));
    });
  },
  emerge: { delay: 1100, dur: 600 }
});
