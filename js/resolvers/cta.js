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
     -H- given    navigates there.
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
  base: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'max(' + Tokens.u(5.6) + ', 46px)',           /* 46px: a comfortable touch target */
    padding: '0 ' + Tokens.u(4.4),
    border: '0',
    borderRadius: '999px',
    background: 'linear-gradient(180deg,' + Tokens.v('cta-a') + ' 0%,' + Tokens.v('cta-b') + ' 100%)',
    color: Tokens.v('cta-ink'),
    font: 'inherit',
    fontSize: 'max(13px, ' + Tokens.u(1.7) + ')',
    fontWeight: '700',
    lineHeight: '1',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.95)',                            /* light catching the top edge */
      'inset 0 -1px 0 rgba(0,0,0,0.14)',                                 /* the underside               */
      '0 0 0 1px rgba(255,255,255,0.4)',                                 /* fine outline                */
      '0 ' + Tokens.u(0.6) + ' ' + Tokens.u(2.2) + ' rgba(0,0,0,0.55)'  /* sits on the ring            */
    ].join(','),
    filter: 'drop-shadow(0 0 ' + Tokens.u(2.4) + ' rgba(255,255,255,0.16))',
    transition: 'translate 220ms ease, scale 140ms ease, filter 260ms ease',
    WebkitTapHighlightColor: 'transparent',
    zIndex: '3'
  },
  style: function (p) {
    var k = ArkProps.num(p.tracking, 0.22);
    return {
      top: 'calc(' + ArkProps.num(p.position, 48) + '% + ' + Tokens.u(ArkProps.num(p.gap, 11)) + ')',
      letterSpacing: k + 'em',
      /* letter-spacing adds a gap after the last letter; pad the left to keep the word centred */
      paddingLeft: 'calc(' + Tokens.u(4.4) + ' + ' + k + 'em)'
    };
  },
  attrs: function () { return { type: 'button' }; },
  text: function (p) { return p.label || ''; },
  decorate: function (el, p) {
    el.classList.add('ark-cta');                    /* hover/active states live in Tokens.css() */
    el.addEventListener('click', function () {
      if (p.href) { window.location.assign(p.href); return; }
      document.dispatchEvent(new CustomEvent('ark:enter', { bubbles: true }));
    });
  },
  emerge: { delay: 1100, dur: 600 }
});
