/* A folder site's file lookup: which archive file an address or a reference names, its content type, and
   what is "not found".
   Why this exists: the gateway shows a site someone else packed, so every address a visitor types and every
   reference a page makes must name exactly one file of the verified archive or nothing. Path tricks
   (`..`, `%2e%2e`, `//host`, an encoded slash, a double encoding) must never reach a file by a second
   spelling or leave the site. The archive here goes through the same codec the shell decodes with
   (vendor/flx-codec), in the shape bundle-deploy's src/folder-archive.js packs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeArchive, decodeArchiveAsync } from '../gateway/vendor/flx-codec/index.js';
import { readFolderSite, pageForAddress, resolveReference, rewriteCss, dataUrlOf, FOLDER_SITE_SCHEMA } from '../gateway/folder-site.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4f30000000049454e44ae426082', 'hex');
const FILES = {
  'index.html': ['text/html; charset=utf-8', '<!doctype html><title>Home</title><h1>Home</h1>'],
  'about.html': ['text/html; charset=utf-8', '<!doctype html><title>About</title>'],
  'my page.html': ['text/html; charset=utf-8', '<!doctype html><title>Spaced</title>'],
  'docs/index.html': ['text/html; charset=utf-8', '<!doctype html><title>Docs</title>'],
  'style.css': ['text/css; charset=utf-8', '@import "theme.css";\nbody { background: url(img/dot.png) }\n.x { background: url("https://example.com/a.png") }\n.y { background: url(missing.png) }\n'],
  'theme.css': ['text/css; charset=utf-8', '@import url(style.css);\nh1 { background-image: url(\'img/dot.png\') }\n'],
  'img/dot.png': ['image/png', PNG],
};

async function packed(files = FILES, { entry = 'index.html', listed } = {}) {
  const paths = Object.keys(files).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const assets = paths.map((path) => {
    const [contentType, body] = files[path];
    return Buffer.isBuffer(body)
      ? { path, contentType, payload: body.toString('base64'), encoding: 'base64', compression: 'identity' }
      : { path, contentType, payload: body, encoding: 'utf8', compression: 'identity' };
  });
  const bytes = encodeArchive({
    archiveId: 'flux-folder-site', createdAt: '1970-01-01T00:00:00.000Z', entry,
    routes: [{ routeId: 'site', path: '/', payload: { schema: FOLDER_SITE_SCHEMA, entry, files: listed || paths } }],
    assets,
  });
  return decodeArchiveAsync(bytes);
}

async function site() {
  const read = readFolderSite(await packed());
  assert.equal(read.ok, true, JSON.stringify(read));
  return read.site;
}

test('every packed file comes back byte for byte with the content type it was packed with', async () => {
  const s = await site();
  assert.equal(s.entry, 'index.html');
  assert.deepEqual([...s.files.keys()].sort(), Object.keys(FILES).sort());
  assert.deepEqual(Buffer.from(s.files.get('img/dot.png').bytes), PNG);
  assert.equal(s.files.get('img/dot.png').contentType, 'image/png');
  assert.equal(Buffer.from(s.files.get('index.html').bytes).toString('utf8'), FILES['index.html'][1]);
  assert.equal(s.files.get('style.css').contentType, 'text/css; charset=utf-8');
});

test('an archive that lists a file it does not hold, or a first page it does not hold, is refused by name', async () => {
  const listsMore = readFolderSite(await packed(FILES, { listed: [...Object.keys(FILES), 'ghost.js'] }));
  assert.deepEqual([listsMore.ok, listsMore.reason], [false, 'CONTENT_MALFORMED']);
  assert.match(listsMore.detail, /"ghost\.js".*Pack the folder again/);
  const noEntry = readFolderSite(await packed(FILES, { entry: 'start.html' }));
  assert.deepEqual([noEntry.ok, noEntry.reason], [false, 'CONTENT_MALFORMED']);
  assert.match(noEntry.detail, /"start\.html"/);
  const cms = readFolderSite({ routes: [{ routeId: 'site', payload: { schema: 'flux-chain-site/1' } }], assets: [] });
  assert.deepEqual([cms.ok, cms.reason], [false, 'SCHEMA_UNSUPPORTED']);
});

test('an address finds its page: "/" is the first page, a folder its index.html, a bare name its .html', async () => {
  const s = await site();
  const at = (address) => { const page = pageForAddress(s, address); return page.ok ? page.path : page.reason; };
  assert.equal(at('/'), 'index.html');
  assert.equal(at(''), 'index.html');
  assert.equal(at('/about.html'), 'about.html');
  assert.equal(at('/about'), 'about.html');
  assert.equal(at('/docs/'), 'docs/index.html');
  assert.equal(at('/docs'), 'docs/index.html');
  assert.equal(at('/my%20page.html'), 'my page.html');
  assert.equal(at('/missing.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('/img/'), 'PAGE_NOT_FOUND');
  const png = pageForAddress(s, '/img/dot.png');
  assert.deepEqual([png.path, png.file.contentType], ['img/dot.png', 'image/png']);
  assert.match(pageForAddress(s, '/missing.html').detail, /no page at \/missing\.html/);
});

test('path tricks never reach a file by a second spelling or leave the site', async () => {
  const s = await site();
  const at = (address) => { const page = pageForAddress(s, address); return page.ok ? page.path : page.reason; };
  // Dot segments, plain or percent-encoded, are folded by the URL parser and stop at the site's root.
  assert.equal(at('/docs/../about.html'), 'about.html');
  assert.equal(at('/docs/%2e%2e/about.html'), 'about.html');
  assert.equal(at('/docs/%2E%2E/about.html'), 'about.html');
  assert.equal(at('/../../../about.html'), 'about.html');
  assert.equal(at('/%2e%2e/%2e%2e/etc/passwd'), 'PAGE_NOT_FOUND');
  assert.equal(at('\\docs\\..\\about.html'), 'about.html');
  // Spellings that would give one file two addresses, or name another host, are not found.
  assert.equal(at('//about.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('//evil.example/about.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('/docs//index.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('/docs%2findex.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('/docs%2Findex.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('/%252e%252e/about.html'), 'PAGE_NOT_FOUND');
  assert.equal(at('/docs/%2e/index.html'), 'docs/index.html');
  assert.equal(at('/about.html%00'), 'PAGE_NOT_FOUND');
  assert.equal(at('/%E0%A4%A'), 'PAGE_NOT_FOUND');
  assert.equal(at('https://evil.example/about.html'), 'PAGE_NOT_FOUND');
});

test('a reference in a page resolves against that page, and anything off the site is named as elsewhere', async () => {
  const s = await site();
  const from = (ref, page = 'docs/index.html') => resolveReference(s, page, ref);
  assert.deepEqual([from('../style.css').kind, from('../style.css').path], ['site', 'style.css']);
  assert.equal(from('/style.css').path, 'style.css');
  assert.equal(from('../../../../style.css').path, 'style.css');
  assert.equal(from('%2e%2e/style.css').path, 'style.css');
  assert.equal(from('../img/dot.png').file.contentType, 'image/png');
  assert.deepEqual([from('../about.html#team').address, from('../about.html#team').hash], ['/about.html', '#team']);
  assert.equal(from('../my page.html').path, 'my page.html');
  const missing = from('nothing.css');
  assert.deepEqual([missing.kind, missing.path, missing.file, missing.address], ['site', null, null, '/docs/nothing.css']);
  assert.equal(from('#top').kind, 'fragment');
  assert.equal(from('').kind, 'fragment');
  assert.deepEqual(from('https://example.com/x'), { kind: 'elsewhere', url: 'https://example.com/x' });
  assert.deepEqual(from('//example.com/x'), { kind: 'elsewhere', url: 'https://example.com/x' });
  assert.equal(from('mailto:a@example.com').kind, 'elsewhere');
  assert.equal(from('data:text/plain,hi').kind, 'elsewhere');
  assert.equal(from('javascript:alert(1)').kind, 'elsewhere');
  assert.equal(from('/fxn-store/v1/' + '0'.repeat(64)).path, null, 'the store route is not a file of the site');
});

test('a style sheet\'s url() and @import become data: URLs of archive files; other hosts and missing files are left alone', async () => {
  const s = await site();
  const css = rewriteCss(s, 'style.css', Buffer.from(s.files.get('style.css').bytes).toString('utf8'));
  const dot = dataUrlOf(s.files.get('img/dot.png'));
  assert.equal(dot, `data:image/png;base64,${PNG.toString('base64')}`);
  assert.ok(css.includes(`url("${dot}")`), css);
  assert.ok(css.includes('url("https://example.com/a.png")'));
  assert.ok(css.includes('url(missing.png)'));
  // theme.css is imported as a rewritten data: URL. It imports style.css back: the cycle stops there.
  const imported = /@import url\("data:text\/css;charset=utf-8;base64,([^"]+)"\)/.exec(css);
  assert.ok(imported, css);
  const theme = Buffer.from(imported[1], 'base64').toString('utf8');
  assert.ok(theme.startsWith('@import url(style.css);'), theme);
  assert.ok(theme.includes(`url("${dot}")`), theme);
});
