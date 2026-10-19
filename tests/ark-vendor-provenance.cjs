'use strict';
/* scripts/build-ark-vendor.cjs must refuse to build from a node_modules that is not the pinned
   tarball's bytes.

   Named regression (found 2026-10-19, W2-ADAPTER): a sync repacked @deadark/ark-ui 0.2.0 and
   @deadark/ark-primitives 0.2.0 under the SAME version. npm saw an unchanged version and left the
   old files in node_modules while node_modules/.package-lock.json recorded the NEW tarball's
   integrity -- so the integrity check passed, --check was green, and js/ark/vendor/ark-kit.js and
   js/settings/panel.js were built from code the pin did not name. The build now compares every
   installed file with the tarball (staleInstalledFiles); this test proves the comparison both
   ways without touching node_modules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { tarballFiles, staleInstalledFiles, vendoredPackages } = require('../scripts/build-ark-vendor.cjs');

const ROOT = path.resolve(__dirname, '..');

/* A one-file npm-style tarball (package/<name>), built here so the test needs no tar tool. */
function tgz(files) {
  const blocks = [];
  for (const [name, text] of Object.entries(files)) {
    const body = Buffer.from(text);
    const header = Buffer.alloc(512);
    header.write('package/' + name, 0, 'utf8');
    header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(body.length.toString(8).padStart(11, '0') + '\0', 124);
    header.write('00000000000\0', 136);
    header.write('0', 156);
    header.write('ustar\0', 257); header.write('00', 263);
    header.fill(' ', 148, 156);
    let sum = 0; for (const byte of header) sum += byte;
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks));
}

// The parser reads a real pinned tarball: every file under the package/ prefix, bytes intact.
const { packages, problems } = vendoredPackages();
assert.deepEqual(problems, [], 'node_modules is the pinned tarballs (run npm run sync:ark, then npm install)');
const arkUi = packages.find((p) => p.name === '@deadark/ark-ui');
const files = tarballFiles(fs.readFileSync(path.join(ROOT, arkUi.tarball)));
assert(files['package.json'] && files['dist/ark-ui.blocks.js'] && files['dist/ark-ui.blocks.css'], 'the pinned ark-ui tarball parses to its files');
assert.equal(JSON.parse(files['package.json']).version, arkUi.version);
assert.deepEqual(staleInstalledFiles('@deadark/ark-ui', fs.readFileSync(path.join(ROOT, arkUi.tarball))), [], 'the installed ark-ui is byte for byte the pinned tarball');

// A tarball whose file differs from what is installed -- the defect -- is caught, by name.
const installed = fs.readFileSync(path.join(ROOT, 'node_modules/@deadark/ark-ui/package.json'), 'utf8');
assert.deepEqual(staleInstalledFiles('@deadark/ark-ui', tgz({ 'package.json': installed })), [], 'a tarball that matches is clean');
assert.deepEqual(staleInstalledFiles('@deadark/ark-ui', tgz({ 'package.json': installed + ' ' })), ['package.json'], 'one changed byte is named');
assert.deepEqual(staleInstalledFiles('@deadark/ark-ui', tgz({ 'dist/not-installed.js': 'x' })), ['dist/not-installed.js'], 'a file the install lacks is named');

console.log('PASS: build-ark-vendor refuses a node_modules that is not the pinned tarball\'s bytes, whatever the install lock says.');
