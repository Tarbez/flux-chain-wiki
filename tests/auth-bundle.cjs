// Publishing is authorised by a signed-in DeadArk identity and by nothing else. Each case names what it guards.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { execFileSync } = require('node:child_process');

// 1. js/admin/auth.js is generated. A stale copy would keep signing with old code and nothing would look wrong,
//    so rebuild into a temp file and require the bytes to match what is checked in.
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'flux-chain-auth-')), 'auth.js');
const build = fs.readFileSync('scripts/build-auth.cjs', 'utf8').replace("'--outfile=js/admin/auth.js'", JSON.stringify('--outfile=' + out));
assert(build.includes(out), 'the build script names js/admin/auth.js, so the test can redirect it');
const tmpBuild = path.join(path.dirname(out), 'build.cjs'); fs.writeFileSync(tmpBuild, build);
execFileSync(process.execPath, [tmpBuild], { cwd: process.cwd(), stdio: 'pipe' });
assert.equal(fs.readFileSync(out, 'utf8'), fs.readFileSync('js/admin/auth.js', 'utf8'), 'js/admin/auth.js is stale: run node scripts/build-auth.cjs');

// 2. The bundle is made of the shared canonical parts and carries no derivation of its own.
const entry = fs.readFileSync('scripts/auth-entry.js', 'utf8');
for (const shared of ["'@deadark/ark-ui/flux-auth'", "'@deadark/ark-ui/flux-auth-ui'", "'flux-auth/root-from-mnemonic'", "'deadark-identity-core/root-signing-handle'"]) assert(entry.includes(shared), shared);
const code = entry.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
assert(!/bip39|nacl|PBKDF2|HKDF|flux-identity-ed25519/i.test(code), 'the entry composes shared modules; it must not re-derive a root itself');

// 3. The locked page (admin.html) loads the sign-in bundle before its gate script, and may talk to its own host only.
const html = fs.readFileSync('admin.html', 'utf8');
assert(html.indexOf('js/admin/auth.js') > 0 && html.indexOf('js/admin/auth.js') < html.indexOf('js/admin/gate.js'), 'auth.js loads before gate.js');
assert(/connect-src 'self'/.test(html) && !/connect-src[^;]*http/.test(html), 'the page may connect to its own host only');

// 3b. The locked page must hold NO editor: not the editor script, not its markup. Otherwise "locked" is only a hidden div.
for (const editorPiece of ['js/admin/admin.js', 'js/admin/store.js', 'js/admin/publish.js', 'id="editor"', 'id="pageList"', 'id="publish"']) assert(!html.includes(editorPiece), 'admin.html must not contain the editor: ' + editorPiece);
// ...and the editor page must hold no key or sign-in of its own: it takes the identity from the gate, and is only ever shown to a session.
const app = fs.readFileSync('admin-app.html', 'utf8');
assert(!app.includes('js/admin/auth.js') && !app.includes('meshAuth'), 'the editor page carries no sign-in bundle');
assert(app.includes('js/admin/admin.js') && app.includes('js/admin/publish.js'));
assert(app.indexOf('js/admin/authorization-view.js') < app.indexOf('js/admin/admin.js'), 'admin editor loads the shared authorization view before its consumer');
assert(fs.existsSync('js/admin/authorization-view.js'), 'shared authorization view bundle is missing');
const authorizationEntry = fs.readFileSync('scripts/authorization-view-entry.js', 'utf8');
assert(authorizationEntry.includes("'@deadark/ark-ui/flux-authorization-view'"), 'wiki authorization bridge must consume Ark UI shared view data');

// 3c. The host's public admin files are exactly the ones the locked page loads: no more, so nothing else leaks before sign-in.
const host = fs.readFileSync('scripts/publish-host.mjs', 'utf8');
const publicAdmin = host.match(/PUBLIC_ADMIN = new Set\(\[(.*?)\]\)/)[1].split(',').map((x) => x.trim().replace(/'/g, ''));
const loadedByGate = [...html.matchAll(/src="(js\/admin\/[^"?]+)/g)].map((m) => m[1]);
assert.deepEqual(publicAdmin.sort(), loadedByGate.sort(), 'PUBLIC_ADMIN must be exactly the scripts admin.html loads');

// 4. No second authority. The old owner key was a random seed in IndexedDB that anyone at this browser could use.
//    Reintroducing it, even "as a fallback", would make every identity check bypassable.
const publish = fs.readFileSync('js/admin/publish.js', 'utf8');
for (const forbidden of [/indexedDB/i, /getRandomValues/, /importKey/, /exportSeed|importSeed|seedStore/, /pkcs8/i]) assert(!forbidden.test(publish), 'publish.js must not create, store or import a key: ' + forbidden);
assert(!/meshExport|meshImport/.test(html + app + fs.readFileSync('js/admin/admin.js', 'utf8')), 'no export/import key controls');
// The gate signs only the host's login message, never arbitrary text handed to it.
const gate = fs.readFileSync('js/admin/gate.js', 'utf8');
assert(gate.indexOf('challenge.message.indexOf(LOGIN_PREFIX)') < gate.indexOf('who.sign('), 'the gate checks the message domain before signing it');
assert(gate.indexOf('loopbackEquivalentHost(host)') < gate.indexOf('who.sign('), 'the gate checks the challenge host before signing it');

// 5. Signing out drops the key; nothing is persisted by the sign-in.
assert(/dispose\(\)/.test(entry) && /signOut/.test(entry));
assert(!/localStorage|sessionStorage|indexedDB/.test(entry), 'the sign-in must not persist anything');
const account = fs.readFileSync('js/pages/account.js', 'utf8');
assert(account.includes('ArkAdminAuth.create') && account.includes('page.arkDispose') && account.includes('auth.dispose()'), 'public account must reuse the shared Auth Kit and dispose it on page exit');
assert(account.includes('Not connected') && account.includes('Not linked') && !/0 FXN|0 Credits/.test(account), 'account must not invent live holdings or standing');
assert(account.includes("http://127.0.0.1:8766") && account.includes("'/explorer/v1/record'") && account.includes("sourceId: 'identities'") && account.includes('recordId: id'), 'account must use the exact-ID local Miner record contract');
assert(account.includes("sourceId: 'accounts'") && account.includes('accountId') && account.includes('signed account binding'), 'account must follow a signed identity-to-account binding before showing standing');
assert(account.includes("verification?.state !== 'verified'"), 'account must fail closed on unverified identity or standing records');
assert(account.includes('AbortController') && account.includes('generation') && account.includes('identityId !== id'), 'account must discard stale mesh responses when identity or route changes');
console.log('auth bundle ok: js/admin/auth.js matches its sources; publish.js holds no key of its own');
