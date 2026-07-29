#!/usr/bin/env node
/**
 * i18n integrity check: every non-English dictionary must have exactly the
 * same keys as en.json, and every {placeholder} must match the English source.
 * Runs automatically before `npm run build` (prebuild hook).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n');
const langs = ['zh', 'es', 'ja'];

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = flatten(JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8')));
let failed = false;

for (const lang of langs) {
  const dict = flatten(JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')));
  const missing = Object.keys(en).filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !(k in en));
  const badPlaceholders = Object.keys(en).filter(
    (k) => k in dict && String(placeholders(en[k])) !== String(placeholders(dict[k]))
  );

  for (const k of missing) console.error(`[${lang}] missing: ${k}`);
  for (const k of extra) console.error(`[${lang}] extra:   ${k}`);
  for (const k of badPlaceholders)
    console.error(`[${lang}] placeholder mismatch: ${k} (en: ${en[k]})`);
  failed ||= missing.length > 0 || extra.length > 0 || badPlaceholders.length > 0;
  if (!failed) console.log(`[${lang}] OK (${Object.keys(dict).length} keys)`);
}

if (failed) {
  console.error('\ni18n check FAILED');
  process.exit(1);
}
console.log('i18n check passed');
