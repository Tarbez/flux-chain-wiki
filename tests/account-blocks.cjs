'use strict';
/* run-tests-timeout-ms: 600000 -- two jsdom boots and two server renders. Run alone (owner test law). */
/* /account as a page of Ark blocks (DEFXN polish Wave 4, W4-S2, js/pages/account.js).

   Named regressions it holds:
   - /account had TWO H1-scale headings (the h1 "Your keys. Your world." and an h2 "Choose your Auth
     Kit." the same size) and "Auth Kit" / "Ghost ID" / "Root key" with no explanation
     (docs/ux-audit/ledger.md). It has ONE h1 now ("Sign in to DEFXN"), no heading beside it, and the
     jargon is explained where it first appears: the "What is an Auth Kit?" disclosure and the
     "Developer details" disclosure (which names the Ghost ID and the root key).
   - Its tabs were two hand-built strips with different ARIA models (role=tab buttons; aria-pressed
     buttons). They are Ark tabs: one model, arrow keys, Home and End (tests/browser/account-flows.mjs
     checks the keys in a real browser).
   - The page was one 1126-line innerHTML string. The parts Ark has a block for are blocks (hero, figure,
     facts, tabs, stats, actions, disclosure, callout); the rest are small hand-built views because Ark
     has no field / form / list block -- and none of them is a lookalike of an Ark block.
   - Credits has no ledger: it is Ark's "Not built yet" stat state, never "Coming soon" and never 0.
   - Saved CMS data is never rewritten: every old layout key still lands, or is reshaped (pinned to its
     successor) or retired below with the reason (tests/lib/converted-page.cjs against the frozen census
     tests/fixtures/layout-keys/account.tsv). The pins for a signed-in page are checked by
     tests/account-session.cjs (the server render is always signed out).
   - Every view stays in the page in every state (hidden until its tab exists), as the hand-built page kept
     every panel, so a saved edit on the Wallet panel lands once the person is signed in.
   - The two ways on (bundle deployer, domains) were display:none while signed out; they are links on
     every state now. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const converted = require('./lib/converted-page.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const reshaped = [
  /* journey audit 2026-10-24: these elements keep their keys and now say FXN ID (see reworded) */
  [/^page:\/div:1\/header:1\/div:1\/svg:1(\/text:2)?$/, 'the map\'s node and label read FXN ID; the key stays on them'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:1\/div:1\/section:1\/div:1\/p:1$/, 'the bundle\'s file line says FXN ID file (.auth.fxn)'],
  [/^page:\/div:1\/section:1\/section:1\/div:2\/(h2|p):1$/, 'the create callout says "Create your FXN ID." and what the person gets'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:2\/p:2$/, 'the public-key hint says FXN ID file'],
  [/^page:\/div:1\/section:1\/section:3\/div:1\/p:1$/, 'the contacts empty state says FXN ID file'],
  [/^page:\/div:1$/, 'the dashboard shell: the same grid (identity | card, rail underneath), now holding blocks'],
  [/^page:\/div:1\/header:1$/, 'the identity column: the hero, the map figure and the identity details'],
  [/^page:\/div:1\/header:1\/div:1$/, 'the map is Ark\'s figure, with a caption that says what it shows'],
  [/^page:\/div:1\/header:1\/p:1$/, 'the kicker "DEFXN / Your identity" is the hero\'s eyebrow, "Your identity"'],
  [/^page:\/div:1\/header:1\/div:2$/, 'the profile (avatar, heading, status) is the hero block: the heading, its lede and its status'],
  [/^id:account-title$/, 'the page\'s one h1 now says what to do: "Sign in to DEFXN" (the name of the person once signed in)'],
  [/^page:\/div:1\/header:1\/p:2$/, 'the intro is the hero\'s lede, and says what an Auth Kit is'],
  [/^page:\/div:1\/header:1\/section:1(\/dl:1(\/div:\d(\/(dt|dd|button):1)?)?)?$/, 'the identity details are Ark\'s facts, in plain words: "Ghost ID" is "Identity ID", "Root key" is "Public root key" (under Developer details, which also names the Ghost ID), "Security" is "Security level"; an unset value reads "Not recorded"; the copy buttons are Ark\'s actions, named for what they copy'],
  [/^page:\/div:1\/section:1$/, 'the card holds Ark tabs; the views are its panels'],
  [/^page:\/div:1\/section:1\/section:1$/, 'the session view: the sign-in panel, what an Auth Kit is, the two ways on'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/(h2|p):1$/, 'the heading and sentence above the sign-in are one callout (the tab names the view; a second title as big as the page\'s was the defect); it says what waits on the person'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:1(\/div:1(\/section:1(\/div:1(\/form:1(\/div:1(\/button:1)?)?)?)?)?)?$/, 'the Auth Kit module\'s own sign-in panel keeps its keys; its button reads "Sign in with your Auth Kit" now ("Select your Auth Kit" once an identity is saved), so the words of it and of what contains it changed'],
  [/^page:\/div:1\/section:1\/section:1\/div:2$/, 'the create view: its heading and sentence are one callout'],
  [/^page:\/div:1\/section:1\/section:2$/, 'the wallet view: balances are Ark\'s stats'],
  [/^page:\/div:1\/section:1\/section:2\/div:1(\/div:1(\/article:[12](\/strong:1)?)?)?$/, 'the balances are Ark\'s stats: an absent FXN balance reads "No reading" with its cause, Credits reads "Not built yet" (it was "Coming soon"); neither is ever painted as 0'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:2(\/p:1(\/span:1\/small:1|\/button:1)?)?$/, 'the public key is Ark\'s fact ("Your public key"; "Not recorded" until the key is known); its Copy button is Ark\'s action "Copy public key"'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:3$/, 'Send FXN and Refresh are Ark\'s actions, with "Copy public key"'],
  [/^page:\/div:1\/section:1\/section:4(\/div:1)?$/, 'the network view: the status tiles are Ark\'s stats; "Verify identity" is Ark\'s action after them'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:2$/, 'the two ways on and "Open publishing" are Ark\'s actions, with the publishing status line after them'],
  [/^page:\/div:1\/section:1\/section:2\/form:1(\/label:[12])?$/, 'the send form is Ark\'s form: its fields are labelled "Required", and a zero or fractional amount is refused in the field\'s own slot'],
  [/^page:\/div:1\/section:1\/section:3(\/div:1(\/(form:1(\/label:1)?|ul:1))?)?$/, 'the contacts search is Ark\'s form ("Find an identity", Required, Search) and the lists are Ark\'s list, each with an empty state that says why'],
  [/^page:\/div:1\/section:1\/section:3\/article:1(\/dl:1(\/div:\d(\/dd:1)?)?)?$/, 'the contact\'s details are Ark\'s facts: an unset value reads "Not recorded" / "Not published" / "Not reported"; the back button and the explorer link are Ark\'s actions'],
  [/^page:\/div:1\/section:1\/section:5(\/ul:1|\/form:[12](\/label:1|\/div:1)?)?$/, 'the signing-wallet list and the two forms are Ark\'s list and forms (the PIN and password pair stays hand-built: Ark\'s field has no password kind)'],
  [/^page:\/div:1\/aside:1(\/button:[1-4](\/strong:1)?|\/a:2)?$/, 'the rail\'s tiles are Ark\'s interactive stats: an unread number reads "No reading" with why, Credits reads "Not built yet" (it was "Coming soon"), and the explorer link is Ark\'s action']
];
const retired = [
  [/^page:\/div:1\/header:1\/div:2\/div:[12]$/, 'the avatar tile (initials, decoration) and the heading wrapper; the hero carries the name'],
  [/^page:\/div:1\/header:1\/div:2\/div:2\/h1:1\/span:[12]$/, 'the two-tone spans of "Your keys. Your world."; the h1 is one line'],
  [/^page:\/div:1\/header:1\/div:2\/div:2\/span:1$/, 'the status line is the hero\'s "Status" detail (it reads "Signed out" signed out)'],
  [/^page:\/div:1\/header:1\/section:1\/p:1$/, 'the verification line is the hero\'s "Verification" detail, shown once there is an identity'],
  [/^page:\/div:1\/section:1\/p:1$/, 'the card caption "DEFXN / Account" repeated the tabs'],
  [/^page:\/div:1\/section:1\/nav:1(\/button:\d)?$/, 'the account tab strip and its five buttons: Ark\'s tab list is pinned to them once the person is signed in (tests/account-session.cjs); signed out, the card has the sign-in / create pair, pinned to its old strip'],
  [/^page:\/div:1\/section:1\/section:1\/div:1$/, 'the session body\'s wrapper; its parts are the callout, the sign-in panel, the notices and the ways on'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/p:3$/, 'the empty notice line; the mesh-authentication notice is a callout inserted in the notices area'],
  [/^page:\/div:1\/section:1\/section:1\/p:1(\/(span|strong):1)?$/, '"ON THIS DEVICE / Your Auth Kit stays with you." is folded into the "What is an Auth Kit?" disclosure ("It stays on this device and is never uploaded")'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:1\/article:1\/span:1(\/img:1)?$/, 'the tile head wrapper and its (hidden until FXN\'s published metadata has one) logo; the symbol is the tile\'s label, and the logo, when there is one, is inserted before it'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:2\/p:1\/span:1$/, 'the key line\'s wrapper; the key is the fact\'s value'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:2\/(a:3|span:1)$/, '"Open publishing" and "Publishing tools available" appear only in local development (the link is Ark\'s action then, pinned to this key; the sentence is the status line\'s)'],
  [/^page:\/div:1\/aside:1\/a:2\/small:1$/, 'the small "Explore the network" caption is the action row\'s accessible name']
];
/* leaves of the old page whose words are no longer on the page, with the reason */
const reworded = [
  /* journey audit 2026-10-24 (docs/journey/END-TO-END-2026-10-24.md): the person-facing name is "FXN ID" and the file is .auth.fxn (the shared bundle said so from ark-ui 0.2.17; this page followed). The first of these
     is the line that failed before the audit: the census still held the bundle's old ".auth.flx" sentence. */
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:1\/div:1\/section:1\/div:1\/p:1$/, 'the bundle\'s file line reads "Choose your FXN ID file (.auth.fxn). It stays on this device and is never uploaded." (it read "recovery file (.auth.flx)")'],
  [/^page:\/div:1\/header:1\/div:1(\/svg:1(\/text:2)?)?$/, 'the map\'s node reads "FXN ID" (it read "AUTH KIT")'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:2\/p:2$/, '"You never need to share your FXN ID file or PIN" (it said Auth Kit)'],
  [/^page:\/div:1\/section:1\/section:3\/div:1\/p:1$/, '"Choose your FXN ID file to invite or respond to identities." (it said Unlock your Auth Kit)'],
  [/^page:\/div:1\/header:1\/div:2\/div:2\/h1:1\/span:[12]$/, '"Your keys." "Your world." was the old two-tone heading; the heading is "Sign in to DEFXN"'],
  [/^id:account-title$/, 'the old heading'],
  [/^page:\/div:1\/header:1\/div:2\/div:2\/span:1$/, 'the old status line'],
  [/^page:\/div:1\/header:1\/div:2\/div:1$/, 'the avatar tile'],
  [/^page:\/div:1\/header:1\/p:[12]$/, 'the kicker and the intro, reworded in plain words'],
  [/^page:\/div:1\/header:1\/section:1\/p:1$/, 'the old verification line'],
  [/^page:\/div:1\/section:1\/p:1$/, 'the old card caption'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/(h2|p):1$/, 'the old session heading and sentence'],
  [/^page:\/div:1\/section:1\/section:1\/p:1(\/(span|strong):1)?$/, 'the security note, folded into the Auth Kit disclosure'],
  [/^page:\/div:1\/section:1\/section:1\/div:2(\/(h2|p):1)?$/, 'the old create heading'],
  [/^page:\/div:1\/section:1\/section:2\/div:1\/div:1\/article:2\/(strong|span):1$/, 'Credits reads "Not built yet" and "Credit balances are not available yet."'],
  [/^page:\/div:1\/aside:1\/button:2\/strong:1$/, 'Credits reads "Not built yet"'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:2\/(a:3|span:1)$/, '"Open publishing" and "Publishing tools available" are drawn only in local development (the server render is not); the link is Ark\'s action then'],
  [/^page:\/div:1\/aside:1\/a:2\/small:1$/, '"Explore the network" is the action row\'s accessible name (aria-label), not a visible caption'],
  [/^page:\/div:1\/header:1\/section:1\/dl:1\/div:3\/dd:1$/, 'an unset wallet address reads Ark\'s "Not recorded" (it was "Not recorded in this kit")'],
  [/^page:\/div:1\/section:1\/nav:1\/button:1$/, 'the Session tab exists once the person is signed in (tests/account-session.cjs); signed out the card offers Sign in / Create identity'],
  [/^page:\/div:1\/section:1\/section:1\/div:1\/div:1\/div:1\/section:1\/div:1\/form:1\/div:1\/button:1$/, 'the Auth Kit button reads "Sign in with your Auth Kit" (it was "Choose Auth Kit"): it says what it does']
];

