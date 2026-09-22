/* =====================================================================
   PULL: materialise the published site into the project's files
   ---------------------------------------------------------------------
   Run:  node scripts/pull-site.mjs [--name subzero.ark] [--write]
         [--storage <miner STORAGE_PATH>] [--status <url>] [--pin <url>] [--key <api key>]
   With none of the miner options it finds a running Ark Miner (Desktop or CLI) itself.

   Resolves the name through a miner, fetches the archive it points at,
   decodes it, and shows which project files would change. It writes only
   with --write, because pulling replaces local edits that were never
   published. The site itself stays a static page that reads local files
   and needs no network; the mesh is where the copy is kept and shared.
   ===================================================================== */
import { pathToFileURL } from 'node:url';
import { PublishRefusal, publisherFromArgs } from './lib/publisher.mjs';
import { defaultProjectRoot, planWrite, writeProject } from './lib/site-bundle.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const publisher = publisherFromArgs(args, defaultProjectRoot);
  const { record, cid, site } = await publisher.fetchSite();
  console.log(`${publisher.name} v${record.version} -> ${cid} (${site.manifests.length} manifests, ${site.articles.length} articles, updated ${record.updatedAt})`);
  const plan = planWrite(site, defaultProjectRoot);
  if (!plan.length) { console.log('Local files already match the published site.'); return; }
  if (args.write) {
    for (const change of writeProject(site, defaultProjectRoot)) console.log(`  ${change.action.padEnd(6)} ${change.relative}`);
    console.log('Written.');
  } else {
    for (const change of plan) console.log(`  would ${change.action.padEnd(6)} ${change.relative}`);
    console.log('Nothing written. Re-run with --write to replace the local files.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => { console.error(error instanceof PublishRefusal ? error.message : (error.message || error)); process.exitCode = 1; });
}
