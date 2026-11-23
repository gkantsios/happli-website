// Beauty Business Snapshot (/api/snapshot and /snapshot/). Run with `npm test`.
// The database is an in-memory SQLite (node:sqlite) built from the real migration, behind a small
// D1-shaped wrapper. fetch is mocked, so nothing reaches Cloudflare. The page checks build the site
// into a temporary folder and read the HTML a visitor gets.
import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleSnapshot, pickLevel, compare, type D1Like, type D1Statement, type SnapshotEnv, type Results } from '../snapshot.ts';
import { normalizeCity, regionForCity, regionForZip } from '../snapshot-regions.ts';
import { K_MIN, questions } from '../../src/config/snapshot.ts';

const root = new URL('../../', import.meta.url).pathname;
const migration = readFileSync(join(root, 'migrations/0001_snapshot.sql'), 'utf8');

// A D1-shaped wrapper over node:sqlite: prepare/bind/first/all/run, and batch as one transaction.
function d1(): D1Like & { sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  sql.exec(migration);
  const stmt = (query: string, params: unknown[] = []): D1Statement => ({
    bind: (...values: unknown[]) => stmt(query, values),
    first: async <T,>() => (sql.prepare(query).get(...(params as never[])) ?? null) as T | null,
    all: async <T,>() => ({ results: sql.prepare(query).all(...(params as never[])) as T[] }),
    run: async () => sql.prepare(query).run(...(params as never[])),
  });
  return {
    sql,
    prepare: (query: string) => stmt(query),
    batch: async (statements: D1Statement[]) => {
      sql.exec('BEGIN');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sql.exec('COMMIT');
        return out;
      } catch (err) {
        sql.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

const limiter = { limit: async () => ({ success: true }) };
let db: ReturnType<typeof d1>;
let env: SnapshotEnv;
let turnstileOk: boolean;
let calls: string[];
const realFetch = globalThis.fetch;

beforeEach(() => {
  db = d1();
  env = { SNAPSHOT_DB: db, SNAPSHOT_HASH_SECRET: 'test-pepper', TURNSTILE_SECRET_KEY: 'ts-secret', SNAPSHOT_RATE_LIMITER: limiter };
  turnstileOk = true;
  calls = [];
  globalThis.fetch = (async (url: string | URL) => {
    calls.push(String(url));
    return Response.json({ success: turnstileOk, hostname: 'gohappli.com' });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

const bands = Object.fromEntries(questions.map((q) => [q.name, q.bands[1].value]));
const good = { zip: '74103', ...bands, email: 'Owner@Example.com', first_name: 'Pat', 'cf-turnstile-response': 'tok-7f3a9' };

function post(fields: Record<string, string>, services: string[] = ['spray_tan', 'lashes'], host = 'gohappli.com') {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  for (const s of services) body.append('services', s);
  return new Request(`https://${host}/api/snapshot`, {
    method: 'POST', body, headers: { accept: 'application/json', origin: `https://${host}`, 'cf-connecting-ip': '203.0.113.9' },
  });
}
type Reply = { ok: boolean; code?: string; field?: string; duplicate?: boolean; results?: Results };
const send = async (req: Request, e = env) => {
  const res = await handleSnapshot(req, e);
  return { status: res.status, body: (await res.json()) as Reply };
};
const rows = (table: string) => db.sql.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

// Adds `n` answers straight into the table (bypassing the API), for the fallback tests.
function seed(n: number, region: { city: string; metro: string | null; state: string }) {
  const cols = questions.map((q) => q.name);
  const ins = db.sql.prepare(`INSERT INTO snapshot_answers (id, city_key, metro_key, state, services, ${cols.join(', ')}) VALUES (${Array(5 + cols.length).fill('?').join(', ')})`);
  for (let i = 0; i < n; i++) ins.run(crypto.randomUUID(), region.city, region.metro, region.state, ',hair,', ...cols.map((c) => bands[c]));
}

// k = 15 fallback order

test('pickLevel: city, then metro, then state, then national, each only at K_MIN or more', () => {
  assert.equal(K_MIN, 15);
  assert.equal(pickLevel({ city: 15, metro: 40, state: 90, national: 500 }), 'city');
  assert.equal(pickLevel({ city: 14, metro: 15, state: 90, national: 500 }), 'metro');
  assert.equal(pickLevel({ city: 14, metro: 14, state: 15, national: 500 }), 'state');
  assert.equal(pickLevel({ city: 14, metro: null, state: 15, national: 500 }), 'state');
  assert.equal(pickLevel({ city: 3, metro: 9, state: 14, national: 15 }), 'national');
  assert.equal(pickLevel({ city: 14, metro: 14, state: 14, national: 14 }), null);
});

test('compare falls back city → metro → state → national → sample, and says so', async () => {
  const tulsa = regionForZip('74103')!;
  const show = async () => compare(db, tulsa);

  let r = await show();
  assert.equal(r.sample, true);
  assert.equal(r.count, null);
  assert.match(r.fallback!, /sample/);

  seed(15, { city: 'tx:dallas', metro: '19100', state: 'TX' });
  r = await show();
  assert.deepEqual([r.level, r.sample, r.count, r.place], ['national', false, 15, 'the US']);
  assert.equal(r.fallback, 'Not enough answers in Oklahoma yet — here is the national picture.');

  seed(15, { city: 'ok:enid', metro: '21420', state: 'OK' });
  r = await show();
  assert.deepEqual([r.level, r.count, r.place], ['state', 15, 'Oklahoma']);
  assert.equal(r.fallback, 'Not enough local answers yet — here is Oklahoma.');

  seed(15, { city: 'ok:broken-arrow', metro: '46140', state: 'OK' });
  r = await show();
  assert.deepEqual([r.level, r.count, r.place], ['metro', 15, 'the Tulsa area']);
  assert.equal(r.fallback, 'Not enough answers in Tulsa yet — here is the Tulsa area.');

  seed(14, { city: 'ok:tulsa', metro: '46140', state: 'OK' });
  assert.equal((await show()).level, 'metro', '14 in the city is not enough');
  seed(1, { city: 'ok:tulsa', metro: '46140', state: 'OK' });
  r = await show();
  assert.deepEqual([r.level, r.count, r.place, r.fallback], ['city', 15, 'Tulsa', null]);
  assert.equal(r.groups.services.hair, 15);
  assert.equal(r.groups.team[bands.team], 15);
});

test('a city with no metro area skips straight to the state', async () => {
  const region = { ...regionForZip('74103')!, cityKey: 'ok:nowhere', city: 'Nowhere', metroKey: null, metro: null };
  seed(20, { city: 'ok:elsewhere', metro: null, state: 'OK' });
  const r = await compare(db, region);
  assert.equal(r.level, 'state');
});

// Storage: two tables that cannot be joined

test('the answers table holds no id, hash, email, ZIP or time that could link it to a contact', () => {
  const cols = (t: string) => (db.sql.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
  const answers = cols('snapshot_answers');
  const contacts = cols('snapshot_contacts');
  assert.deepEqual(answers.filter((c) => contacts.includes(c)), ['id'], 'the only shared column name is each table\'s own primary key');
  // lead_time is the "how far out are you booked" band, not a timestamp.
  for (const c of answers.filter((c) => c !== 'lead_time')) assert.doesNotMatch(c, /email|hash|zip|postal|name|ip|agent|time|date|created|period|contact/i, c);
  assert.ok(!contacts.some((c) => /time|date|created|ip|agent|zip/i.test(c)), 'no exact time, IP or ZIP on contacts');
  assert.doesNotMatch(migration.replace(/--.*$/gm, ''), /REFERENCES|FOREIGN KEY|AUTOINCREMENT|CURRENT_TIMESTAMP|datetime\(/i);
  for (const t of ['snapshot_answers', 'snapshot_contacts']) {
    assert.equal((db.sql.prepare(`PRAGMA foreign_key_list(${t})`).all()).length, 0);
    assert.throws(() => db.sql.prepare(`SELECT rowid FROM ${t}`).all(), /rowid/, `${t} must be WITHOUT ROWID (no insertion order)`);
  }
});

test('a submission saves one answers row and one contact row that share nothing', async () => {
  const { status, body } = await send(post(good));
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.duplicate, false);
  const [a] = rows('snapshot_answers');
  const [c] = rows('snapshot_contacts');
  assert.ok(a && c);
  assert.notEqual(a.id, c.id);
  assert.match(String(a.id), /^[0-9a-f-]{36}$/);
  assert.match(String(c.id), /^[0-9a-f-]{36}$/);
  const answerValues = Object.values(a).map(String);
  for (const v of [c.id, c.email, c.email_hash, c.first_name, c.period]) assert.ok(!answerValues.includes(String(v)), `answers row holds ${v}`);
  assert.deepEqual({ city: a.city_key, metro: a.metro_key, state: a.state, services: a.services }, { city: 'ok:tulsa', metro: '46140', state: 'OK', services: ',lashes,spray_tan,' });
  assert.equal(c.email, 'owner@example.com');
  assert.equal(c.first_name, 'Pat');
  assert.match(String(c.email_hash), /^[0-9a-f]{64}$/);
  assert.match(String(c.period), /^\d{4}-\d{2}$/, 'only a coarse month');
});

test('the raw ZIP and the IP are not stored anywhere', async () => {
  await send(post({ ...good, zip: '74103-1234' }));
  const everything = JSON.stringify([rows('snapshot_answers'), rows('snapshot_contacts')]);
  assert.ok(!everything.includes('74103'));
  assert.ok(!everything.includes('203.0.113.9'));
});

test('city and state work without a ZIP, and "Tulsa" and "tulsa" share a bucket', async () => {
  const { zip: _zip, ...noZip } = good;
  await send(post({ ...noZip, city: 'Tulsa', state: 'OK' }));
  await send(post({ ...noZip, city: '  tulsa ', state: 'ok', email: 'second@example.com' }));
  assert.deepEqual(rows('snapshot_answers').map((r) => r.city_key), ['ok:tulsa', 'ok:tulsa']);
  assert.equal(normalizeCity('St. Louis'), normalizeCity('saint louis'));
  assert.equal(regionForCity('St. Louis', 'MO')?.metroKey, '41180');
});

test('unknown ZIP, unknown city and no location are clear 400s, and nothing is stored', async () => {
  const { zip: _zip, ...noZip } = good;
  for (const [fields, code] of [
    [{ ...good, zip: '00000' }, 'unknown_zip'],
    [{ ...good, zip: 'abcde' }, 'unknown_zip'],
    [{ ...noZip, city: 'Not A Real Town', state: 'OK' }, 'unknown_city'],
    [{ ...noZip, city: 'Tulsa', state: 'ZZ' }, 'unknown_city'],
    [noZip, 'missing_location'],
  ] as const) {
    const { status, body } = await send(post(fields));
    assert.equal(status, 400, code);
    assert.equal(body.code, code);
  }
  assert.equal(rows('snapshot_answers').length + rows('snapshot_contacts').length, 0);
});

test('one submission per email: a repeat (any case) stores nothing new but still gets results', async () => {
  await send(post(good));
  const again = await send(post({ ...good, email: '  OWNER@example.COM ', team: 'solo' }));
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.ok(again.body.results);
  assert.equal(rows('snapshot_answers').length, 1, 'the repeat answers row was rolled back');
  assert.equal(rows('snapshot_contacts').length, 1);
});

test('the email hash is an HMAC keyed by SNAPSHOT_HASH_SECRET, not a plain hash', async () => {
  await send(post(good));
  const hash = rows('snapshot_contacts')[0].email_hash;
  const plain = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('owner@example.com'))).toString('hex');
  assert.notEqual(hash, plain);
  const other = d1();
  await send(post(good), { ...env, SNAPSHOT_DB: other, SNAPSHOT_HASH_SECRET: 'another-pepper' });
  assert.notEqual((other.sql.prepare('SELECT email_hash FROM snapshot_contacts').get() as { email_hash: string }).email_hash, hash);
});

// Validation

test('answers outside the allowlist are rejected and nothing is stored', async () => {
  for (const q of questions) {
    const { status, body } = await send(post({ ...good, [q.name]: 'not-a-band' }));
    assert.equal(status, 400, q.name);
    assert.deepEqual([body.code, body.field], ['invalid_answers', q.name]);
    const missing = { ...good } as Record<string, string>;
    delete missing[q.name];
    assert.equal((await send(post(missing))).body.field, q.name);
  }
  assert.equal((await send(post(good, ['spray_tan', 'tattoos']))).body.field, 'services');
  assert.equal((await send(post(good, []))).body.field, 'services');
  assert.equal((await send(post({ ...good, revenue: '12500' }))).body.field, 'revenue', 'no typed dollar amounts');
  assert.equal(rows('snapshot_answers').length + rows('snapshot_contacts').length, 0);
});

test('a missing or invalid email is rejected', async () => {
  for (const email of ['', 'nope', 'a@b']) {
    const { status, body } = await send(post({ ...good, email }));
    assert.equal(status, 400);
    assert.equal(body.code, 'invalid_email');
  }
  assert.equal(rows('snapshot_contacts').length, 0);
});

// Guards

test('fails closed (503, generic) without D1, the hash secret, the rate limiter or Turnstile', async () => {
  for (const name of ['SNAPSHOT_DB', 'SNAPSHOT_HASH_SECRET', 'SNAPSHOT_RATE_LIMITER', 'TURNSTILE_SECRET_KEY'] as const) {
    const { status, body } = await send(post(good), { ...env, [name]: undefined });
    assert.equal(status, 503, name);
    assert.deepEqual(body, { ok: false, code: 'not_configured' });
  }
  assert.equal(calls.length, 0);
});

test('Turnstile is skipped only on localhost, and only when no secret is set', async () => {
  const local = await send(post(good, undefined, 'localhost:8787'), { ...env, TURNSTILE_SECRET_KEY: undefined });
  assert.equal(local.status, 200);
  assert.equal(calls.length, 0);
  const withSecret = await send(post({ ...good, email: 'b@example.com' }, undefined, 'localhost:8787'));
  assert.equal(withSecret.status, 200);
  assert.equal(calls.length, 1, 'with a secret, localhost is verified too');
});

test('failed Turnstile is 403 and stores nothing', async () => {
  turnstileOk = false;
  const { status, body } = await send(post(good));
  assert.equal(status, 403);
  assert.equal(body.code, 'verification_failed');
  assert.equal(rows('snapshot_answers').length + rows('snapshot_contacts').length, 0);
});

test('honeypot gets a normal-looking reply and stores nothing', async () => {
  const { status, body } = await send(post({ ...good, website: 'http://spam.example' }));
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(rows('snapshot_answers').length + rows('snapshot_contacts').length, 0);
  assert.equal(calls.length, 0);
});

test('other origins, other methods and big bodies are refused', async () => {
  const req = post(good);
  const foreign = new Request(req.url, { method: 'POST', body: await req.formData(), headers: { accept: 'application/json', origin: 'https://evil.example' } });
  assert.equal((await handleSnapshot(foreign, env)).status, 403);
  assert.equal((await handleSnapshot(new Request('https://gohappli.com/api/snapshot'), env)).status, 405);
  const big = new Request('https://gohappli.com/api/snapshot', {
    method: 'POST', body: new URLSearchParams({ ...good, first_name: 'x'.repeat(9000) }).toString(),
    headers: { accept: 'application/json', origin: 'https://gohappli.com', 'content-type': 'application/x-www-form-urlencoded' },
  });
  assert.equal((await send(big)).status, 413);
});

test('rate limited is 429', async () => {
  const { status, body } = await send(post(good), { ...env, SNAPSHOT_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(status, 429);
  assert.equal(body.code, 'rate_limited');
});

test('nothing personal is logged', async () => {
  const logged: unknown[] = [];
  const orig = { error: console.error, warn: console.warn, log: console.log };
  console.error = console.warn = console.log = (...m: unknown[]) => logged.push(...m);
  try {
    turnstileOk = false;
    await send(post(good));
    await send(post(good), { ...env, SNAPSHOT_HASH_SECRET: undefined });
    const broken: D1Like = { prepare: () => { throw new Error('D1_ERROR: owner@example.com 74103'); }, batch: async () => [] };
    turnstileOk = true;
    assert.equal((await send(post(good), { ...env, SNAPSHOT_DB: broken })).status, 500);
  } finally {
    Object.assign(console, orig);
  }
  const text = logged.map(String).join(' ');
  assert.ok(text.length > 0);
  for (const secret of ['example.com', 'owner', 'Pat', '74103', '203.0.113.9', 'tok-7f3a9', 'test-pepper']) assert.ok(!text.includes(secret), secret);
});

// The page

let html = '';
let sitemap = '';
before(() => {
  const out = mkdtempSync(join(tmpdir(), 'happli-snapshot-'));
  try {
    execFileSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], { cwd: root, stdio: 'pipe' });
    html = readFileSync(join(out, 'snapshot', 'index.html'), 'utf8');
    sitemap = readdirSync(out).filter((f) => f.startsWith('sitemap')).map((f) => readFileSync(join(out, f), 'utf8')).join('\n');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('/snapshot/ is noindex, not in the sitemap, and has no sticky demo bar', () => {
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(sitemap, /\/roadmap\//, 'the sitemap was not read');
  assert.doesNotMatch(sitemap, /snapshot/);
  assert.doesNotMatch(html, /data-sticky-cta/);
});

test('/snapshot/ shows the privacy promises above the submit button', () => {
  const text = html.replace(/&#39;|&apos;/g, "'");
  const submit = text.indexOf('See how I compare');
  for (const promise of [
    'We never connect your email to your answers.',
    'We never ask for your business name.',
    'We only ask for ranges, not exact numbers.',
    'Your answers and your email are stored in separate tables, with no link between them.',
    'We use your email to prevent spam and to send you the results or the annual report.',
    'We do not sell your answers or your email.',
  ]) {
    const at = text.indexOf(promise);
    assert.ok(at > 0 && at < submit, promise);
  }
  assert.match(html, /A free public benchmark from Happli/);
});

// The brand is spelled in pieces so this file itself never contains the name.
const competitor = new RegExp(['my', 'sun', 'less'].join(''), 'i');

test('/snapshot/ never names the competitor brand and asks for no business name or exact amount', () => {
  assert.doesNotMatch(html, competitor);
  const names = [...html.matchAll(/<(?:input|select)\b[^>]*\bname="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(names)].sort(), ['city', 'email', 'first_name', 'services', 'state', 'website', 'zip', ...questions.map((q) => q.name)].sort());
  assert.doesNotMatch(html, /<input\b[^>]*type="number"/);
});
