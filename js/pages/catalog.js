/* Route metadata belongs to the shell; bodies and page modules do not.
   Every title (and the meta description js/ark/page-router.js applies on
   navigate) goes through ArkSEO, so each page editor's overrides reach
   every route without this file changing. seoId is the key ArkSEO.pages
   uses; 'zero' has none of its own -- its copy is the 'home' manifest, so
   its SEO entry is too. */
ArkUI.pageModules = Object.create(null);
/* THE NETWORK'S FIGURES: ONE SOURCE (owner, 2026-11-11: "when it comes to numbers add N/A or TBA"). Layer: app. Every figure a status bar shows
   (the home's, a topic page's, Learn's) is asked from ArkUI.homeStatus.read(id), with id one of price, genesis, chains, networks, identities.
   Today no chain is live and nothing measures these, so read() answers nothing and the bar shows the manifest's TBA word. Absent is never shown
   as zero. The day a real source exists, it replaces read() here, in this one place, and returns the text to show. It stands in this file because
   every page loads it, so a topic page opened by its own address reads the same source as the home (it was in js/pages/intro.js until 2026-11-11). */
ArkUI.homeStatus = ArkUI.homeStatus || { read: function () { return undefined; } };
function arkSeoTitle(id, fallbackLabel) { return typeof ArkSEO !== 'undefined' ? ArkSEO.pageTitle(id, fallbackLabel) : fallbackLabel; }
/* What a route needs before an Ark block can render (js/ark/blocks.js): the link resolver, the
   public Ark kit (what no block uses left out -- scripts/ark-kit-entry.js), and the adapter that
   registers every block as a resolver. A route whose page is built from blocks lists these
   first; js/ark/page-loader.js adds them by itself to a route that has a saved Ark block
   instance, and to every route in the editor's canvas (which can insert one anywhere). Kept off
   the other routes: ~31 KB gz of JS they would not use (docs/ux-audit/components.md R2).
   The glossary ([[term]] markup, the term block) is separate: a page whose words use it lists
   ArkUI.glossaryScript, and the loader adds it where saved blocks or the canvas need it. */
ArkUI.blockScripts = ['js/ark/dash-kit.js', 'js/ark/vendor/ark-kit-public.js', 'js/ark/blocks.js'];
/* The WHOLE glossary (every term of docs/glossary.md): the editor, and a page holding a saved term block. */
ArkUI.glossaryScript = 'js/content/glossary.js';
/* A route does not ship the whole glossary: it ships the terms its own rendered text uses, one small
   file per route (js/content/glossary/<route>.js, derived and checked by scripts/build-glossary.cjs --check
   --routes; docs/cms-architecture.md Budget). A route lists ArkUI.glossaryScript below and the pass at the
   end of this file swaps in its own file by this one rule, so a route is never named twice. */
