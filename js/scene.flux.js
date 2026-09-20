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
  '    -R-61.5pct',
  '    -N-29pct',
  '    -A-40pct',
  '    -D-720',
  '    -P-49pct',
  '  .',

  '. F-VEIL-RVEIL_V1',
  '    -B-0.5',
  '  .',

  '. F-STEP-RPILL_V1',
  '    -L-SUB',
  '    -K-0.16',
  '    -P-49pct',
  '  .',

  '. F-CTA-RCTA_V1',
  '    -L-ENTER_↘',
  '    -K-0.2',
  '    -P-49pct',
  '    -G-11',
  '  .',

  '. F-BODY-RBODY_V1',
  '    -E-SUBZERO_/_DESIGN_AND_EXPERIMENTATION',
  '    -H-BELOW_THE_SURFACE.',
  '    -T-A_place_for_meaning,_visual_experiments_and_digital_experiences_with_depth—where_form,_motion_and_interaction_become_one_language.',
  '    -S-1.42',
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
  '            -I-01',
  '            -L-Concept',
  '            -H-#concept',
  '          .',
  '        . F-LINK-RLINK_V1',
  '            -I-02',
  '            -L-Experiments',
  '            -H-#work',
  '          .',
  '      .',
  '  .',

  '-SIG-0x7F3A9C21'
].join('\n');
