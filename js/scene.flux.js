/* =====================================================================
   THE DENSE FLUX PATTERN
   ---------------------------------------------------------------------
   This is the entire scene. Everything on screen is a fence inside it, and
   every number in it is in the poster's own units:

     lengths      1s / 1u = 1% of the poster width  (see js/tokens.js)
     positions    % of the stage height. The ring and the pill are placed by
                  their centre; the CTA and the copy block hang
                  from the pill (-P- is the pill's centre, -G- the gap below
                  it in u)
     colours      hex without '#'
     copy         a key (NAV.THEORY), never words. The words are in js/content/copy.js;
                  a resolver lists which of its props are copy, and the runtime
                  swaps the key for the words. Words written here are refused.

   The layout lives here and only here. Change the words in js/content/copy.js;
   change the ring or the arrangement here; change how a kind of thing looks
   in its resolver (js/resolvers/); change a colour or a size in js/tokens.js.
   ===================================================================== */
var F_SCENE_RZERO_V0 = [
  'F-SCENE-RZERO_V0',
  '-S-PROD',
  '-CX-fullscreen_black',

  '. F-PERSISTENT-RLAYER_V1',
  '    -N-persistent',
  '. F-HALO-RRING_V1',
  '    -R-61.5pct',
  '    -N-29pct',
  '    -A-16pct',
  '    -D-320',
  '    -P-49pct',
  '  .',

  '  .',

  '. F-OUTLET-RLAYER_V1',
  '    -N-outlet',
  '  .',

  '. F-HEADER-RHEADER_V1',
  '    . F-NAV-RNAV_V1',
  '        . F-LINK-RLINK_V1',
  '            -L-NAV.THEORY',
  '            -H-#/concept',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-NAV.EXPERIMENTS',
  '            -H-#/experiments',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-NAV.ABOUT',
  '            -H-#/about',
  '          .',
   '        . F-LINK-RLINK_V1',
  '            -L-NAV.WORK',
  '            -H-#/experiments/lab',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-NAV.DEPLOY',
  '            -H-#/deploy',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-NAV.DAO',
  '            -H-#/dao',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-NAV.DOWNLOAD',
  '            -H-#/download',
  '          .',
  '      .',
  '  .',

  '-SIG-0x7F3A9C21'
].join('\n');
