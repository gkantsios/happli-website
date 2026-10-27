// Marketing add-on copy (Grant's model, Oct 26, 2026). Run with `npm test`.
// The add-on "starts at $19/mo" for 2,000 credits, credits don't roll over, and launch pricing doesn't
// cover it. /pricing, the Terms and the refund policy must all say so, in the built HTML a visitor gets,
// and none of them may show the old or unpublished prices. The old $39 / 1,000 texts / 10,000 emails /
// 3 cents wording must never come back anywhere in src.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { marketingAddOn, addOnStartsAt, addOnLaunchNote } from '../../src/config/pricing.ts';

const root = new URL('../../', import.meta.url).pathname;
const textFile = /\.(astro|ts|tsx|js|mjs|md|mdx|html|css|json|txt)$/;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return textFile.test(name) ? [path] : [];
  });

// The visible text of a built page: no tags, scripts or styles, entities decoded, whitespace collapsed.
const pageText = (html: string) =>
  html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&#x27;|&apos;|&rsquo;|’/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

const pages = ['pricing', 'terms', 'refunds'];
const text: Record<string, string> = {};
let pricingHtml = '';

before(() => {
  // Build into a temporary folder so the test sees exactly what each page renders, without touching dist/.
  const out = mkdtempSync(join(tmpdir(), 'happli-addon-'));
  try {
    execFileSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], { cwd: root, stdio: 'pipe' });
    for (const page of pages) text[page] = pageText(readFileSync(join(out, page, 'index.html'), 'utf8'));
    pricingHtml = readFileSync(join(out, 'pricing', 'index.html'), 'utf8');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

const oldCopy = [
  { what: '$39', re: /\$39\b/ },
  { what: '1,000 texts', re: /\b1,000 texts\b/ },
  { what: '10,000 emails', re: /\b10,000 emails\b/ },
  { what: '3 cents per text', re: /\b3 ?¢|\b3 cents?\b/ },
];

test('the old Marketing add-on pricing appears nowhere in src or llms.txt', () => {
  const hits: string[] = [];
  for (const file of [...files(join(root, 'src')), join(root, 'public/llms.txt')]) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const { what, re } of oldCopy) if (re.test(line)) hits.push(`${file.slice(root.length)}:${i + 1} has "${what}"`);
      });
  }
  assert.deepEqual(hits, []);
});

test('the add-on starts at $19/mo for 2,000 credits, and credits do not roll over', () => {
  assert.deepEqual(marketingAddOn.starter, { credits: 2000, price: 19 });
  assert.equal(marketingAddOn.rollover, false);
  assert.equal(addOnStartsAt, 'Starts at $19/mo');
});

for (const page of pages) {
  test(`/${page}/ says the add-on starts at $19, credits don't roll over, and launch pricing doesn't cover it`, () => {
    const t = text[page];
    const startsAt = [...t.matchAll(/starts at \$(\d+)/gi)].map((m) => m[1]);
    assert.ok(startsAt.length > 0, `/${page}/ never says "starts at $19"`);
    assert.deepEqual([...new Set(startsAt)], ['19'], `/${page}/ gives another starting price: ${startsAt.join(', ')}`);
    assert.match(t, /credits don't roll over/i, `/${page}/ is missing "credits don't roll over"`);
    assert.doesNotMatch(t, /\b(?:credits?|they) (?:do |will |can |may )?(?:roll|carry) over\b/i, `/${page}/ says credits roll over`);
    assert.ok(t.includes(addOnLaunchNote), `/${page}/ is missing: ${addOnLaunchNote}`);
    const unpublished = t.match(/\$(?:39|79|159)\b/g);
    assert.equal(unpublished, null, `/${page}/ shows ${unpublished?.join(', ')}`);
  });
}

test('the /pricing add-on card itself shows $19, no roll over and the launch-pricing sentence, not only the FAQ', () => {
  const start = pricingHtml.indexOf('id="marketing"');
  assert.ok(start > 0, 'the Marketing add-on card is missing from /pricing/');
  const card = pageText(pricingHtml.slice(start, pricingHtml.indexOf('data-waitlist', start)));
  assert.match(card, /starts at \$19\b/i);
  assert.match(card, /credits don't roll over/i);
  assert.ok(card.includes(addOnLaunchNote), `the add-on card is missing: ${addOnLaunchNote}`);
});
