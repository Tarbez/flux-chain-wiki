'use strict';
/* Named regressions from the 2026-10-21 ledger recheck (docs/ux-audit/ledger-recheck-2026-10-21.md, cms.md rows):
   each was still true on main 8e40c2c, each made the editor harder to read or to reach.
   - P2-8: an unstyled text's Size showed "Hero" (a <select> falls back to its first option), and the spacing
     fields mixed a lowercase "padding" box with "Margin ↑" and named no unit.
   - P2-10: Page SEO pointed to "Design → Theme & defaults", a place renamed to Site style → Search defaults;
     its description box was 11px mono, under the 12px floor, for prose.
   - P2-7: no skip link: a keyboard reached the canvas only after every header and rail control.
   (P1-2, the link refusal's pattern name and grammar, is held by tests/cms-content-lens.cjs.) */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sections = fs.readFileSync('js/admin/toolbar-sections.js', 'utf8');
assert(/ctlSelectField\(ctx, 'Size', 'textSize', \[''\]\.concat\(CMS_TYPE_SIZE_TOKENS\), \(v\) => \(v === '' \? 'As designed' : ctlLabel\(v\)\)\)/.test(sections), 'an unset text size reads "As designed", and choosing it clears the size');
assert(/ctlLabel = A\.ctlLabel/.test(sections) && /ctlLabel: ctlLabel/.test(fs.readFileSync('js/admin/controls.js', 'utf8')), 'the label helper the Size field uses is provided by controls.js');
assert(/mid\.textContent = 'Padding \(px\)'/.test(sections) && /'Margin above \(px\)', 'mt'\), ctlField\(ctx, 'Margin below \(px\)', 'mb'/.test(sections), 'the spacing fields share one naming and say their unit');
assert(!/ctlField\(ctx, 'Margin [↑↓]'/.test(sections), 'no arrow-only margin labels');
/* js/content/layout.js keeps only a known size, so the blank option is an unset, never a stray value */
assert(/var textSize = oneOf\(frame\.textSize, TYPE_SIZE_TOKENS\); if \(textSize\) out\.textSize = textSize;/.test(fs.readFileSync('js/content/layout.js', 'utf8')), 'a blank size is dropped by the layout sanitizer');

const seo = fs.readFileSync('js/admin/seo.js', 'utf8');
assert(seo.includes('are in Site style \\u2192 Search defaults.') && !seo.includes('are in Design \\u2192 Theme & defaults'), 'Page SEO names the place the site-wide settings are now');
assert(/label: 'Search defaults'/.test(fs.readFileSync('js/admin/design.js', 'utf8')), 'Site style really has a Search defaults tab');
const embed = fs.readFileSync('css/studio-embed.css', 'utf8');
const textarea = /#studioRoot \.pop textarea \{[^}]*font: 400 (\d+)px\/[\d.]+ var\(--(\w+)\)/.exec(embed);
assert(textarea && Number(textarea[1]) >= 12 && textarea[2] === 'sans', 'a popover text box is sans at the 12px floor or above');
assert(/#studioRoot \.pop textarea\.code-view \{[^}]*var\(--mono\)/.test(embed), 'a code view keeps mono');

const app = fs.readFileSync('admin-app.html', 'utf8');
const body = app.slice(app.indexOf('<body>'));
const firstFocusable = /<(a|button|input|select|textarea)\b[^>]*>/.exec(body.replace(/<!--[\s\S]*?-->/g, ''));
assert(firstFocusable && /class="cms-skip" href="#canvasWrap"/.test(firstFocusable[0]), 'the first focusable element of the editor is the skip link to the canvas');
assert(/<main class="canvas-wrap" id="canvasWrap" tabindex="-1">/.test(app), 'the skip target can take focus');
assert(/\.cms-skip:focus \{ top: 12px; \}/.test(embed), 'the skip link shows when it has focus');

console.log('PASS: the editor says "As designed" for an unset size, names spacing units, points Page SEO to Site style, reads prose at 12px+, and has a skip link.');
