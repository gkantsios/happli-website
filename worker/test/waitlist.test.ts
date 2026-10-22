// Run with `npm test`. fetch is mocked: nothing reaches Kit or Cloudflare.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleWaitlist, type WaitlistEnv } from '../waitlist.ts';

const env: WaitlistEnv = { TURNSTILE_SECRET_KEY: 'ts-secret', KIT_API_KEY: 'kit-key', KIT_WAITLIST_TAG_ID: '24908051' };
type Call = { url: string; init?: RequestInit };
let calls: Call[];
let kitStatus: number;
let turnstileOk: boolean;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  kitStatus = 200;
  turnstileOk = true;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('siteverify')) return Response.json({ success: turnstileOk });
    return Response.json({ subscription: { id: 1 } }, { status: kitStatus });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

function post(fields: Record<string, string>, json = true) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request('https://gohappli.com/api/waitlist', {
    method: 'POST', body, headers: json ? { accept: 'application/json', origin: 'https://gohappli.com' } : {},
  });
}
const good = { email: 'Person@Example.com', 'cf-turnstile-response': 'tok' };

test('subscribes via Kit v3 tag subscribe', async () => {
  const res = await handleWaitlist(post({ ...good, first_name: 'Pat' }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const kit = calls.find((c) => c.url.includes('convertkit'))!;
  assert.equal(kit.url, 'https://api.convertkit.com/v3/tags/24908051/subscribe');
  assert.equal(kit.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(kit.init?.body)), { api_key: 'kit-key', email: 'person@example.com', first_name: 'Pat' });
  assert.equal(calls.length, 2);
});

test('omits first_name when not given', async () => {
  await handleWaitlist(post(good), env);
  const kit = calls.find((c) => c.url.includes('convertkit'))!;
  assert.deepEqual(JSON.parse(String(kit.init?.body)), { api_key: 'kit-key', email: 'person@example.com' });
});

test('honeypot returns ok and calls nothing', async () => {
  const res = await handleWaitlist(post({ ...good, company: 'Bot Inc' }), env);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 0);
});

test('503 when any env var is missing', async () => {
  for (const name of ['TURNSTILE_SECRET_KEY', 'KIT_API_KEY', 'KIT_WAITLIST_TAG_ID'] as const) {
    const res = await handleWaitlist(post(good), { ...env, [name]: undefined });
    assert.equal(res.status, 503, name);
    assert.equal(((await res.json()) as { code: string }).code, 'server');
  }
  assert.equal(calls.length, 0);
});

test('invalid email is 400', async () => {
  const res = await handleWaitlist(post({ ...good, email: 'nope' }), env);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { ok: false, code: 'invalid_email' });
});

test('failed Turnstile is 403 and skips Kit', async () => {
  turnstileOk = false;
  const res = await handleWaitlist(post(good), env);
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { ok: false, code: 'verification_failed' });
  assert.ok(!calls.some((c) => c.url.includes('convertkit')));
});

test('Kit error is 502 and does not log the email', async () => {
  kitStatus = 401;
  const logged: string[] = [];
  const orig = console.error;
  console.error = (m: string) => logged.push(m);
  try {
    const res = await handleWaitlist(post(good), env);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { ok: false, code: 'server' });
  } finally { console.error = orig; }
  assert.ok(logged.join(' ').includes('401'));
  assert.ok(!logged.join(' ').includes('example.com'));
});

test('plain form post redirects back to /pricing/', async () => {
  const res = await handleWaitlist(post(good, false), env);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/pricing/?waitlist=ok#marketing');
});
