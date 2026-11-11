// Runs after `astro build` (see package.json): gives every link to another site rel="noopener".
// The site's components already set it; links written in Markdown (the comparison posts' sources, for
// example) and in the legal pages' HTML come out of the build without it. Inside a blog post's article
// (<article class="prose blog">), links to other sites also open in a new tab, with visually hidden
// "(opens in a new tab)" text for screen readers. Pass a folder to process it instead of dist/ (the tests
// do, for their own build).
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

const newTab = '<span class="sr-only"> (opens in a new tab)</span>';
let added = 0;
let tabbed = 0;
for (const file of htmlFiles(dist)) {
  let html = readFileSync(file, 'utf8');
  html = html.replace(/(<article\b[^>]*\bclass="prose blog"[^>]*>)([\s\S]*?)(<\/article>)/g, (_whole, open, body, close) =>
    open +
    body.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (link, attrs, text) => {
      const href = attrs.match(/\bhref="([^"]*)"/)?.[1];
      if (!href || !outside(href) || /\btarget=/.test(attrs)) return link;
      tabbed++;
      return `<a${attrs} target="_blank">${text}${newTab}</a>`;
    }) +
    close,
  );
  const out = html.replace(/<a\b([^>]*)>/g, (tag, attrs) => {
    const href = attrs.match(/\bhref="([^"]*)"/)?.[1];
    if (!href || !outside(href)) return tag;
    const rel = attrs.match(/\brel="([^"]*)"/);
    if (rel && /\bnoopener\b/.test(rel[1])) return tag;
    added++;
    return rel ? tag.replace(rel[0], `rel="${rel[1]} noopener"`) : `<a${attrs} rel="noopener">`;
  });
  if (out !== readFileSync(file, 'utf8')) writeFileSync(file, out);
}
console.log(`external-links: rel="noopener" added to ${added} links; ${tabbed} blog article links open in a new tab`);
