/* The conversion copy: the words that make a promise (status, boundaries, journey actions, network commands) stay true.
   2026-10-27, owner-confirmed: the deployment page is removed (its absence is locked; its manifest's words still may not carry the
   retired certified-fabric claim), and the redesigned /download deck says the build is not published yet and what to do today. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/manifests/index.js', 'utf8'), context);
const ids = vm.runInContext('ArkManifestIds', context);
ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context));
const manifest = (id) => JSON.parse(JSON.stringify(vm.runInContext(`ArkManifest.get(${JSON.stringify(id)})`, context)));
const value = (id, field) => manifest(id).fields[field].value;

assert.equal(value('home', 'EYEBROW'), 'DEFXN / A chain of chains');
assert.equal(value('home', 'CTA'), 'See how it works');
assert.equal(value('home', 'SECONDARY'), 'Read the source');
assert.equal(value('home', 'STATUS1.VALUE'), 'PARTIAL');
assert.equal(value('home', 'STATUS3.VALUE'), 'UNVERIFIED');
assert(!value('home', 'TITLE').includes('Deploy parse resolve'));
const benchmarkNote = fs.readFileSync('js/content/articles/why-the-chain-was-retired.js','utf8');
assert(!/65\.2\/s|5\.85x|3,900–4,100/.test(benchmarkNote), 'unregistered benchmark numbers do not return to the public note');

// Since 2026-10-19 (docs/protocol/resolvers.md, CAP-010..016): a resolver is a rulebook with its
// own chain, and "launched is not served" replaces "published is not deployed". The boundary
// line is the owner's signature framing (docs/ux-audit/plan.md), word for word.
assert.match(value('resolver', 'BODY1'), /^A resolver is a rulebook that runs as its own chain/);
assert(value('resolver', 'BODY3').startsWith('Launched is not served.'));
assert.equal(value('resolver', 'BOUNDARY'), 'Its signature is its result. Whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it.');

assert.equal(manifest('references').title, 'Reference resolvers');
/* The page must never present the named examples as checkable or live. Until 2026-10-22 the boundary
   said "Reference evidence pending"; the first-visit audit rewrote the page for the visitor (what a
   reference is, that neither has a public record yet, where to start today), so the same refusal is
   now said in two places, each pinned. */
assert.match(value('references', 'BODY1'), /neither has a public record you can inspect yet/);
assert.match(value('references', 'BODY2'), /nothing here shows that CR3TV or DeArk is deployed or in production/);
assert(!Object.values(manifest('references').fields).some((field) => /running on the fabric today/i.test(field.value)));

const how = manifest('deployment');
/* /how-deployment-works ("Deploy a resolver", 2026-10-19) was removed on purpose (b0dc2d7; owner-confirmed 2026-10-27). Its title,
   onward page and six steps were checks of that page, so they are dropped; the page's absence is locked here. Its manifest stays:
   the three agreement chapters (/how-deployment-works/ask|work|check) read their words from it. */
{
  const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync('js/content/site-pages.js', 'utf8'), ctx);
  assert(!ctx.ArkSitePages.pages().some((row) => row.key === 'deployment' || row.path === '/how-deployment-works'), 'the deployment page is not in the page table');
}
// The retired certified-fabric claim ("accepted once the quorum signs it ... 375 times a second")
// was on that page until 2026-10-19; the chapters still read these words, so it must not come back in any form.
assert(!Object.values(how.fields).some((field) => /quorum|375 times a second|three attestations/i.test(field.value)), 'the retired certified-fabric path is not in the words the agreement chapters read');

/* 2026-10-24: /download was "Run DEFXN from source". The browser rebrand and the journey fix made it lead with the browser. The owner named that product DEFXN Grid, then settled on FXN Browser (both 2026-10-24), so the page leads with FXN Browser, which has no public download, and the miner steps stay below. */
assert.equal(manifest('download').title, 'Get FXN Browser');
/* 2026-10-25 redesign (b0dc2d7; owner-confirmed 2026-10-27): the deck says the build is not published yet and names the two things a
   visitor can do today. It must never present a download as available. */
assert(value('download', 'DECK').includes('Until it is published, you can do two things today.'), 'the /download deck says the build is not published yet, and what you can do today');
assert(/Create your FXN ID/.test(value('download', 'DECK')) && /run a miner from source/.test(value('download', 'DECK')), 'the two things: create your FXN ID, or run a miner from source');
assert(!/download (it|now|here)|is available|get it now/i.test(value('download', 'DECK')), 'the deck never presents a download as available');
assert.equal(manifest('deploy').title, 'Create or join a network');
/* the deck leads with what a named network does, then its limit (ledger recheck 2026-10-21: it opened with a list
   of what networks do not do); the limit is still said */
assert(/decides which group of miners/.test(value('deploy', 'DECK')) && /not a security boundary/.test(value('deploy', 'DECK')), 'the /deploy deck says what a named network does and that it is not a security boundary');

const deploySource = fs.readFileSync('js/pages/deploy.js', 'utf8');
assert(deploySource.includes('flux-network network create "my-network"'), 'network name is the supported positional argument');
assert(deploySource.includes('flux-network health --miner http://127.0.0.1:8766'));
assert(deploySource.includes('flux-network topology --miner http://127.0.0.1:8766 --network-id <network-id>'));
assert(!deploySource.includes('network create --name'), 'unsupported --name syntax is absent');
assert(!deploySource.includes('network inspect'), 'unsupported network inspect command is absent');
assert(deploySource.includes("ArkUI.copyCommand({ text: step.cmd, name: 'command for ' + step.title })") && fs.readFileSync('js/ark/page-kit.js', 'utf8').includes("button.setAttribute('aria-label'"), 'every rendered command receives the site\'s one copy control, named for its step');
assert(deploySource.includes('step.expected'), 'every rendered command includes expected output');

const header = fs.readFileSync('js/resolvers/header.js', 'utf8');
assert(header.includes("['NAV.OVERVIEW', 'about']"));
assert(!header.includes("'deployment'") || !header.includes("['NAV.HOW'"), 'the Deploy page and its header link are gone');
assert(header.includes("['NAV.RUN', 'download']"));
// The intent groups are derived from each page's journey since 2026-10-19 (js/content/site-pages.js);
// the old hand-written "Evaluate" catch-all filed design mocks as live evidence and is gone
// (docs/ux-audit/pages.md P7). The menu must read the journeys, and the intents must exist.
assert(header.includes('ArkSitePages.journeys()'), 'the menu groups are derived from the journeys');
{
  const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync('js/content/site-pages.js', 'utf8'), ctx);
  const titles = ctx.ArkSitePages.journeys().map((j) => j.title);
  for (const group of ['Understand', 'Build', 'Prove', 'Run', 'Read']) assert(titles.includes(group), group + ' intent group exists');
}

console.log('PASS: Batch 2 conversion copy, status boundaries, journey CTAs, supported network commands, and intent navigation.');
