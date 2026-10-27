// Marketing add-on copy (Grant's model, Oct 26, 2026). Run with `npm test`.
// The add-on "starts at $19/mo" for 2,000 credits; the old $39 / 1,000 texts / 10,000 emails / 3 cents
// wording must never come back, and the Terms and refund policy must repeat the launch-pricing rule from
// src/config/pricing.ts word for word.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

test('the Terms and refund policy repeat the add-on launch-pricing rule word for word', () => {
  for (const page of ['src/legal/terms.html', 'src/legal/refunds.html']) {
    assert.ok(readFileSync(join(root, page), 'utf8').includes(addOnLaunchNote), `${page} is missing: ${addOnLaunchNote}`);
  }
});
