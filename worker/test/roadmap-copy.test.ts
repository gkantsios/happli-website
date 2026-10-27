// /roadmap/ must show Grant's final copy (src/data/roadmap-copy.md) word for word and nothing else between the
// intro and the "Suggest a feature" footer. Run with `npm test`. The test builds the site into a temporary
// folder and reads the HTML a visitor gets.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const copy = readFileSync(join(root, 'src/data/roadmap-copy.md'), 'utf8');

// Visible text: no tags, scripts or styles, entities decoded, whitespace collapsed.
const text = (html: string) =>
  html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// The copy as words on the page: Markdown markers and the separators between a title, its tag, its line and
// a shipped month are formatting, not text.
const copyWords = copy
  .split('\n')
  .filter((l) => l.trim())
  .map((l) =>
    l
      .replace(/^#{2,3} /, '')
      .replace(/^- \*\*(.+?)\*\*(?: · (.+?))?: /, (_, title, tag) => `${title} ${tag ? tag + ' ' : ''}`)
      .replace(/^- (.+) — /, '$1 ')
      .replace(/^- /, ''),
  )
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();

let html = '';
let roadmap = '';

before(() => {
  const out = mkdtempSync(join(tmpdir(), 'happli-roadmap-'));
  try {
    execFileSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], { cwd: root, stdio: 'pipe' });
    html = readFileSync(join(out, 'roadmap', 'index.html'), 'utf8');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  const start = html.indexOf('data-roadmap');
  const end = html.indexOf('class="foot"', start);
  assert.ok(start > 0 && end > start, 'the roadmap section or its footer is missing');
  roadmap = html.slice(html.indexOf('>', start) + 1, html.lastIndexOf('<', end));
});

test('the copy file is still the FINAL PAGE COPY block Grant signed off on', () => {
  // A deliberate copy change updates this hash in the same commit; anything else is an accidental edit.
  assert.equal(createHash('sha256').update(copy).digest('hex'), '76565474d5abf218835add199e51afdef09364b7f9c722f723e49602ff264df3');
});

test('the roadmap shows the final copy word for word, and nothing else', () => {
  assert.equal(text(roadmap), copyWords);
});

test('the intro, the footer, the page title and the meta description are unchanged', () => {
  const page = text(html);
  assert.ok(page.includes("What we're building."));
  assert.ok(page.includes("A quick look at what's on the way. Tell us what would help your studio most."));
  assert.ok(page.includes('Suggest a feature'));
  assert.ok(page.includes('Plans can change. Studios on launch pricing get early access.'));
  assert.match(html, /<title>Roadmap \| What we are building next at Happli<\/title>/);
  assert.ok(
    html.includes(`<meta name="description" content="What's coming to Happli: what we're building now, what's next and what's later. Suggest a feature anytime.">`),
  );
});

test('real headings and one list per column and per Shipped area', () => {
  const h2 = [...roadmap.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
  assert.deepEqual(h2, ['Now', 'Next', 'Later', 'Shipped']);
  const areas = [...copy.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  const h3 = [...roadmap.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1]));
  assert.deepEqual(h3, areas);
  const lists = roadmap.match(/<ul\b/g) ?? [];
  assert.equal(lists.length, 3 + areas.length, 'one list for each of Now, Next, Later and each Shipped area');
  const items = roadmap.match(/<li\b/g) ?? [];
  assert.equal(items.length, (copy.match(/^- /gm) ?? []).length, 'one note per item');
  assert.doesNotMatch(roadmap, /<a\b/, 'notes are not links');
});

test('Square payments carries the "Coming soon" tag', () => {
  assert.match(roadmap, /<strong[^>]*>Square payments<\/strong>\s*<span class="tag"[^>]*>Coming soon<\/span>/);
  assert.equal((roadmap.match(/class="tag"/g) ?? []).length, 1);
});
