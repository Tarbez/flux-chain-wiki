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
     text         underscores are spaces; punctuation is written as itself

   The copy and the layout live here and only here. Change the words or the
   ring here; change how a kind of thing looks in its resolver
   (js/resolvers/); change a colour or a size in js/tokens.js.
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
  '            -L-Theory',
  '            -H-#/concept',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-Experiments',
  '            -H-#/experiments',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-About_us',
  '            -H-#/about',
  '          .',
  '      .',
  '  .',

  '-SIG-0x7F3A9C21'
].join('\n');
