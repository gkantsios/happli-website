// POST /api/checkout (worker/checkout.ts). fetch is mocked: nothing reaches Stripe or Cloudflare.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleCheckout, validateBody, keyMatchesSite, foundingDateOpen, resetFoundingCache, type CheckoutEnv } from '../checkout.ts';
import { lineItems } from '../../src/lib/checkout.ts';

const PREVIEW = 'https://feat-astro-rebuild-happli-website.gkantsios.workers.dev';
const NOW = Date.parse('2026-11-01T12:00:00Z');
const env: CheckoutEnv = {
  STRIPE_CHECKOUT_KEY: 'rk_test_abc',
  TURNSTILE_SECRET_KEY: 'ts',
  SITE_URL: PREVIEW,
  FOUNDING_ENDS_AT: '2027-01-30T23:59:59-05:00',
  CHECKOUT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
type Call = { url: string; init?: RequestInit };
let calls: Call[];
let foundingSubs: number;
let amountOverride: Record<string, number>;
let missingKeys: Set<string>;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  foundingSubs = 0;
  amountOverride = {};
  missingKeys = new Set();
  resetFoundingCache();
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.includes('siteverify')) return Response.json({ success: true, hostname: 'feat-astro-rebuild-happli-website.gkantsios.workers.dev' });
    if (u.includes('/subscriptions/search')) {
      const status = new URL(u).searchParams.get('query')!.includes("'active'") ? 'active' : 'trialing';
      const n = status === 'active' ? foundingSubs : 0;
      return Response.json({ data: Array.from({ length: n }, (_, i) => ({ id: `sub_${i}` })), has_more: false });
    }
    if (u.includes('/v1/prices')) {
      const keys = new URL(u).searchParams.getAll('lookup_keys[]').filter((k) => !missingKeys.has(k));
      return Response.json({ data: keys.map((k) => {
        const yearly = k.endsWith('_yearly');
        const all = [true, false].flatMap((f) => (['solo', 'studio'] as const).flatMap((plan) => lineItems({ plan, period: yearly ? 'yearly' : 'monthly', locations: 2, founding: f })));
        const amt = amountOverride[k] ?? all.find((i) => i.lookupKey === k)!.unitAmountCents;
        return { id: `price_${k}`, lookup_key: k, unit_amount: amt, currency: 'usd', recurring: { interval: yearly ? 'year' : 'month' } };
      }) });
    }
    if (u.includes('/checkout/sessions')) return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    return new Response('unexpected', { status: 500 });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${PREVIEW}/api/checkout`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', origin: PREVIEW, ...headers },
  });
}
const good = { plan: 'studio', period: 'monthly', locations: 3, founding: false, token: 'tok' };
const sessionParams = () => new URLSearchParams(String(calls.find((c) => c.url.endsWith('/checkout/sessions'))!.init!.body));

test('creates a session: plan x1 plus extra locations x2, metadata, trial, no promo codes', async () => {
  const res = await handleCheckout(post(good), env, NOW);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
  const p = sessionParams();
  assert.equal(p.get('mode'), 'subscription');
  assert.equal(p.get('line_items[0][price]'), 'price_studio_monthly');
  assert.equal(p.get('line_items[0][quantity]'), '1');
  assert.equal(p.get('line_items[1][price]'), 'price_extra_loc_studio_monthly');
  assert.equal(p.get('line_items[1][quantity]'), '2');
  assert.equal(p.get('subscription_data[metadata][happli_locations]'), '3');
  assert.equal(p.get('subscription_data[metadata][happli_founding]'), 'false');
  assert.equal(p.get('subscription_data[metadata][happli_source]'), 'website');
  assert.equal(p.get('subscription_data[trial_period_days]'), '30');
  assert.equal(p.get('payment_method_collection'), 'always');
  assert.equal(p.get('allow_promotion_codes'), 'false');
  assert.equal(p.get('success_url'), `${PREVIEW}/signup/thanks/?session_id={CHECKOUT_SESSION_ID}`);
  assert.ok(p.get('cancel_url')!.startsWith(`${PREVIEW}/signup/?canceled=1`));
  assert.equal(calls.find((c) => c.url.includes('stripe.com'))!.init!.headers && (calls[1].init!.headers as Record<string, string>).Authorization, 'Bearer rk_test_abc');
});

test('one location sends no extra-location line', async () => {
  await handleCheckout(post({ ...good, locations: 1 }), env, NOW);
  const p = sessionParams();
  assert.equal(p.get('line_items[1][price]'), null);
});

test('success URL uses SITE_URL, not the request host', async () => {
  await handleCheckout(post(good, {}), { ...env, SITE_URL: PREVIEW + '/' }, NOW);
  assert.ok(sessionParams().get('success_url')!.startsWith(`${PREVIEW}/signup/thanks/`));
});

test('validation: tampering is rejected', () => {
  const bad: unknown[] = [
    { ...good, locations: 0 }, { ...good, locations: 11 }, { ...good, locations: 2.5 }, { ...good, locations: '3' },
    { ...good, plan: 'enterprise' }, { ...good, period: 'weekly' }, { ...good, founding: 'true' },
    { ...good, price: 'price_123' }, { ...good, amount: 1 }, { ...good, token: '' }, { ...good, token: 'x'.repeat(2049) },
    { plan: 'solo', period: 'monthly', locations: 1, token: 'tok' }, null, [], 'x', 3,
  ];
  for (const b of bad) assert.equal(validateBody(b).ok, false, JSON.stringify(b));
  assert.equal(validateBody(good).ok, true);
  assert.equal(validateBody({ ...good, locations: 10 }).ok, true);
});

test('tampered requests are 400 and create no session', async () => {
  for (const b of [{ ...good, locations: 0 }, { ...good, locations: 11 }, { ...good, locations: 2.5 }, { ...good, price: 'price_x' }, { ...good, plan: 'enterprise' }, '{not json']) {
    const res = await handleCheckout(post(b), env, NOW);
    assert.equal(res.status, 400, JSON.stringify(b));
    assert.deepEqual(await res.json(), { ok: false, code: 'invalid' });
  }
  assert.equal(calls.length, 0);
});

test('wrong origin, missing origin, non-JSON and GET are refused', async () => {
  assert.equal((await handleCheckout(post(good, { origin: 'https://evil.example' }), env, NOW)).status, 403);
  const noOrigin = new Request(`${PREVIEW}/api/checkout`, { method: 'POST', body: JSON.stringify(good), headers: { 'content-type': 'application/json' } });
  assert.equal((await handleCheckout(noOrigin, env, NOW)).status, 403);
  assert.equal((await handleCheckout(post(good, { 'content-type': 'text/plain' }), env, NOW)).status, 415);
  assert.equal((await handleCheckout(new Request(`${PREVIEW}/api/checkout`), env, NOW)).status, 405);
  assert.equal(calls.length, 0);
});

test('oversized body is 413', async () => {
  const res = await handleCheckout(post(JSON.stringify({ ...good, token: 'x'.repeat(5000) })), env, NOW);
  assert.equal(res.status, 413);
});

test('rate limited is 429', async () => {
  const res = await handleCheckout(post(good), { ...env, CHECKOUT_RATE_LIMITER: { limit: async () => ({ success: false }) } }, NOW);
  assert.equal(res.status, 429);
  assert.equal(calls.length, 0);
});

test('missing config fails closed with 503', async () => {
  for (const name of ['STRIPE_CHECKOUT_KEY', 'TURNSTILE_SECRET_KEY', 'SITE_URL', 'CHECKOUT_RATE_LIMITER'] as const) {
    const res = await handleCheckout(post(good), { ...env, [name]: undefined }, NOW);
    assert.equal(res.status, 503, name);
  }
  assert.equal(calls.length, 0);
});

test('key mode must match the site', async () => {
  assert.equal(keyMatchesSite('rk_test_x', PREVIEW), true);
  assert.equal(keyMatchesSite('rk_live_x', PREVIEW), false);
  assert.equal(keyMatchesSite('sk_live_x', 'https://gohappli.com'), true);
  assert.equal(keyMatchesSite('rk_test_x', 'https://gohappli.com'), false);
  assert.equal(keyMatchesSite('pk_live_x', 'https://gohappli.com'), false);
  const res = await handleCheckout(post(good), { ...env, STRIPE_CHECKOUT_KEY: 'rk_live_abc' }, NOW);
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test('failed Turnstile is 403', async () => {
  globalThis.fetch = (async (u: string) => { calls.push({ url: String(u) }); return Response.json({ success: false }); }) as typeof fetch;
  const res = await handleCheckout(post(good), env, NOW);
  assert.equal(res.status, 403);
  assert.equal(calls.length, 1);
});

test('Founding uses founding prices while open', async () => {
  const res = await handleCheckout(post({ ...good, founding: true, locations: 2 }), env, NOW);
  assert.equal(res.status, 200);
  const p = sessionParams();
  assert.equal(p.get('line_items[0][price]'), 'price_founding_studio_monthly');
  assert.equal(p.get('line_items[1][price]'), 'price_founding_extra_loc_studio_monthly');
  assert.equal(p.get('subscription_data[metadata][happli_founding]'), 'true');
});

test('Founding refused after FOUNDING_ENDS_AT, or when unset', async () => {
  assert.equal(foundingDateOpen(undefined, NOW), false);
  assert.equal(foundingDateOpen('', NOW), false);
  assert.equal(foundingDateOpen('nonsense', NOW), false);
  assert.equal(foundingDateOpen('2026-10-01T00:00:00Z', NOW), false);
  const res = await handleCheckout(post({ ...good, founding: true }), { ...env, FOUNDING_ENDS_AT: '2026-10-01T00:00:00Z' }, NOW);
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { ok: false, code: 'founding_full' });
  assert.ok(!calls.some((c) => c.url.includes('/checkout/sessions')));
});

test('Founding refused at 50 active/trialing Founding subscriptions', async () => {
  foundingSubs = 50;
  const res = await handleCheckout(post({ ...good, founding: true }), env, NOW);
  assert.equal(res.status, 409);
  assert.ok(!calls.some((c) => c.url.includes('/checkout/sessions')));
});

test('Founding count is cached for 60 seconds', async () => {
  await handleCheckout(post({ ...good, founding: true }), env, NOW);
  await handleCheckout(post({ ...good, founding: true }), env, NOW + 30_000);
  assert.equal(calls.filter((c) => c.url.includes('/subscriptions/search')).length, 2); // active + trialing, once
  await handleCheckout(post({ ...good, founding: true }), env, NOW + 61_000);
  assert.equal(calls.filter((c) => c.url.includes('/subscriptions/search')).length, 4);
});

test('a regular checkout never counts Founding subscriptions', async () => {
  await handleCheckout(post(good), env, NOW);
  assert.ok(!calls.some((c) => c.url.includes('/subscriptions/search')));
});

test('missing Stripe price fails closed', async () => {
  missingKeys.add('extra_loc_studio_monthly');
  const res = await handleCheckout(post(good), env, NOW);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false, code: 'server' });
  assert.ok(!calls.some((c) => c.url.includes('/checkout/sessions')));
});

test('Stripe amount different from pricing.ts fails closed', async () => {
  amountOverride.studio_monthly = 14800;
  const res = await handleCheckout(post(good), env, NOW);
  assert.equal(res.status, 503);
  assert.ok(!calls.some((c) => c.url.includes('/checkout/sessions')));
});