ArkUI.glossaryFor = function (key) { return 'js/content/glossary/' + String(key).replace(/\//g, '-') + '.js'; };
ArkUI.routeGlossary = function (key) {
  var entry = ArkUI.pageCatalog[key], at = entry && entry.scripts ? entry.scripts.indexOf(ArkUI.glossaryScript) : -1;
  /* a retired key that mounts its new page (no module of its own) ships that page's glossary, not one named after the old key */
  var own = entry && entry.redirect && ArkUI.pageCatalog[entry.redirect] && ArkUI.pageCatalog[entry.redirect].module === entry.module ? entry.redirect : key;
  if (at >= 0) { entry.scripts = entry.scripts.slice(); entry.scripts[at] = ArkUI.glossaryFor(own); }
  return entry;
};
/* The story template (js/pages/story.js): the theory sheets, the agreement chapters and the
   agreement lifecycle are one guided page built from Ark blocks, whose prose defines its glossary
   words in place -- so a story route loads the blocks, the glossary and the template. */
ArkUI.storyScripts = ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/pages/story.js']);
/* Stylesheets: each route loads the shared sheets (linked in index.html) plus only its own, linked by
   js/ark/page-loader.js before the page mounts (docs/cms-architecture.md, the CSS ledger). The lists are
   derived, never written per page: node scripts/page-styles.mjs --write reads which classes each
   module's scripts (and the shell's) name and which sheet defines them; --check fails on drift.
   ArkUI.styleOrder is the one hand-kept fact, the CASCADE ORDER of every sheet: the order they were once
   all linked in. The loader puts a late sheet where it sits in this list, so a page sheet still comes
   before css/components.css (which decides interactive paint), as it did. A new sheet goes where it
   belongs in it; `--write` places an unlisted one before css/ark-blocks.css. */
ArkUI.styleOrder = [
  'css/themes.css', 'assets/kit/defxn-fonts.css', 'assets/kit/defxn-components.css',
  'css/fallback.css', 'css/studio.css', 'css/hero-motion.css',
  'css/navigation.css', 'css/focus.css', 'css/settings.css', 'css/page-layout.css', 'css/home.css',
  'css/resolver-guide.css', 'css/site-direction.css', 'css/experience.css', 'css/explorer.css',
  'css/home-drafting.css', 'css/lifecycle.css', 'css/reference.css',
  'css/guided-page.css', 'css/resolutions.css', 'css/account.css',
  'css/resolver-math.css', 'css/icons.css',
  'css/story-diagrams.css', 'css/color-system.css', 'css/brand-identity.css',
  'css/how-overview.css', 'css/explorer-observatory.css', 'css/explore-story.css', 'css/authorization-dialog.css',
  'css/download.css', 'css/home-swiss.css',
  'assets/kit/defxn-marks.data.css', 'css/world.css', 'css/world-pages.css', 'css/space-frame.css', 'css/world-chain.css', 'css/world-identity.css', 'css/world-measure.css', 'css/world-stats.css', 'css/world-works.css', 'css/world-minute.css', 'css/nft-card.css', 'css/skin-site.css', 'css/resolutions-one.css', 'css/notes-one.css', 'css/stats-one.css', 'css/cutouts.css', 'css/world-minute.css', 'css/auth.css', 'css/chain-one.css', 'css/lattice.css', 'css/space-home.css', 'css/works-one.css', 'css/motion.css', 'css/ark-blocks.css', 'css/block-page.css', 'css/components.css',
  /* the editor's Kit (cms-preview only): last, over the blocks it shows */
  'css/ark-blocks-groups.css', 'css/kit.css', 'css/kit-boards-a.css', 'css/kit-boards-b.css'
];

/* BEGIN derived page styles -- generated by `node scripts/page-styles.mjs --write`; `--check` fails on drift. Do not edit by hand:
   change a page's scripts or a stylesheet's selectors and regenerate. shared = linked in index.html (every route
   needs it); modules = what a page module adds, in cascade order (ArkUI.styleOrder). The header of that script says how. */
ArkUI.pageStyles = {
  shared: ['css/themes.css', 'assets/kit/defxn-fonts.css', 'assets/kit/defxn-components.css', 'css/fallback.css', 'css/studio.css', 'css/hero-motion.css', 'css/navigation.css', 'css/focus.css', 'css/settings.css', 'css/page-layout.css', 'css/home.css', 'css/site-direction.css', 'css/experience.css', 'css/home-drafting.css', 'css/lifecycle.css', 'css/reference.css', 'css/resolutions.css', 'css/icons.css', 'css/story-diagrams.css', 'css/color-system.css', 'css/brand-identity.css', 'css/how-overview.css', 'css/authorization-dialog.css', 'css/home-swiss.css', 'assets/kit/defxn-marks.data.css', 'css/world.css', 'css/world-pages.css', 'css/space-frame.css', 'css/lattice.css', 'css/motion.css', 'css/ark-blocks.css', 'css/components.css'],
  modules: {
    zero: ['css/space-home.css'],
    intro: [],
    learn: [],
    auth: ['css/cutouts.css', 'css/auth.css'],
    account: ['css/account.css', 'css/auth.css', 'css/block-page.css'],
    download: ['css/download.css'],
    topic: [],
    notFound: ['css/block-page.css'],
    kit: ['css/kit.css', 'css/kit-boards-a.css', 'css/kit-boards-b.css'],
    article: ['css/block-page.css']
  }
};
/* END derived page styles */
/* A route's own sheets by its page module; undefined (no entry) makes the loader link every sheet the
   shell does not, which is right but heavy, so a module missing here is a drift --check reports. */
function arkModuleStyles(module) { return ArkUI.pageStyles.modules[module]; }
/* Which module draws each page and the scripts it needs: the loader's half of a page. Its path,
   name and journey are the other half and live in js/content/site-pages.js (ArkSitePages), the
   one table the menu, footer strip, sitemap and not-found page also read. `aliases` are old or
   alternative addresses that open the page: js/ark/page-router.js resolve() and
   scripts/lib/site-routes.mjs both read them here, so a retired path is retired in one place. */
/* what every page of the stats section loads: the network map for the corner, the two data files its numbers come from,
   the one pulse client, the shared frame and the page file. js/content/stats-highlights.js is linked in index.html. */
var STATS_SCRIPTS = ['js/content/network-data.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js', 'js/content/stats-scale.js', 'js/ark/pulse-client.js', 'js/pages/world-sheet.js', 'js/pages/world-stats.js'];
var arkPageModules = {
  /* home and the intro stand on the 3D world (js/world2/world2-host.mjs), not on Ark blocks: they load the data files
     their numbers come from (the world loads the same files for its own use, once) and the rail */
  zero: { module: 'zero', scripts: ['js/pages/home.js'] },   /* the home stands on the space (docs/design/space/SPACE.md); the Measured rail left it 2026-11-05 */
  intro: { module: 'intro', scripts: ['js/content/network-data.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js', 'js/content/topics.js', 'js/pages/intro.js'] },
  /* the redesign's views, each on its own 3D view (js/world2/world2-host.mjs VIEW_OF). /chain and /resolvers move to theirs
     when their page files land (Pages A and B swap those two entries); every other old page stays. */
  identity: { module: 'worldIdentity', scripts: ['js/pages/world-chain.js', 'js/pages/world-identity.js'] },
  /* /measured is /stats/capabilities now (2026-10-24); the measured page in js/pages/world-measure.js is kept and unused */
  ring: { module: 'worldRing', scripts: ['js/content/network-data.js', 'js/content/fxn-data.js', 'js/pages/world-sheet.js', 'js/pages/world-measure.js'] },
  /* In one minute: the 60-second guided sequence on the grid (the clock in js/pages/world-minute-clock.js; the `movie` stage left with Three.js), which replaced
     the faithful port of the minute (removed) */
  works: { module: 'worldMinuteMovie', scripts: ['js/content/network-data.js', 'js/content/resolvers-data.js', 'js/pages/world-sheet.js', 'js/pages/world-minute-clock.js', 'js/pages/world-minute.js'] },
  /* /chain is the redesign's your-chain page now; the old page's file (js/pages/chain.js) stays in place, unused */
  chain: { module: 'worldChain', scripts: ['js/content/records-sample.js', 'js/pages/world-chain.js'] },
  /* the story template (js/pages/story.js) since 2026-10-19: the lab builds its def, the guide mounts it */
  /* the explorer used to live at /explorer; /explore is its address now */
  explorer: { module: 'explorer', aliases: ['/explorer'], scripts: ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/ark/vendor/ark-kit-popover.js', 'js/ark/page-kit.js', 'js/pages/explorer.js']) },
  /* The stats section (2026-10-24, owner: "/measured is where we show capabilities, benchmarks, live data"): one 3D stage (the Three.js stats stage, removed 2026-11-08; world2 has no stats 3D yet, the
     `stats` view) and one page file (js/pages/world-stats.js), so moving between its inner pages is one camera flight. /stats, /stats/gpu, /stats/ledger
     and /measured are retired: their page modules (js/pages/stats.js, stats-gpu.js, stats-ledger.js and world-measure.js's measured page) are no longer
     in the catalog and their files are kept; the old addresses open the new pages (aliases) and the old keys redirect (ArkUI.pageRedirects, below).
     The live reading is js/ark/pulse-client.js, the one client of /api/fleet-pulse. A week page exists for each week that holds a dated run
     (ArkSitePages.statsWeeks), so it is registered by the loop after this table. */
  'stats/now': { module: 'worldStatsNow', aliases: ['/stats', '/monitor', '/stats/fleet', '/stats/gpu', '/stats/resolver', '/measured', '/stats/ledger'].concat(ArkSitePages.statsWeeks().map(function (w) { return w.path; })), scripts: STATS_SCRIPTS },
  resolvers: { module: 'worldResolvers', scripts: ['js/content/network-data.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js', 'js/pages/world-sheet.js', 'js/pages/world-measure.js'] },
  /* The Wallet tab's dense-wire modules (js/ark/dense-wire-wallet.mjs over
     js/dense-wire/*.mjs) are ES modules, which page-loader.js does not load:
     js/pages/account.js import()s them on first use instead. */
  account: { module: 'account', scripts: ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/ark/vendor/ark-kit-forms.js', 'js/ark/ml-dsa.js', 'js/ark/auth-kit-create-panel.js', 'js/admin/auth.js', 'js/ark/account-session.js', 'js/ark/directory-transport.js', 'js/ark/mesh-directory-client.js', 'js/ark/ed25519-pem-browser.js', 'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/authorization-dialog.js', 'js/ark/local-domains.js', 'js/ark/profile-card.js', 'js/pages/account.js']) },
  /* /auth: signing in with your FXN ID file, split out of /account (owner, 2026-10-25). It stands on the 3D world
     (the Three.js auth stage, removed 2026-11-08; js/world2/world2-host.mjs draws /auth now) and uses /account's one sign-in session (js/ark/account-session.js), with the same
     scripts that session needs: the panel and signer, the mesh directory publish and its signing review. The create panel
     is here for its grades only (ArkAuthKitCreatePanel.grades): the wizard tells the FXN ID card the PIN and password
     grades by the panel's one rule (js/ark/fxn-id-card/fxn-id-card-stage.js). */
  auth: { module: 'auth', scripts: ['js/ark/ml-dsa.js', 'js/admin/auth.js', 'js/ark/auth-kit-create-panel.js', 'js/ark/account-session.js', 'js/ark/directory-transport.js', 'js/ark/mesh-directory-client.js', 'js/ark/ed25519-pem-browser.js', 'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/authorization-dialog.js', 'js/ark/profile-card.js', 'js/pages/auth.js'] },
  /* the notes index and each note are pages of Ark blocks since 2026-10-19 (W3-LEARN); a note is on the story template */
  learnings: { module: 'learnings', scripts: ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/pages/learnings.js']) },
  resolutions: { module: 'resolutions', scripts: ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/pages/resolutions.js']) },
  download: { module: 'download', scripts: ArkUI.storyScripts.concat(['js/pages/download.js', 'js/ark/page-kit.js']) },
  /* Notes opens these in place (ArkUI.loadPage) since 2026-11-05: their entries keep their module and scripts, and
     their addresses open /learnings?open=<key> (js/content/site-pages.js RETIRED `keep`) */
  'resolver-math': { module: 'resolverMath', scripts: ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/content/resolver-algebra.js', 'js/content/resolver-block.js', 'js/content/registry-snapshot.js', 'js/pages/resolver-math.js']) },
  concept: { module: 'concept', scripts: ArkUI.storyScripts.concat(['js/pages/concept.js']) },
  dao: { module: 'dao', scripts: ArkUI.storyScripts.concat(['js/pages/sheet.js', 'js/ark/vendor/ark-kit-figures.js', 'js/pages/resolver-page-parts.js', 'js/pages/dao.js', 'js/ark/page-kit.js']) },
  reference: { module: 'reference', scripts: ArkUI.blockScripts.concat(['js/content/reference-index.js', 'js/pages/reference.js']) }
};
/* The portal navigation (2026-11-09, design P05; docs/design/space/SPACE.md "Portal navigation (P05)"). Learn is the one place to
   learn: the record's words, every measured number, the twelve topics. It answers the old stats addresses the stats page used to. */
arkPageModules.learn = { module: 'learn', scripts: ['js/content/topics.js', 'js/pages/learn.js'] };
/* The old stats addresses (/stats, /monitor, /stats/gpu, the week pages) are the aliases of the retired `stats/now` module above;
   its redirect entry carries them (arkRedirectEntry keeps a retired module's aliases) and its section query, so each opens
   /learn?t=speed. Until 2026-11-09 they were Learn's own aliases as well, listed before the redirect, so resolve() answered
   them with Learn at its Words tab and the Speed tab was never reached (navigation audit). */
/* the twelve topic pages: one template (js/pages/topic.js), one row each in js/content/topics.js; the keys come from site-pages.js TOPICS */
ArkSitePages.topics().forEach(function (t) { arkPageModules[t.key] = { module: 'topic', scripts: ['js/content/topics.js', 'js/pages/topic.js'] }; });
ArkUI.pageCatalog = {};
/* journey: which visitor path the page serves (ArkSitePages.journeys()); null keeps it out of
   every list. hiddenFromNavigation is the same fact for older readers: no journey, no menu. */
/* A topic page is named by its stone: the ring's own word (HOME.LANDING.RING.S<n>, js/content/manifests/home.js), so the tab's
   title, the ring and the page say one name. Its row's label ('FXN id') is the fallback where the copy is not loaded (a headless
   route list). The stone number is the topic's place in TOPICS (js/content/site-pages.js), clockwise from the top. */
var arkTopicStone = {};
ArkSitePages.topics().forEach(function (t, i) { arkTopicStone[t.key] = 'HOME.LANDING.RING.S' + (i + 1); });
function arkPageLabel(row) {
  var stone = row.topic && arkTopicStone[row.key];
  return stone && typeof ArkCopy !== 'undefined' && ArkCopy.has && ArkCopy.has(stone) ? ArkCopy.text(stone) : row.label;
}
ArkSitePages.pages().forEach(function (row) {
  var loader = arkPageModules[row.key];
  if (!loader) throw new Error('js/content/site-pages.js lists the page "' + row.key + '", but js/pages/catalog.js has no module for it: add one to arkPageModules, or remove the row.');
  var entry = { path: row.path, title: arkSeoTitle(row.seoId || row.key, arkPageLabel(row)), seoId: row.seoId || row.key, journey: row.journey, module: loader.module, scripts: loader.scripts, styles: arkModuleStyles(loader.module) };
  if (row.short) entry.short = row.short;
  if (loader.aliases) entry.aliases = loader.aliases;
  if (!row.journey) entry.hiddenFromNavigation = true;
  ArkUI.pageCatalog[row.key] = entry;
});
/* Retired routes keep their key, so a saved link (route:stats, route:measured) still resolves: the entry carries the new path and `redirect`, the key
   the world host's navigate sends the visitor to before anything mounts (js/world2/world2-host.mjs). They come after the new entries so an address that
   several keys name resolves to the new key first (js/ark/page-router.js resolve). Never listed, never indexed. */
/* 2026-11-09 (design P05): the stats section is Learn's Speed tab, so every older stats key opens /learn?t=speed */
ArkUI.pageRedirects = { stats: 'learn', 'stats/gpu': 'learn', 'stats/ledger': 'learn', measured: 'learn', 'stats/resolver': 'learn', 'stats/fleet': 'learn' };
ArkSitePages.statsWeeks().forEach(function (week) { ArkUI.pageRedirects[week.key] = 'learn'; });
/* The 2026-11-05 cut (about 85 pages to 22): every retired page (js/content/site-pages.js RETIRED) redirects to the page
   that holds it now. Its old path is the redirect entry's alias, so js/ark/page-router.js resolve() still answers the old
   address with the old key, and navigate() follows `redirect`. `redirectQuery` is the section the new page opens
   (?s=capabilities): page-router.js navigate() must pass it as the query when the visitor brought none; until it does,
   the new page opens at its top. */
/* stats/ceiling and stats/capabilities are retired too, so the older keys that led to them open stats/now at their section */
var arkRedirectKeep = {};
var arkRedirectQuery = { stats: 't=speed', 'stats/gpu': 't=speed', 'stats/resolver': 't=speed', 'stats/ledger': 't=speed', measured: 't=speed', 'stats/fleet': 't=speed' }, arkRedirectPath = {};
ArkSitePages.retired().forEach(function (row) {
  ArkUI.pageRedirects[row.key] = row.to;
  arkRedirectPath[row.key] = row.path;
  if (row.query) arkRedirectQuery[row.key] = row.query;
  if (row.keep) arkRedirectKeep[row.key] = true;
});
/* `own` (a page Notes opens in place): the entry keeps that page's own module, scripts and styles */
function arkRedirectEntry(old, to, oldPath, query, own) {
  var target = ArkUI.pageCatalog[to];
  if (!target) throw new Error('The retired key "' + old + '" redirects to "' + to + '", which is not a page in js/content/site-pages.js PAGES: point it at a page that exists.');
  var entry = { path: target.path, title: target.title, seoId: old, journey: null, hiddenFromNavigation: true, noindex: true, redirect: to, module: target.module, scripts: target.scripts, styles: target.styles };
  /* the old path, and the old addresses the retired module answered (explorer: /explorer; stats/now: /stats, /monitor, the week
     pages), so a saved link to any of them lands; until 2026-11-09 only the path came along and /explorer was Not found */
  var aliases = (oldPath && oldPath !== target.path ? [oldPath] : []).concat((arkPageModules[old] && arkPageModules[old].aliases || []).filter(function (a) { return a !== target.path; }));
  if (aliases.length) entry.aliases = aliases;
  if (query) entry.redirectQuery = query;
  if (own) { entry.module = own.module; entry.scripts = own.scripts; entry.styles = arkModuleStyles(own.module); }
  return entry;
}
Object.keys(ArkUI.pageRedirects).forEach(function (old) {
  ArkUI.pageCatalog[old] = arkRedirectEntry(old, ArkUI.pageRedirects[old], arkRedirectPath[old], arkRedirectQuery[old], arkRedirectKeep[old] ? arkPageModules[old] : null);
});
/* A content-derived key whose family is retired (site-pages.js FAMILIES `to`): resolutions/<slug> opens /resolutions?s=<slug>,
   concept/<id> opens /learnings. The family's redirect, or null when the family still has pages of its own. */
function arkFamilyRedirect(key) {
  var fam = ArkSitePages.families().filter(function (f) { return String(key).indexOf(f.prefix) === 0; })[0];
  if (!fam || !fam.to) return null;
  var named = fam.whole ? String(key) : String(key).slice(fam.prefix.length);
  return { to: fam.to, keep: !!fam.keep, query: fam.query ? fam.query + '=' + encodeURIComponent(named) : '' };
}
/* The intro is the first page of a fresh visit, not a page to find in a search: it shares home's SEO entry and is never listed. */
if (ArkUI.pageCatalog.intro) ArkUI.pageCatalog.intro.noindex = true;
/* The five lifecycle stages, derived from the retired lifecycle/* rows (js/content/site-pages.js RETIRED): the pages left
   in the 2026-11-05 cut, but js/lattice.js and js/pages/lifecycle.js still name the stages by this list. */
ArkUI.lifecycleStages = ArkSitePages.retired().filter(function (row) { return row.key.indexOf('lifecycle/') === 0; })
  .map(function (row) { return { id: row.key.split('/')[1], title: row.short || row.label }; });
/* An address no page answers. js/ark/page-router.js resolve() returns this instead of quietly
   showing Home (docs/ux-audit/pages.md P8): the page names the address it was asked for and
   offers the closest pages and every journey's way in (js/pages/not-found.js). noindex: it is
   never a page to list. */
ArkUI.pageCatalog.notfound = { path: '/not-found', title: arkSeoTitle('notfound', 'Page not found'), journey: null, hiddenFromNavigation: true, noindex: true, module: 'notFound', scripts: ArkUI.blockScripts.concat(['js/pages/not-found.js']), styles: arkModuleStyles('notFound') };
/* The Kit (js/pages/kit.js): the owner's five DEFXN boards, drawn live, for the editor's More > Kit (js/admin/kit.js).
   It exists only in the editor's canvas (the address carries cms-preview=1): never a visitor's route, never listed,
   never indexed. It loads the FULL Ark kit and every Ark primitive (ark-kit-catalog.js), which no public route does. */
if (typeof location !== 'undefined' && /[?&]cms-preview=1(&|$)/.test(location.search)) {
  ArkUI.pageCatalog.kit = { path: '/kit', title: 'Kit', journey: null, hiddenFromNavigation: true, noindex: true, module: 'kit',
    scripts: ['js/ark/dash-kit.js', 'js/ark/vendor/ark-kit.js', 'js/ark/blocks.js', 'js/ark/vendor/ark-kit-forms.js', 'js/ark/vendor/ark-kit-catalog.js', 'js/ark/vendor/ark-kit-skin.js',
      'js/content/network-data.js', 'js/content/identity-sample.js', 'js/content/records-sample.js', 'js/content/resolvers-data.js', 'js/content/capabilities-data.js',
      'js/content/kit-boards.js', 'js/kit/registry.js', 'js/kit/board-01.js', 'js/kit/board-02.js', 'js/kit/board-03.js', 'js/kit/board-04.js', 'js/pages/kit.js'],
    styles: arkModuleStyles('kit') };
}
/* The 20 resolution pages are sections of /resolutions since 2026-11-05: each key redirects there with ?s=<slug>. */
if (typeof ArkResolutions !== 'undefined') ArkResolutions.all().forEach(function (item) {
  var key = 'resolutions/' + item.slug, moved = arkFamilyRedirect(key);
  if (moved) { ArkUI.pageCatalog[key] = arkRedirectEntry(key, moved.to, '/' + key, moved.query); return; }
  ArkUI.pageCatalog[key] = {
    path: '/resolutions/' + item.slug,
    title: item.title + ' — DEFXN',
    seoId: key,
    module: 'resolutions',
    nestedNavigation: true,
    journey: ArkSitePages.journeyOf(key),
    scripts: ArkUI.blockScripts.concat([ArkUI.glossaryScript, 'js/content/resolution-products.js', 'js/pages/resolutions.js']),
    styles: arkModuleStyles('resolutions')
  };
});
/* A readable address beside a derived route's own, derived from the page's name (first-visit audit 2026-10-22, P2):
   /concept/networks opens /concept/purpose, /learnings/from-one-chain-to-one-per-identity opens
   /learnings/why-the-chain-was-retired. The old path stays the route's own: saved CMS edits are stored under it
   (js/content/layout.js scopeOf), and a record is never rewritten, so the readable one is the alias that leads to it. */
function arkReadableAliases(base, name, own) {
  var readable = base + String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return readable !== base && readable !== own ? [readable] : undefined;
}
/* Articles and theory pages are routes DERIVED from the content registries, never listed: one
   function, so the editor's canvas derives an unsaved page's route exactly as the site derives a
   saved one (js/main.js, the CMS preview's 'defxn-cms-preview-state': a new page or article was
   invisible on the canvas until Save, because its route existed only here, at load --
   docs/ux-audit/cms.md P0-1; regression: tests/cms-draft-routes.cjs). Returns the keys it added.
   An article whose body is already in LearningContent (a draft the editor sent) is not given its
   body file, which does not exist until the draft is saved. */
ArkUI.catalogContentRoutes = function (articles, theoryManifests) {
  var added = [];
  (articles || []).forEach(function (article) {
    var key = 'article/' + article.slug, body = article.sections ? [] : ['js/content/articles/' + article.slug + '.js'];
    if (!ArkUI.pageCatalog[key]) added.push(key);
    /* 2026-11-10 (owner, CLAIMS-AUDIT-2026-11-10): the articles are history and left the site; their family's `to` opens Learn.
       The article files stay on disk. */
    var gone = arkFamilyRedirect(key);
    if (gone) { ArkUI.pageCatalog[key] = arkRedirectEntry(key, gone.to, '/learnings/' + article.slug, gone.query, null); return; }
    ArkUI.pageCatalog[key] = { path: '/learnings/' + article.slug, title: typeof ArkSEO !== 'undefined' ? ArkSEO.articleTitle(article.slug, article.title) : article.title, seoArticle: article.slug, journey: ArkSitePages.journeyOf(key), module: 'article', scripts: ArkUI.storyScripts.concat(body, ['js/pages/article.js']), styles: arkModuleStyles('article') };
    var aliases = arkReadableAliases('/learnings/', article.title, ArkUI.pageCatalog[key].path);
    if (aliases) ArkUI.pageCatalog[key].aliases = aliases;
  });
  (theoryManifests || []).forEach(function (m) {
    var key = 'concept/' + m.id, label = ArkCopy.text(m.id.toUpperCase() + '.TITLE').replace(/\.$/, '');
    if (!ArkUI.pageCatalog[key]) added.push(key);
    /* the theory sheets left in the 2026-11-05 cut: the key and its address open /learnings */
    var moved = arkFamilyRedirect(key);
    var own = { module: 'theory', scripts: ArkUI.storyScripts.concat(['js/pages/sheet.js', 'js/pages/theory.js', 'js/ark/page-kit.js']) };
    if (moved) { ArkUI.pageCatalog[key] = arkRedirectEntry(key, moved.to, m.route, moved.query, moved.keep ? own : null); ArkUI.pageCatalog[key].title = arkSeoTitle(m.id, label); return; }
    ArkUI.pageCatalog[key] = { path: m.route, title: arkSeoTitle(m.id, label), seoId: m.id, journey: ArkSitePages.journeyOf(key), module: 'theory', scripts: ArkUI.storyScripts.concat(['js/pages/sheet.js', 'js/pages/theory.js', 'js/ark/page-kit.js']), styles: arkModuleStyles('theory') };
    /* /concept/notes is "Activation", and "notes" is also the name of /learnings */
    var readable = arkReadableAliases('/concept/', m.title, m.route);
    if (readable) ArkUI.pageCatalog[key].aliases = readable;
  });
  return added;
};
ArkUI.catalogContentRoutes(LearningContent.articles, typeof ArkManifest !== 'undefined' ? ArkManifest.group('theory') : []);
/* Every saved route, the derived ones too, now loads its own glossary file. A route the editor adds later (a draft
   article or theory page, catalogContentRoutes above) has no file until it is saved and built: it keeps the whole glossary. */
Object.keys(ArkUI.pageCatalog).forEach(function (key) { ArkUI.routeGlossary(key); });

