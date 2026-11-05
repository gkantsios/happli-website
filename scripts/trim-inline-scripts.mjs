// Runs after `astro build`, before csp-hashes.mjs (see package.json): drops whole-line // comments,
// blank lines and indentation from every inline <script> in dist/. The is:inline scripts keep their
// comments in the source, but shipped they would push the home page past the size Lighthouse fits in
// its first round trips. Line breaks stay, so the code runs exactly as written. It stops the build
// if a script has a template literal or a block comment, which this simple trim can't handle safely.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;

const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

let saved = 0;
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  const out = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (tag, attrs, body) => {
    if (/\bsrc=/.test(attrs) || /type="application\/ld\+json"/.test(attrs)) return tag;
    if (body.includes('`') || body.includes('/*')) throw new Error(`trim-inline-scripts: can't safely trim a script in ${file}`);
    const lines = body.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('//'));
    return `<script${attrs}>${lines.join('\n')}</script>`;
  });
  saved += html.length - out.length;
  if (out !== html) writeFileSync(file, out);
}
console.log(`trim-inline-scripts: ${saved} bytes trimmed from inline scripts`);