(async () => {
  /* ---- the module is a spec of Ark blocks around its live parts ---------------------------- */
  const source = read('js/pages/account.js');
  assert(/ArkUI\.page\(spec, host, \{ page: 'account'/.test(source), 'the page is built by ArkUI.page from its spec');
  assert(!/page\.innerHTML\s*=/.test(source), 'no page-sized innerHTML string is left');
  assert(!/role="tablist"|data-account-tab=|aria-pressed/.test(source), 'no hand-built tab strip is left: the tabs are Ark\'s');
  assert(!/<h1/.test(source), 'no hand-built h1: the hero block is the page\'s heading');
  assert(!/<form|<ul|<li\b|<input[^>]*(number|text)|role="status"|aria-live|class="account-rail-item"|account-contact-main/.test(source.replace(/type="password"/g, '')) , 'no hand-built form, list, status line or rail tile is left (only the PIN and password pair: Ark\'s field has no password kind)');
  const catalog = read('js/pages/catalog.js');
  assert(/account: \{ module: 'account', scripts: ArkUI\.blockScripts\.concat\(\[/.test(catalog), 'the route loads the blocks before its module');
  /* /explore uses only `popover`, which ships as its own smaller chunk since Ark 0.2.10 (W4-ARK). */
  assert(/account: \{[^\n]*ark-kit-forms\.js/.test(catalog) && /explorer: \{[^\n]*ark-kit-popover\.js/.test(catalog), 'the account route lists the forms chunk and explore the popover chunk (literal paths)');

  /* ---- what the visitor gets, and every old key ----------------------------------------------- */
  const seen = await converted.check('/account', { reshaped, retired, reworded, inspect: (window, page) => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const visible = (el) => !el.closest('[hidden]');
    return {
      /* (the Auth Kit module's own panel heading is display:none in css/account.css; the browser driver checks what is drawn) */
      headings: [...page.querySelectorAll('h1,h2')].filter((h) => visible(h) && !h.closest('[data-ark-auth]')).map((h) => h.tagName + ':' + text(h)),
      title: (page.querySelector('h1') || {}).id,
      labelledBy: page.getAttribute('aria-labelledby'),
      tabs: [...page.querySelectorAll('[data-ark-block="tabs"] [role="tab"]')].map(text),
      tabsBlocks: page.querySelectorAll('[data-ark-block="tabs"]').length,
      handTabs: page.querySelectorAll('[role="tablist"]:not([data-ark-part="tabs-list"]), [aria-pressed]').length,
      session: page.dataset.session,
      create: page.querySelectorAll('[data-account-create-view]').length,
      views: [...page.querySelectorAll('[data-account-panel]')].map((el) => el.getAttribute('data-account-panel')),
      offstage: [...page.querySelectorAll('.account-offstage > [data-account-panel]')].map((el) => el.getAttribute('data-account-panel')),
      ways: [...page.querySelectorAll('a[data-scene-link]')].filter(visible).map((a) => a.dataset.sceneLink),
      credits: text(page.querySelectorAll('#account-balances [data-state="absent"]')[1]),
      explain: text(page.querySelector('#account-explain')),
      developer: text(page.querySelector('#account-developer')),
      blocks: [...page.querySelectorAll('[data-ark-block]')].map((el) => el.getAttribute('data-ark-block')).filter((name, i, all) => all.indexOf(name) === i).sort()
    };
  } });
  assert.deepEqual(seen.headings, ['H1:Sign in to DEFXN'], 'one heading on the page: the h1 (no second heading as large as it)');
  assert.equal(seen.title, 'account-title', 'the heading keeps the id the old page gave it (its layout key)');
  assert.equal(seen.labelledBy, 'account-title');
  assert.equal(seen.session, 'signed-out');
  assert.equal(seen.tabsBlocks, 1, 'the card is one Ark tabs block (Sign in / Create identity while signed out)');
  assert.deepEqual(seen.tabs, ['Sign in', 'Create identity']);
  assert.equal(seen.handTabs, 0, 'no hand-built tab strip and no aria-pressed toggle');
  assert.deepEqual(seen.views.sort(), ['contacts', 'defi', 'keys', 'mesh', 'session'], 'every view is in the page in every state (hidden until its tab exists)');
  assert.equal(seen.create, 1, 'the create view is in the page too (the second tab)');
  assert.deepEqual(seen.offstage.sort(), ['contacts', 'defi', 'keys', 'mesh'], 'signed out, the wallet, keys, contacts and network views wait offstage');
  assert(seen.ways.includes('bundledeployer') && seen.ways.includes('account/domains'), 'the two ways on are links while signed out (they were display:none)');
  assert(/Credits/.test(seen.credits) && /Not built yet/.test(seen.credits) && !/Coming soon|\b0\b/.test(seen.credits), 'Credits is Ark\'s "Not built yet" stat, never "Coming soon" or 0');
  assert(/FXN ID file/.test(seen.explain) && /Ghost ID/.test(seen.explain), '"What is an FXN ID file?" says what it is and that developers call the identity ID the Ghost ID');
  assert(/Ghost ID/.test(seen.developer) && /root key/.test(seen.developer), '"Developer details" names the Ghost ID and the root key');
  for (const block of ['hero', 'figure', 'facts', 'tabs', 'stats', 'actions', 'disclosure', 'callout', 'form', 'list', 'status-line']) assert(seen.blocks.includes(block), `the page uses Ark's ${block} block`);

  /* ---- the same page on the server render (the crawler's HTML) --------------------------------- */
  await checks.assertServerRender('/account', 'account', { idPrefix: ['account-', 'fxnSend', 'contactsSearch'] });
  console.log('PASS: /account is a page of Ark blocks around its live parts: one h1, Ark tabs, every old layout key accounted for, every view kept, nothing dropped.');
})().catch((error) => { console.error(error); process.exit(1); });
