// Safe logic and governance modules are pinned copies, not hand copies (app-overlap audit 2026-11-06, finding 1).
// Rows in vendor-pins.tsv named `genesis@<commit>:<path>` or `defxn-dao@<commit>:<path>` must be that source's bytes at
// that commit. Fix drift by changing the source, then run `npm run pins`; never edit a copy. The subjects are FOUND:
// every file named in package.json "pins" must have a row. A source repo not on this machine is skipped by name
// (GENESIS_REPO, DEFXN_DAO_REPO), never counted as a pass.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const sha = (b) => createHash("sha256").update(b).digest("hex");
const rows = readFileSync(join(repo, "vendor-pins.tsv"), "utf8").split("\n").filter((l) => l && !l.startsWith("#"))
  .map((l) => { const [hash, path, source] = l.split("\t"); return { hash, path, source }; })
  .filter((r) => /^(genesis|defxn-dao)@/.test(r.source || ""));
const roots = { genesis: process.env.GENESIS_REPO || join(repo, "..", "genesis"), "defxn-dao": process.env.DEFXN_DAO_REPO || join(repo, "..", "defxn-dao") };

test("every file named in package.json pins has a row, and every row has the pinned bytes", () => {
  const pins = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).pins || [];
  const named = pins.flatMap((p) => (p.files || []).map((f) => { const n = f.split("=")[0]; return p.into === "." ? n : `${p.into}/${n}`; })).sort();
  assert.deepEqual(named, rows.map((r) => r.path).sort(), "package.json pins and vendor-pins.tsv name different files");
  const off = rows.filter((r) => sha(readFileSync(join(repo, r.path))) !== r.hash).map((r) => r.path);
  assert.deepEqual(off, [], "these differ from vendor-pins.tsv: run npm run pins from the source, never edit a copy");
});

for (const r of rows) {
  const [, repoName, commit, src] = /^([\w-]+)@([0-9a-f]{40}):(.+)$/.exec(r.source);
  const root = roots[repoName];
  let source = null;
  try { source = execFileSync("git", ["-C", root, "show", `${commit}:${src}`], { stdio: ["ignore", "pipe", "ignore"] }); } catch { source = null; }
  test(`${r.path} is ${repoName}@${commit.slice(0, 8)}:${src}`, { skip: source ? false : `source not on this machine: ${root} ${commit}` }, () => {
    assert.ok(readFileSync(join(repo, r.path)).equals(source), `${r.path} drifted from ${repoName}: change the source, then npm run pins`);
  });
}
