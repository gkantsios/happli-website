// The roadmap page shows three columns, Live, In progress and Later, and never lists internal work.
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

const text = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();

// Each column's heading, its group headings and the titles of its cards, in page order.
const columns = () =>
  [...html.matchAll(/<section class="col"[^>]*>([\s\S]*?)<\/section>/g)].map(([, body]) => ({
    label: text(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? ''),
    groups: [...body.matchAll(/<h3 class="group"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1])),
    cards: [...body.matchAll(/<(h3|h4) class="card-title"[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => text(m[2])),
  }));

test('the columns are Live, In progress and Later, in that order', () => {
  assert.deepEqual(
    columns().map((c) => c.label),
    ['Live', 'In progress', 'Later'],
  );
});

test('Live is grouped under short headings and keeps the six earlier cards', () => {
  const live = columns()[0];
  assert.deepEqual(live.groups, ['Booking', 'Calendar and front desk', 'Payments', 'Clients', 'Forms and messages', 'Reports and marketing', 'Team and studio']);
  assert.equal(live.cards.length, 44);
  for (const title of [
    'Booking on your own website',
    'Deposits with Apple Pay and Google Pay',
    'Google Business Profile connect',
    'Rewards',
    'Inventory and retail products',
    'Client source and revenue by source',
  ]) {
    assert.ok(live.cards.includes(title), `Live is missing "${title}"`);
  }
  assert.equal(new Set(live.cards).size, live.cards.length, 'a Live card is listed twice');
});

test('Live shows its first group and folds the rest behind a closed "Show all" button', () => {
  const live = html.match(/<section class="col"[^>]*aria-labelledby="rm-live"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
  const details = live.match(/<details class="more"[^>]*>/)?.[0];
  assert.ok(details, 'Live has no expand control');
  assert.doesNotMatch(details, /\sopen\b/, 'Live starts expanded');
  const [before, after] = live.split(details);
  assert.deepEqual([...before.matchAll(/<h3 class="group"[^>]*>([^<]*)</g)].map((m) => m[1]), ['Booking']);
  assert.match(after, /Show all 44 live features/);
  assert.match(after, /Show fewer/);
  // The faded preview is hidden from screen readers and isn't counted as a card.
  assert.match(after, /<div class="peek" aria-hidden="true"/);
});

test('In progress and Later have their cards', () => {
  const [, progress, later] = columns();
  assert.deepEqual(progress.cards, [
    'Memberships',
    'Square payments',
    'In-person card readers',
    'Approval for online bookings, service by service',
    'Website chat assistant',
  ]);
  assert.deepEqual(later.cards, ['Referrals', 'AI COO chat', 'A texting number for each studio', 'Edit your website in Happli']);
});

test('internal, unannounced or not-yet-live work is not listed', () => {
  assert.doesNotMatch(html, /email campaign|sentry|send window|card on file|redeem package/i);
  assert.doesNotMatch(html, />(Now|Next|Shipped)</);
  assert.equal(columns()[0].cards.filter((t) => /website/i.test(t) && /edit/i.test(t)).length, 0, 'no website editor in Live');
});
