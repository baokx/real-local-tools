#!/usr/bin/env node
/**
 * Renders public/og.svg to public/og.png (1200×630). Social platforms do not
 * support SVG Open Graph images, so the PNG is what og:image points to.
 * Fonts are vendored in scripts/assets/fonts so CI output is deterministic.
 * Runs automatically before `npm run build` (prebuild hook).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, 'scripts/assets/fonts');

const svg = readFileSync(join(root, 'public/og.svg'), 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    fontFiles: [join(fontDir, 'SpaceGrotesk-Bold.ttf'), join(fontDir, 'IBMPlexSans.ttf')],
    loadSystemFonts: false,
  },
  background: '#fbfaf7',
});

const png = resvg.render().asPng();
writeFileSync(join(root, 'public/og.png'), png);
console.log(`og.png written (${(png.length / 1024).toFixed(1)} KB)`);
