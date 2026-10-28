// /roadmap/ must show Grant's final copy (src/data/roadmap-copy.md) word for word and nothing else between the
// intro and the "Suggest a feature" footer, as a three-column board with Completed folded in <details>. Run with
// `npm test`. The test builds the site into a temporary folder and reads the HTML a visitor gets.
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

// The counts next to each heading and Completed area are numbers built from the copy, not copy text, so the
// word check leaves them out on purpose (the counts test checks them).
const withoutCounts = (html: string) => html.replace(/<span\b[^>]*\bdata-count\b[^>]*>[^<]*<\/span>/g, ' ');

// The copy as words on the page: Markdown markers and the separator between a title and its line are
// formatting, not text.
const copyWords = copy
  .split('\n')
  .filter((l) => l.trim())
  .map((l) =>
    l
      .replace(/^#{2,3} /, '')
      .replace(/^- \*\*(.+?)\*\*: /, '$1 ')
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
  assert.equal(createHash('sha256').update(copy).digest('hex'), 'c0468d5f8041eef2fc5af35d5017c0be21a70d6a40fc8799d18c6fb8ce5bf39f');
});

test('the roadmap shows the final copy word for word, and nothing else', () => {
  assert.equal(text(withoutCounts(roadmap)), copyWords);
});

test('the counts come from the copy', () => {
  const counts = [...roadmap.matchAll(/data-count[^>]*>(\d+)</g)].map((m) => +m[1]);
  const sections = copy.split(/^## /m).slice(1);
  const areas = copy.split(/^### /m).slice(1);
  const items = (s: string) => (s.match(/^- /gm) ?? []).length;
  assert.deepEqual(counts, [...sections.map(items), ...areas.map(items)]);
});

test('h2s are Planned, In progress and Completed, in that order, and the 13 Completed areas are closed <details>', () => {
  const h2 = [...roadmap.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
  assert.deepEqual(h2, ['Planned', 'In progress', 'Completed']);
  const areas = [...copy.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  assert.equal(areas.length, 13);
  const details = roadmap.match(/<details\b[^>]*>/g) ?? [];
  assert.equal(details.length, 13);
  assert.ok(details.every((d) => !/\bopen\b/.test(d)), 'every Completed area starts closed');
  const summaries = [...roadmap.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => text(withoutCounts(m[1])));
  assert.deepEqual(summaries, areas);
});

test('no dates: no month, no year and no <time> in the roadmap', () => {
  const t = text(roadmap);
  assert.doesNotMatch(t, /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/, 'a month name is on the roadmap');
  assert.doesNotMatch(t, /\b20\d\d\b/, 'a year is on the roadmap');
  assert.doesNotMatch(roadmap, /<time\b/, 'a <time> element is on the roadmap');
});

test('"Sign up online" is gone', () => {
  assert.doesNotMatch(copy, /Sign up online/);
  assert.doesNotMatch(text(html), /Sign up online/);
});

test('one <li> per copy item, no script, no tag, and notes are not links', () => {
  assert.equal((roadmap.match(/<li\b/g) ?? []).length, (copy.match(/^- /gm) ?? []).length);
  assert.doesNotMatch(roadmap, /<script\b/i, 'no script in the roadmap section');
  assert.doesNotMatch(roadmap, /class="tag"|Coming soon/, 'no tag element');
  assert.doesNotMatch(roadmap, /<a\b/, 'notes are not links');
});

test('the intro, the Suggest a feature link, the footnote, the title and the meta description', () => {
  const page = text(html);
  assert.ok(page.includes("What we're building."));
  assert.ok(page.includes("A quick look at what's on the way. Tell us what would help your studio most."));
  assert.match(html, /<a class="btn btn-coral" href="mailto:[^"?]+\?subject=Feature%20suggestion"[^>]*>Suggest a feature<\/a>/);
  assert.ok(page.includes('Plans can change. Studios on launch pricing get early access.'));
  assert.match(html, /<title>Roadmap \| What we are building next at Happli<\/title>/);
  assert.ok(
    html.includes(`<meta name="description" content="What's happening at Happli: what's planned, what's in progress and what's completed. Suggest a feature anytime.">`),
  );
});
