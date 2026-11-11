// Bundle the shared Auth Kit sign-in into a classic script for admin.html (js/admin/auth.js).
// It writes into THIS repo only. Other sites that carry the bundle are listed when stale, never written.
//
// Ark UI parts (@fxn/ui/flux-auth, -flux-auth-ui) resolve from node_modules/@fxn/*,
// the packages `npm run sync:ark` delivers; nothing here names a hub path. The fxn-auth,
// fxn-auth-client and deadark-identity-core parts are NOT Ark UI packages and are not delivered
// by sync-consumer yet, so they still come from the sibling repos' sources in this site's own
// parent directory (flux/), found relative to the site -- ARK_FLUX_ROOT overrides it.
// The other bundles this script used to build (flux-elements, authorization-view,
// local-identity) moved to scripts/build-ark-vendor.cjs on 2026-10-19.
//
// Paths are relative to the site directory (the working directory): tests/auth-bundle.cjs runs a
// copy of this file from a temp directory with --outfile redirected, so __dirname is not the site.
//
// PINNED INPUTS (round 12, flooder ZD3-6). Until round 12 this bundle, which holds the FXN ID root on every signing
// page, was built from whatever sat on disk in the sibling checkouts (a built dist folder among them) and in
// node_modules, with no commit pin and no input hash: a poisoned dependency or an uncommitted edit shipped to the
// signing pages with no gate. Now every file esbuild reads is checked before the bundle is written:
//   - a file tracked by git must be unchanged at its repo's HEAD, and that HEAD must be the commit pinned for the
//     repo in scripts/auth-inputs.tsv (`<repo>\t<commit>`; the repo is named by its main checkout's folder, so a
//     worktree counts as its repo);
//   - any other file (node_modules, an ignored dist folder) must match its sha256 in scripts/auth-inputs.lock
//     (`<sha256>\t<repo>/<path>`).
// The inputs are found from esbuild's own metafile, never from a list written here, so a new dependency fails the
// build by name until it is pinned.
//
// Round 13 (round-12 verifier, ZD3-6): the tracked-file check asked `git status --porcelain`, and the git() helper read
// any git error as clean. `git update-index --skip-worktree` hid an edited file from status, so a postinstall script
// or a local edit could change fxn-auth/src and still pass. Now each tracked file's BYTES are compared with the pinned
// commit's blob: `git hash-object <file>` must equal `git rev-parse <pin>:<path>`, and a git command that fails is a
// refusal, never a pass. The repo's HEAD no longer matters: what is checked is the bytes esbuild read against the
// pinned commit. The probe build and the real build were two esbuild runs, so a file could change between the check
// and the build: now the inputs are checked again after the real build, the real bundle (less its banner line) must
// equal the probe's bytes, and on any difference the written bundle is removed and the build refuses.
// `node scripts/build-auth.cjs --print-pins` prints both tables for the current inputs (stdout only) for review. The
// bundle's first line names the pin digest, so a served copy says what it was built from.
//
// Round 14 (owner ruling 2026-11-04, "signpins"): the bundle carries no tweetnacl. flux-claims' ed25519 and
// deadark-identity-core's root-signing-handle are WebCrypto only and refuse a runtime with no built-in Ed25519
// ("This browser cannot sign safely: it has no built-in Ed25519. Please update it."). The written bundle is grepped
// by scripts/tweetnacl-free.cjs and removed, with a refusal, if any tweetnacl code is in it.
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const site = process.cwd();
if (!fs.existsSync(path.join(site, 'scripts', 'auth-entry.js'))) throw new Error('run build-auth.cjs from the site directory (scripts/auth-entry.js not found in ' + site + ')');
const fluxRoot = process.env.ARK_FLUX_ROOT || path.resolve(site, '..');
const esbuild = path.join(site, 'node_modules', '.bin', 'esbuild');
const printPins = process.argv.includes('--print-pins');

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = (cwd, args) => { try { return execFileSync('git', ['-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
const tableOf = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'));
const refuse = (failure, missing, remedy) => { throw new Error(failure + ' Missing: ' + missing + ' To fix: ' + remedy + ' Nothing was written.'); };

/** Every file esbuild reads, as { real, repo, rel, top }: repo is the main checkout's folder name, rel the path in it. */
function inputsOf(metafile) {
  const repoCache = new Map();
  // esbuild names a module it left out (`(disabled):crypto`, a Node built-in) with a namespace prefix: no bytes to pin.
  return Object.keys(JSON.parse(fs.readFileSync(metafile, 'utf8')).inputs).filter((p) => !/^\([a-z-]+\):/.test(p)).map((p) => {
    const real = fs.realpathSync(path.resolve(site, p));
    const dir = path.dirname(real);
    if (!repoCache.has(dir)) {
      const top = git(dir, ['rev-parse', '--show-toplevel']);
      const common = top && git(dir, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
      repoCache.set(dir, top ? { top: fs.realpathSync(top), repo: path.basename(path.dirname(common)) } : null);
    }
    const r = repoCache.get(dir);
    return r ? { real, repo: r.repo, rel: path.relative(r.top, real), top: r.top } : { real, repo: '(none)', rel: real, top: null };
  });
}

function checkPins(inputs) {
  const pinnedRepos = new Map(tableOf(process.env.AUTH_INPUTS_TSV || path.join(site, 'scripts', 'auth-inputs.tsv')));
  const locked = new Map(tableOf(process.env.AUTH_INPUTS_LOCK || path.join(site, 'scripts', 'auth-inputs.lock')).map(([h, k]) => [k, h]));
  const repos = new Map(), lock = [];
  const own = fs.realpathSync(git(site, ['rev-parse', '--show-toplevel']) || site);
  for (const i of inputs) {
    // This site's own files (scripts/auth-entry.js) are committed with the bundle they build; tests/auth-bundle.cjs
    // rebuilds and compares them.
    if (i.top === own) continue;
    const tracked = i.top && git(i.top, ['ls-files', '--error-unmatch', '--', i.rel]) !== null;
    if (tracked) {
      if (printPins) { repos.set(i.repo, git(i.top, ['rev-parse', 'HEAD'])); continue; }
      if (!pinnedRepos.has(i.repo)) refuse(`The bundle reads ${i.repo}/${i.rel}, and scripts/auth-inputs.tsv pins no commit for ${i.repo}.`, `a "${i.repo}<TAB><commit>" row.`, 'review that repo at the commit it is on and add the row.');
      const pin = pinnedRepos.get(i.repo);
      repos.set(i.repo, pin);
      const want = git(i.top, ['rev-parse', '--verify', '--quiet', `${pin}:${i.rel}`]);
      if (!want) refuse(`The pinned commit ${pin} of ${i.repo} holds no ${i.rel}, or git could not read it.`, `${i.rel} at ${i.repo} ${pin}.`, 'review the file at a commit that holds it and update scripts/auth-inputs.tsv.');
      const have = git(i.top, ['hash-object', '--', i.rel]);
      if (!have) refuse(`git could not hash ${i.repo}/${i.rel}, so its bytes are unchecked.`, 'a readable file in a working git checkout.', 'check the checkout, then build again.');
      if (have !== want) refuse(`${i.repo}/${i.rel} on disk (blob ${have}) is not the file at the pinned commit ${pin} (blob ${want}).`, 'the pinned bytes.', 'restore the file to the pinned commit (git checkout <pin> -- <file>; mind skip-worktree), or review the new bytes and update scripts/auth-inputs.tsv.');
    } else {
      const key = `${i.repo}/${i.rel}`, h = sha256(i.real);
      lock.push(`${h}\t${key}`);
      if (printPins) continue;
      if (!locked.has(key)) refuse(`The bundle reads ${key}, which no commit names, and scripts/auth-inputs.lock has no hash for it.`, `a "<sha256><TAB>${key}" row.`, 'review the file and add its hash (node scripts/build-auth.cjs --print-pins).');
      if (locked.get(key) !== h) refuse(`${key} hashes to ${h}, and scripts/auth-inputs.lock pins ${locked.get(key)}.`, 'the pinned bytes.', 'restore the pinned package, or review the new bytes and update the lock.');
    }
  }
  const tsv = [...repos].sort().map(([r, c]) => `${r}\t${c}`);
  return { tsv, lock: lock.sort(), digest: crypto.createHash('sha256').update(tsv.join('\n') + '\n' + lock.sort().join('\n')).digest('hex') };
}

const ALIASES = [
  '--alias:fxn-auth/root-from-mnemonic=' + fluxRoot + '/fxn-auth/src/rootFromMnemonic.mjs',
  '--alias:fxn-auth/wallet-signing-handle=' + fluxRoot + '/fxn-auth/src/walletSigningHandle.mjs',
  '--alias:fxn-auth/wallet-lifecycle=' + fluxRoot + '/fxn-auth/src/walletLifecycle.mjs',
  '--alias:fxn-auth/public-ids=' + fluxRoot + '/fxn-auth/src/publicIds.mjs',
  '--alias:fxn-auth/sealed-key=' + fluxRoot + '/fxn-auth/src/sealedKey.mjs',
  '--alias:fxn-auth/root-keys=' + fluxRoot + '/fxn-auth/src/rootKeys.mjs',
  '--alias:fxn-auth/wallet-delegation=' + fluxRoot + '/fxn-auth/src/walletDelegation.mjs',
  '--alias:fxn-auth/wallet-registry=' + fluxRoot + '/fxn-auth/src/walletRegistry.mjs',
  '--alias:fxn-auth/claim-scope-resolver=' + fluxRoot + '/fxn-auth/src/claimScopeResolver.mjs',
  '--alias:fxn-auth/auth-kit-create=' + fluxRoot + '/fxn-auth/src/authKitCreate.mjs',
  '--alias:fxn-auth/fxn-id-gate=' + fluxRoot + '/fxn-auth/src/fxnIdGate.mjs',
  // one ark-ui in the bundle: fxn-auth's own modules import it too, and its node_modules links the source tree, not
  // this site's delivered package, so both resolve to the copy the entry uses. fxn-auth still imports the
  // permanent alias name @deadark/ark-ui, which this site no longer installs, so that name points at the same file.
  '--alias:@fxn/ui/flux-auth=' + path.join(site, 'node_modules/@fxn/ui/dist/ark-ui.flux-auth.js'),
  '--alias:@deadark/ark-ui/flux-auth=' + path.join(site, 'node_modules/@fxn/ui/dist/ark-ui.flux-auth.js'),
  '--alias:fxn-auth-client/wallet-mesh=' + fluxRoot + '/fxn-auth-client/src/wallet-mesh.mjs',
  '--alias:deadark-identity-core/root-signing-handle=' + fluxRoot + '/deadark-identity-core/dist/identity/root-signing-handle.js',
];
const OUTFILE_ARG = '--outfile=js/admin/auth.js';
const BASE = ['scripts/auth-entry.js', '--bundle', '--format=iife', '--global-name=ArkAdminAuth', '--minify', '--legal-comments=none', ...ALIASES];
// Pass 1 reads the inputs (into a temp folder); the pins are checked; only then is the bundle written.
const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'build-auth-'));
execFileSync(esbuild, [...BASE, '--metafile=' + path.join(probe, 'meta.json'), '--outfile=' + path.join(probe, 'probe.js'), '--log-level=error'], { stdio: 'inherit' });
const pins = checkPins(inputsOf(path.join(probe, 'meta.json')));
/** The bundle's output path: the one --outfile the real build names (tests/auth-bundle.cjs redirects that string). */
function BASE_OUT() { return OUTFILE_ARG.slice('--outfile='.length); }
if (printPins) {
  fs.rmSync(probe, { recursive: true, force: true });
  console.log('# scripts/auth-inputs.tsv\n' + pins.tsv.join('\n') + '\n# scripts/auth-inputs.lock\n' + pins.lock.join('\n'));
  process.exit(0);
}
const probeBytes = fs.readFileSync(path.join(probe, 'probe.js'));
execFileSync(esbuild, [
  ...BASE,
  '--banner:js=/* FXN sign-in bundle, built from pinned inputs: scripts/auth-inputs.tsv and .lock, digest ' + pins.digest + ' */',
  '--metafile=' + path.join(probe, 'meta2.json'),
  OUTFILE_ARG,
], { stdio: 'inherit' });
{
  // Round 13 (ZD3-6): the bundle written must be built from the bytes that were checked. The inputs are checked again,
  // and the bundle less its banner line must be the probe's bytes; otherwise it is removed and the build refuses.
  const outfile = BASE_OUT();
  const written = fs.readFileSync(outfile);
  const cut = written.indexOf(0x0a);
  const again = (() => { try { return checkPins(inputsOf(path.join(probe, 'meta2.json'))); } catch (error) { fs.rmSync(outfile, { force: true }); throw error; } })();
  fs.rmSync(probe, { recursive: true, force: true });
  if (again.digest !== pins.digest || cut < 0 || Buffer.compare(written.subarray(cut + 1), probeBytes) !== 0) {
    fs.rmSync(outfile, { force: true });
    refuse('An input of the sign-in bundle changed between the check and the build.', 'inputs that hold still while the bundle is built.', 'stop whatever is writing the sibling checkouts or node_modules, then build again.');
  }
  // Round 14 (owner ruling 2026-11-04): no tweetnacl in a signing page. The built bytes are grepped (scripts/
  // tweetnacl-free.cjs), so a dependency that brings tweetnacl back fails the build by name, and nothing is left behind.
  const marks = require(path.join(site, 'scripts', 'tweetnacl-free.cjs')).tweetnaclMarks(written);
  if (marks.length) {
    fs.rmSync(outfile, { force: true });
    refuse(`The sign-in bundle carries tweetnacl code (found: ${marks.join(', ')}).`, 'a bundle whose every Ed25519 path is WebCrypto, refusing a runtime without it.', 'find the input that imports tweetnacl (node scripts/build-auth.cjs --print-pins lists them) and move it to the native-only helper.');
  }
  // 2026-11-05 (owner ruling: one type scale, one spacing scale): the Auth Kit panel's sizes and spacing keep
  // Ark's Dead Ark values; on FXN screens every one is a step. The kit's fixers (assets/kit, synced from
  // flux/defxn-product-kit) move them, after the checks above have proved the bytes esbuild wrote.
  const { scaleBundle } = require(path.join(site, 'assets', 'kit', 'space-scale.mjs'));
  fs.writeFileSync(outfile, scaleBundle(written.toString('utf8'), outfile));
}
// Other sites that carry this Auth Kit bundle are LISTED when their copy differs, never written.
// Until 2026-10-23 this step wrote the fresh bundle into every sibling site under flux/. Run from
// a worktree, flux/ is the parent, so it wrote into other repos' MAIN folders, where other sessions
// keep unsaved work: the same kind of write that destroyed work in nine main trees on 2026-10-22.
// The owner ruled (2026-10-23) that this script writes only into its own repo. Each consumer takes
// a new bundle in a change of its own. Why the list still matters: genesis, defxn-dao and treasury
// once froze on an Oct 12 build whose reader accepted only `version: 1`, and every v9 kit failed
// there (2026-10-16). The consumer list is derived, not written down: any sibling site whose
// js/admin/auth.js (or ARK Browser's renderer vendor copy) is this bundle (`var ArkAdminAuth=`).
{
  const built = fs.readFileSync('js/admin/auth.js');
  for (const sibling of fs.readdirSync(fluxRoot)) {
    for (const rel of ['js/admin/auth.js', 'src/renderer/vendor/ark-admin-auth.js']) {
      const target = path.join(fluxRoot, sibling, rel);
      if (path.join(fluxRoot, sibling) === site || !fs.existsSync(target)) continue;
      if (!fs.readFileSync(target, 'utf8').slice(0, 400).includes('var ArkAdminAuth=')) continue; // after the pin banner since round 12
      if (Buffer.compare(fs.readFileSync(target), built) === 0) continue;
      console.log('[build-auth] differs, not written: ' + path.relative(fluxRoot, target) + '. Remedy: take the new bundle in that repo, in a change of its own.');
    }
  }
}
