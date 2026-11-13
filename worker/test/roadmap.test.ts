// The roadmap page shows three columns, Now, Later and Shipped, and never lists internal work.
// Run with `npm test`. The test builds the site into a temporary folder and reads the HTML a visitor gets.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
let html = '';

before(() => {
  const out = mkdtempSync(join(tmpdir(), 'happli-roadmap-'));
  try {
    execFileSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], { cwd: root, stdio: 'pipe' });
    html = readFileSync(join(out, 'roadmap', 'index.html'), 'utf8');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// Each column's heading and the titles of its cards, in page order.
const columns = () =>
  [...html.matchAll(/<section class="col"[^>]*>([\s\S]*?)<\/section>/g)].map(([, body]) => ({
    label: body.match(/<h2[^>]*>(?:<span[^>]*><\/span>)?([^<]*)<\/h2>/)?.[1].trim(),
    cards: [...body.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map((m) => m[1].trim()),
  }));

test('the columns are Now, Later and Shipped, in that order', () => {
  assert.deepEqual(
    columns().map((c) => c.label),
    ['Now', 'Later', 'Shipped'],
  );
});

test('each column has its cards', () => {
  const byLabel = Object.fromEntries(columns().map((c) => [c.label, c.cards]));
  assert.deepEqual(byLabel.Now, ['Memberships', 'Square payments', 'In-person card readers', 'Approval for online bookings, service by service']);
  assert.deepEqual(byLabel.Later, ['Referrals', 'AI COO chat', 'A texting number for each studio', 'Edit your website in Happli']);
  assert.deepEqual(byLabel.Shipped, [
    'Booking on your own website',
    'Deposits with Apple Pay and Google Pay',
    'Google Business Profile connect',
    'Rewards',
    'Inventory and retail products',
    'Client source and revenue by source',
  ]);
});

test('internal or unannounced work is not listed', () => {
  assert.doesNotMatch(html, /email campaign|sentry|send window|card on file/i);
  assert.doesNotMatch(html, />Next</);
});
