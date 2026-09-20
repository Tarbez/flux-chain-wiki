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

  '. F-HALO-RRING_V1',
  '    -R-44.52pct',
  '    -N-20.96pct',
  '    -A-40pct',
  '    -D-520',
  '    -P-48pct',
  '  .',

  '. F-VEIL-RVEIL_V1',
  '    -B-0.5',
  '  .',

  '. F-STEP-RPILL_V1',
  '    -L-SUB',
  '    -K-0.16',
  '    -P-48pct',
  '  .',

  '. F-CTA-RCTA_V1',
  '    -L-ENTER',
  '    -K-0.22',
  '    -P-48pct',
  '    -G-11',
  '  .',

  '. F-BODY-RBODY_V1',
  '    -E-Concept_of_subzero_>_Sub_>_ZERO',
  '    -T-Below_the_visual_architecture_of_meaning_and_design._Building_truly_rich_experiences.',
  '    -S-1.98',
  '    -P-48pct',
  '    -G-30.5',
  '  .',

  '. F-HEADER-RHEADER_V1',
  '    . F-LOGO-RLOGO_V1',
  '        -A-SUB',
  '        -B-ZERO',
  '        -H-#',
  '      .',
  '    . F-NAV-RNAV_V1',
  '        . F-LINK-RLINK_V1',
  '            -L-Concept',
  '            -H-#concept',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-Work',
  '            -H-#work',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -L-Contact',
  '            -H-#contact',
  '          .',
  '      .',
  '  .',

  '-SIG-0x7F3A9C21'
].join('\n');
