#!/usr/bin/env node
/**
 * Generates the icon suite from public/favicon.svg:
 *   apple-touch-icon.png   180×180, full-bleed (iOS masks the corners itself)
 *   icon-192/512.png       rounded artwork, purpose "any" in the web manifest
 *   icon-maskable-512.png  full-bleed with the wrench shrunk into the safe zone
 *   favicon.ico            16/32/48 PNGs wrapped in an ICO container
 * Runs automatically before `npm run build` (prebuild hook) so CI output
 * stays deterministic alongside scripts/build-og.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const rounded = readFileSync(join(pub, 'favicon.svg'), 'utf8');
const fullBleed = rounded.replace(' rx="14"', '');
// Wrench path is drawn in a 0..24 box; translate(8 8) scale(2) spans 16..56 of
// the 64-unit canvas. Scale 1.667 spans ~40 units, keeping the diagonally drawn
// wrench inside the maskable safe-zone circle.
const maskable = fullBleed.replace('translate(8 8) scale(2)', 'translate(12 12) scale(1.667)');

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

const jobs = [
  ['apple-touch-icon.png', fullBleed, 180],
  ['icon-192.png', rounded, 192],
  ['icon-512.png', rounded, 512],
  ['icon-maskable-512.png', maskable, 512],
];

for (const [name, svg, size] of jobs) {
  const png = render(svg, size);
  writeFileSync(join(pub, name), png);
  console.log(`${name} (${(png.length / 1024).toFixed(1)} KB)`);
}

// ICO container: ICONDIR header + one 16-byte directory entry per PNG payload.
const icoSizes = [16, 32, 48];
const pngs = icoSizes.map((s) => ({ size: s, data: render(rounded, s) }));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngs.length, 4);

let offset = 6 + pngs.length * 16;
const entries = pngs.map(({ size, data }) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});

const ico = Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
writeFileSync(join(pub, 'favicon.ico'), ico);
console.log(`favicon.ico (${(ico.length / 1024).toFixed(1)} KB, sizes ${icoSizes.join('/')})`);
