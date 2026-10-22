// Run with `npm test`. fetch is mocked: nothing reaches Kit or Cloudflare.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleWaitlist, isAllowedTurnstileHost, type WaitlistEnv } from '../waitlist.ts';

const limiter = { limit: async () => ({ success: true }) };
const env: WaitlistEnv = { TURNSTILE_SECRET_KEY: 'ts-secret', KIT_API_KEY: 'kit-key', KIT_WAITLIST_TAG_ID: '24908051', WAITLIST_RATE_LIMITER: limiter };
type Call = { url: string; init?: RequestInit };
let calls: Call[];
let kitStatus: number;
let turnstileOk: boolean;
let turnstileHost: string;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  kitStatus = 200;
  turnstileOk = true;
  turnstileHost = 'gohappli.com';
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('siteverify')) return Response.json({ success: turnstileOk, hostname: turnstileHost });
    return Response.json({ subscription: { id: 1 } }, { status: kitStatus });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

// json: the page's script (multipart FormData + Origin). Otherwise a no-JS form post (urlencoded + Origin).
function post(fields: Record<string, string>, json = true, headers: Record<string, string> = {}) {
  if (json) {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.set(k, v);
    return new Request('https://gohappli.com/api/waitlist', {
      method: 'POST', body, headers: { accept: 'application/json', origin: 'https://gohappli.com', ...headers },
    });
  }
  return new Request('https://gohappli.com/api/waitlist', {
    method: 'POST', body: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://gohappli.com', ...headers },
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

// L1: the cap applies to the bytes actually read, not only Content-Length.
test('streamed body over 8 KB with no Content-Length is 413 too_large', async () => {
  const chunk = new TextEncoder().encode('email=a%40b.co&pad=' + 'x'.repeat(4096));
  const stream = new ReadableStream({ start(c) { for (let i = 0; i < 50; i++) c.enqueue(chunk); c.close(); } });
  const req = new Request('https://gohappli.com/api/waitlist', {
    method: 'POST', body: stream, duplex: 'half',
    headers: { accept: 'application/json', origin: 'https://gohappli.com', 'content-type': 'application/x-www-form-urlencoded' },
  } as RequestInit);
  assert.equal(req.headers.get('content-length'), null);
  const res = await handleWaitlist(req, env);
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { ok: false, code: 'too_large' });
  assert.equal(calls.length, 0);
});

// N2
test('oversized Content-Length is 413 too_large', async () => {
  const res = await handleWaitlist(post(good, true, { 'content-length': '9000' }), env);
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { ok: false, code: 'too_large' });
});

// L2
test('Turnstile token solved on another hostname is 403 and skips Kit', async () => {
  turnstileHost = 'evil.example';
  const res = await handleWaitlist(post(good), env);
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { ok: false, code: 'verification_failed' });
  assert.ok(!calls.some((c) => c.url.includes('convertkit')));
});

test('Turnstile hostname allowlist', () => {
  for (const h of ['gohappli.com', 'www.gohappli.com', 'happli-website.gkantsios.workers.dev', 'feat-site-polish-happli-website.gkantsios.workers.dev', '72b878ca-happli-website.gkantsios.workers.dev'])
    assert.ok(isAllowedTurnstileHost(h), h);
  for (const h of [undefined, '', 'evil.example', 'gohappli.com.evil.example', 'x.y-happli-website.gkantsios.workers.dev', 'happli-website.other.workers.dev'])
    assert.ok(!isAllowedTurnstileHost(h), String(h));
});

// L3
test('no Origin: JSON/multipart request is 403', async () => {
  const req = post(good);
  const bare = new Request(req.url, { method: 'POST', body: await req.arrayBuffer(), headers: { accept: 'application/json', 'content-type': req.headers.get('content-type')! } });
  const res = await handleWaitlist(bare, env);
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test('no Origin: plain urlencoded form post is allowed', async () => {
  const req = new Request('https://gohappli.com/api/waitlist', {
    method: 'POST', body: new URLSearchParams(good).toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  const res = await handleWaitlist(req, env);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/pricing/?waitlist=ok#marketing');
});

test('cross-origin request is 403', async () => {
  const res = await handleWaitlist(post(good, true, { origin: 'https://evil.example' }), env);
  assert.equal(res.status, 403);
});

// N1
test('missing rate limiter fails closed with 503', async () => {
  const res = await handleWaitlist(post(good), { ...env, WAITLIST_RATE_LIMITER: undefined });
  assert.equal(res.status, 503);
  assert.equal(((await res.json()) as { code: string }).code, 'server');
  assert.equal(calls.length, 0);
});

test('rate limited is 429', async () => {
  const res = await handleWaitlist(post(good), { ...env, WAITLIST_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { ok: false, code: 'rate_limited' });
});
