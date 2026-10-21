// Runs after `astro build` (see package.json): puts the sha256 hash of every inline <script> in dist/
// into the Content-Security-Policy in dist/_headers, so only the site's own scripts can run.
// JSON-LD blocks aren't executed, so they don't need hashes.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const placeholder = '{{INLINE_SCRIPT_HASHES}}';

const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

const hashes = new Set();
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs) || /type="application\/ld\+json"/.test(attrs)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
}

const headersPath = join(dist, '_headers');
const headers = readFileSync(headersPath, 'utf8');
if (!headers.includes(placeholder)) throw new Error(`csp-hashes: ${placeholder} not found in dist/_headers`);
writeFileSync(headersPath, headers.replace(placeholder, [...hashes].sort().join(' ')));
console.log(`csp-hashes: ${hashes.size} inline script hashes written to dist/_headers`);
