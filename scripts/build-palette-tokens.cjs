#!/usr/bin/env node
/* =====================================================================
   PALETTE TOKENS -- @deadark/sdk/theme -> js/content/palette-tokens.js (ArkUI.paletteTokens)
   ---------------------------------------------------------------------
     node scripts/build-palette-tokens.cjs           writes js/content/palette-tokens.js
     node scripts/build-palette-tokens.cjs --check   writes nothing; exits 1 when the module
                                                     no longer matches the installed SDK
                                                     (tests/palette-blocks.cjs runs it)

   The /palette page (js/pages/palette.js) shows every token the SDK defines. It used to
   carry its own list, and that list had already lost seven (overlay, drift, trust, live,
   role, badge, hidden). AGENTS.md ("Dead Ark UI System") makes the SDK the one source of
   the theme, so the page reads NAMES from here and VALUES from the live cascade
   (css/themes.css, which the SDK generates), and never types either.

   What is taken, all from the SDK's own exports:
     - DEADARK_COLOR_TOKEN_NAMES   every semantic colour token, in the SDK's order
     - DEADARK_FONT_TOKEN_NAMES    the three font slots (--font-<slot>)
     - DEADARK_TYPE_SCALE          the derived scale (--type-<step>); the values it
                                   holds are NOT copied: the page reads the live custom
                                   property, which the site may override
     - DEADARK_ROLE_LADDER_ROLES   the roles that have a 100..700 ladder and an ink
   A derived build output, not a store: rebuilt from the SDK, never edited.
   ===================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'content', 'palette-tokens.js');

function build() {
  const sdk = require('@deadark/sdk/theme');
  const need = ['DEADARK_COLOR_TOKEN_NAMES', 'DEADARK_FONT_TOKEN_NAMES', 'DEADARK_TYPE_SCALE', 'DEADARK_ROLE_LADDER_ROLES'];
  for (const name of need) if (!sdk[name]) throw new Error('@deadark/sdk/theme no longer exports ' + name + ': /palette cannot derive its tokens. Update this script to the SDK\'s new export, do not hand-list the tokens.');
  const tokens = {
    source: '@deadark/sdk/theme',
    colors: Array.from(sdk.DEADARK_COLOR_TOKEN_NAMES),
    fonts: Array.from(sdk.DEADARK_FONT_TOKEN_NAMES),
    scale: Object.keys(sdk.DEADARK_TYPE_SCALE),
    roles: Array.from(sdk.DEADARK_ROLE_LADDER_ROLES)
  };
  return '/* Generated from @deadark/sdk/theme by scripts/build-palette-tokens.cjs. Do not edit. */\n'
    + 'ArkUI.paletteTokens = Object.freeze(' + JSON.stringify(tokens, null, 2) + ');\n';
}

function main() {
  const text = build();
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (have !== text) { console.error('js/content/palette-tokens.js is stale against the installed @deadark/sdk. Run: node scripts/build-palette-tokens.cjs'); process.exit(1); }
    console.log('js/content/palette-tokens.js matches the installed SDK.');
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log('Wrote js/content/palette-tokens.js');
}
if (require.main === module) main();
module.exports = { build };
