#!/usr/bin/env node
/* Generates assets/halo/flux-blocks.png (the fallback ImageShape.load
   reads when no admin asset is defined) and js/content/assets/iceberg-blocks.js
   (the seed ArkAsset with the same bytes, base64-encoded, so the concept
   page's default image is admin-editable from the start). One generator,
   one source of truth for both: re-run after editing the pixel function
   below; never hand-edit the PNG bytes or the seed asset file. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function pixel(x, y, size) {
  const dx = (x + .5 - size / 2) / (size / 2);
  const dy = (y + .5 - size / 2) / (size / 2);
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  const tier = Math.floor(d * 5);
  return Math.max(18, Math.min(255, 255 - tier * 55));
}

function build(size) {
  const raw = Buffer.alloc((size * 1 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) raw[o++] = pixel(x, y, size);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 0;  // color type: grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function seedAssetSource(pngBytes) {
  const asset = { id: 'iceberg-blocks', label: 'Iceberg blocks (concept page)', mime: 'image/png', dataBase64: pngBytes.toString('base64') };
  return '/* One image asset\'s bytes. Edit it in admin.html: this file is not meant for hand editing. */\n' +
    'ArkAsset.define(' + JSON.stringify(asset, null, 2) + ');\n';
}

function main() {
  const size = 96;
  const png = build(size);
  const pngOut = path.join(__dirname, '..', 'assets', 'halo', 'flux-blocks.png');
  fs.writeFileSync(pngOut, png);
  console.log('wrote ' + pngOut + ' (' + size + 'x' + size + ')');
  const assetOut = path.join(__dirname, '..', 'js', 'content', 'assets', 'iceberg-blocks.js');
  fs.writeFileSync(assetOut, seedAssetSource(png));
  console.log('wrote ' + assetOut);
}

if (require.main === module) main();
