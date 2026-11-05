// Runs after `astro build` (see package.json): gives every link to another site rel="noopener".
// The site's components already set it; links written in Markdown (the comparison posts' sources, for
// example) and in the legal pages' HTML come out of the build without it. Pass a folder to process it
// instead of dist/ (the tests do, for their own build).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = process.argv[2] ? resolve(process.argv[2]) : new URL('../dist/', import.meta.url).pathname;

const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

const outside = (href) => /^https?:\/\//.test(href) && !/^https?:\/\/(www\.)?gohappli\.com(\/|$)/.test(href);

let added = 0;
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  const out = html.replace(/<a\b([^>]*)>/g, (tag, attrs) => {
    const href = attrs.match(/\bhref="([^"]*)"/)?.[1];
    if (!href || !outside(href)) return tag;
    const rel = attrs.match(/\brel="([^"]*)"/);
    if (rel && /\bnoopener\b/.test(rel[1])) return tag;
    added++;
    return rel ? tag.replace(rel[0], `rel="${rel[1]} noopener"`) : `<a${attrs} rel="noopener">`;
  });
  if (out !== html) writeFileSync(file, out);
}
console.log(`external-links: rel="noopener" added to ${added} links`);
