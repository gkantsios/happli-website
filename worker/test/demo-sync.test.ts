import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { syncDemoBookings, LOOKBACK_MS } from '../demo-sync.ts';

const NOW = new Date('2026-10-22T12:00:00Z');
const env = { TIDYCAL_API_TOKEN: 'tc', TIDYCAL_BOOKING_TYPE_ID: '2132151', KIT_API_KEY: 'kk', KIT_DEMO_TAG_ID: '24907991' };
const recent = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
const old = new Date(NOW.getTime() - LOOKBACK_MS - 60 * 1000).toISOString();
const bk = (o: Record<string, unknown>) => ({ booking_type_id: 2132151, created_at: recent, cancelled_at: null, deleted_at: null, contact: { email: 'a@example.com', name: 'Ann Lee' }, ...o });

const realFetch = globalThis.fetch;
const realLog = console.log;
const realErr = console.error;
let logs: string[] = [];
afterEach(() => { globalThis.fetch = realFetch; console.log = realLog; console.error = realErr; });

function mock(pages: unknown[][], kitStatus = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];
  logs = [];
  console.log = (m: string) => logs.push(m);
  console.error = (m: string) => logs.push(m);
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith('https://tidycal.com/api/bookings')) {
      const page = Number(new URL(url).searchParams.get('page'));
      const next = page < pages.length ? `https://tidycal.com/api/bookings?page=${page + 1}` : null;
      return Response.json({ data: pages[page - 1] ?? [], next_page_url: next });
    }
    return Response.json({}, { status: kitStatus });
  }) as typeof fetch;
  return calls;
}
const kitCalls = (c: { url: string; init?: RequestInit }[]) => c.filter((x) => x.url.includes('convertkit'));

test('tags a new demo booking and sends the right request', async () => {
  const calls = mock([[bk({})]]);
  const r = await syncDemoBookings(env, NOW);
  assert.deepEqual(r, { ok: true, matched: 1, tagged: 1, failed: 0 });
  const tc = calls[0];
  assert.match(tc.url, /starts_at=2026-10-22T11%3A30%3A00Z/);
  assert.equal((tc.init!.headers as Record<string, string>).Authorization, 'Bearer tc');
  const k = kitCalls(calls)[0];
  assert.equal(k.url, 'https://api.convertkit.com/v3/tags/24907991/subscribe');
  assert.deepEqual(JSON.parse(String(k.init!.body)), { api_key: 'kk', email: 'a@example.com', first_name: 'Ann' });
});

test('skips other types, cancelled, deleted, old and bad-email bookings', async () => {
  const calls = mock([[
    bk({ booking_type_id: 105143 }), bk({ cancelled_at: recent }), bk({ deleted_at: recent }),
    bk({ created_at: old }), bk({ contact: { email: 'nope' } }), bk({ contact: null }),
  ]]);
  const r = await syncDemoBookings(env, NOW);
  assert.equal(r.matched, 0);
  assert.equal(kitCalls(calls).length, 0);
});

test('pages through and de-duplicates emails', async () => {
  const calls = mock([[bk({})], [bk({ contact: { email: 'A@example.com', name: '' } }), bk({ contact: { email: 'b@example.com' } })]]);
  const r = await syncDemoBookings(env, NOW);
  assert.equal(r.tagged, 2);
  assert.equal(calls.filter((c) => c.url.includes('tidycal')).length, 2);
  assert.equal(JSON.parse(String(kitCalls(calls)[1].init!.body)).first_name, undefined);
});

test('fails closed when a secret or var is missing', async () => {
  for (const k of Object.keys(env)) {
    const calls = mock([[bk({})]]);
    const r = await syncDemoBookings({ ...env, [k]: '' }, NOW);
    assert.equal(r.reason, 'not_configured');
    assert.equal(calls.length, 0);
  }
});

test('stops on a TidyCal error without calling Kit', async () => {
  logs = [];
  console.error = (m: string) => logs.push(m);
  const calls: string[] = [];
  globalThis.fetch = (async (u: string) => { calls.push(String(u)); return new Response('x', { status: 401 }); }) as typeof fetch;
  const r = await syncDemoBookings(env, NOW);
  assert.equal(r.reason, 'tidycal');
  assert.equal(calls.length, 1);
  assert.match(logs[0], /401/);
});

test('counts Kit failures and never logs PII or secrets', async () => {
  mock([[bk({})]], 422);
  const r = await syncDemoBookings(env, NOW);
  assert.deepEqual(r, { ok: false, matched: 1, tagged: 0, failed: 1 });
  const all = logs.join('\n');
  assert.match(all, /422/);
  for (const s of ['a@example.com', 'Ann', 'kk', 'Bearer']) assert.ok(!all.includes(s), s);
});
