// POST /api/checkout: the signup page's "Continue to payment" button.
//
// The browser sends only { plan, period, locations, founding, token } as JSON. The Worker:
// 1. checks the Origin, rate limits per IP and validates the body strictly (unknown fields, non-integers
//    and out-of-range values are a 400);
// 2. verifies the Turnstile token;
// 3. decides Founding on the server: open only before FOUNDING_ENDS_AT and while fewer than
//    founding.maxStudios active or trialing subscriptions carry metadata happli_founding=true;
// 4. looks the prices up in Stripe by lookup key and fails closed (503) if one is missing or its amount
//    doesn't match src/config/pricing.ts;
// 5. creates a subscription Checkout Session (card collected now, a trial until the studio goes live)
//    and replies { ok: true, url }.
// Prices, amounts and price ids never come from the browser. Stripe error details are logged, never
// returned. Nothing personal (IP, token) is logged.
//
// Secret: STRIPE_CHECKOUT_KEY, a restricted key with Checkout Sessions: Write, Prices: Read and
// Subscriptions: Read. Vars: SITE_URL (success/cancel host) and FOUNDING_ENDS_AT (ISO date-time).
import { founding, trialDays } from '../src/config/pricing';
import { lineItems, maxOnlineLocations, type CheckoutChoice } from '../src/lib/checkout';
import { isAllowedTurnstileHost, readCapped } from './waitlist';

export interface CheckoutEnv {
  STRIPE_CHECKOUT_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** e.g. https://gohappli.com. Success and cancel URLs use this, never the request's host. */
  SITE_URL?: string;
  /** ISO 8601 end of the Founding Studio offer. Unset or unparseable = Founding closed. */
  FOUNDING_ENDS_AT?: string;
  CHECKOUT_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export type CheckoutCode = 'invalid' | 'verification_failed' | 'founding_full' | 'rate_limited' | 'too_large' | 'server';

const STRIPE_API = 'https://api.stripe.com/v1';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 4 * 1024;
const FOUNDING_CACHE_MS = 60_000;
const PRODUCTION_HOSTS = new Set(['gohappli.com', 'www.gohappli.com']);
const ALLOWED_FIELDS = new Set(['plan', 'period', 'locations', 'founding', 'token']);

export type Validated = { ok: true; choice: CheckoutChoice; token: string } | { ok: false };

/** Strict body check. Anything not exactly { plan, period, locations, founding, token } is rejected. */
export function validateBody(body: unknown): Validated {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => !ALLOWED_FIELDS.has(k))) return { ok: false };
  const { plan, period, locations, founding: f, token } = b;
  if (plan !== 'solo' && plan !== 'studio') return { ok: false };
  if (period !== 'monthly' && period !== 'yearly') return { ok: false };
  if (typeof locations !== 'number' || !Number.isInteger(locations) || locations < 1 || locations > maxOnlineLocations) return { ok: false };
  if (typeof f !== 'boolean') return { ok: false };
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return { ok: false };
  return { ok: true, choice: { plan, period, locations, founding: f }, token };
}

/** A live key may only run on production, and a test key never on production. */
export function keyMatchesSite(key: string, siteUrl: string): boolean {
  const host = URL.parse(siteUrl)?.hostname.toLowerCase();
  if (!host) return false;
  const live = /^(sk|rk)_live_/.test(key);
  const test = /^(sk|rk)_test_/.test(key);
  return PRODUCTION_HOSTS.has(host) ? live : test;
}

export function foundingDateOpen(endsAt: string | undefined, now: number): boolean {
  if (!endsAt?.trim()) return false;
  const end = Date.parse(endsAt);
  return Number.isFinite(end) && now < end;
}

let foundingCache: { count: number; at: number } | null = null;
/** For tests. */
export function resetFoundingCache(): void { foundingCache = null; }

async function stripe(key: string, method: 'GET' | 'POST', path: string, params: URLSearchParams): Promise<any> {
  const url = method === 'GET' ? `${STRIPE_API}${path}?${params}` : `${STRIPE_API}${path}`;
  const res = await fetch(url, {
    method,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? params.toString() : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${json?.error?.code ?? ''} ${json?.error?.message ?? ''}`.trim());
  return json;
}

/** Active + trialing subscriptions marked happli_founding=true, cached for a minute. Stops counting at the cap. */
async function foundingCount(key: string, now: number): Promise<number> {
  if (foundingCache && now - foundingCache.at < FOUNDING_CACHE_MS) return foundingCache.count;
  let count = 0;
  for (const status of ['active', 'trialing']) {
    let page: string | undefined;
    do {
      const params = new URLSearchParams({ query: `metadata['happli_founding']:'true' AND status:'${status}'`, limit: '100' });
      if (page) params.set('page', page);
      const r = await stripe(key, 'GET', '/subscriptions/search', params);
      count += (r.data ?? []).length;
      page = r.has_more ? r.next_page : undefined;
    } while (page && count < founding.maxStudios);
  }
  foundingCache = { count, at: now };
  return count;
}

export async function handleCheckout(request: Request, env: CheckoutEnv, now = Date.now()): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const fail = (status: number, code: CheckoutCode) => Response.json({ ok: false, code }, { status, headers });

  if (request.method !== 'POST') return Response.json({ ok: false, code: 'server' }, { status: 405, headers: { ...headers, Allow: 'POST' } });

  // Only our own page posts here, always with JavaScript, so Origin must be present and match.
  const origin = request.headers.get('origin');
  if (!origin || URL.parse(origin)?.host !== new URL(request.url).host) return fail(403, 'server');
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fail(415, 'invalid');

  if (!env.CHECKOUT_RATE_LIMITER) {
    console.error('checkout: not configured, missing CHECKOUT_RATE_LIMITER binding');
    return fail(503, 'server');
  }
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await env.CHECKOUT_RATE_LIMITER.limit({ key: `checkout:${ip}` })).success) return fail(429, 'rate_limited');

  const missing = (['STRIPE_CHECKOUT_KEY', 'TURNSTILE_SECRET_KEY', 'SITE_URL'] as const).filter((n) => !env[n]?.trim());
  if (missing.length) {
    console.error(`checkout: not configured, missing ${missing.join(', ')}`);
    return fail(503, 'server');
  }
  const key = env.STRIPE_CHECKOUT_KEY!.trim();
  const site = env.SITE_URL!.trim().replace(/\/+$/, '');
  if (!keyMatchesSite(key, site)) {
    console.error('checkout: Stripe key mode does not match SITE_URL (live key off production, or test key on production)');
    return fail(503, 'server');
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'too_large');
  const bytes = await readCapped(request, MAX_BODY_BYTES);
  if (!bytes) return fail(413, 'too_large');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return fail(400, 'invalid');
  }
  const v = validateBody(parsed);
  if (!v.ok) return fail(400, 'invalid');
  const { choice, token } = v;

  // Turnstile
  try {
    const body = new FormData();
    body.set('secret', env.TURNSTILE_SECRET_KEY!);
    body.set('response', token);
    if (request.headers.get('cf-connecting-ip')) body.set('remoteip', request.headers.get('cf-connecting-ip')!);
    const res = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const outcome = (await res.json()) as { success?: boolean; hostname?: string };
    if (!outcome.success || !isAllowedTurnstileHost(outcome.hostname)) return fail(403, 'verification_failed');
  } catch {
    console.error('checkout: turnstile siteverify unreachable');
    return fail(502, 'server');
  }

  try {
    // Founding: the checkbox is only a request.
    if (choice.founding) {
      if (!foundingDateOpen(env.FOUNDING_ENDS_AT, now)) return fail(409, 'founding_full');
      if ((await foundingCount(key, now)) >= founding.maxStudios) return fail(409, 'founding_full');
    }

    const items = lineItems(choice);
    const lookup = new URLSearchParams({ active: 'true', limit: '10' });
    for (const i of items) lookup.append('lookup_keys[]', i.lookupKey);
    const prices = (await stripe(key, 'GET', '/prices', lookup)).data as Array<{
      id: string; lookup_key: string; unit_amount: number | null; currency: string; recurring?: { interval?: string } | null;
    }>;
    const interval = choice.period === 'yearly' ? 'year' : 'month';

    const session = new URLSearchParams({
      mode: 'subscription',
      billing_address_collection: 'required',
      payment_method_collection: 'always',
      allow_promotion_codes: 'false',
      success_url: `${site}/signup/thanks/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/signup/?canceled=1&plan=${choice.plan}&period=${choice.period}&locations=${choice.locations}${choice.founding ? '&founding=1' : ''}`,
      'subscription_data[trial_period_days]': String(trialDays),
      'subscription_data[trial_settings][end_behavior][missing_payment_method]': 'cancel',
      'subscription_data[metadata][happli_plan]': choice.plan,
      'subscription_data[metadata][happli_period]': choice.period,
      'subscription_data[metadata][happli_locations]': String(choice.locations),
      'subscription_data[metadata][happli_founding]': String(choice.founding),
      'subscription_data[metadata][happli_source]': 'website',
    });
    items.forEach((item, n) => {
      const price = prices.find((p) => p.lookup_key === item.lookupKey);
      if (!price) throw new Error(`price missing for lookup key ${item.lookupKey}`);
      if (price.unit_amount !== item.unitAmountCents || price.currency !== 'usd' || price.recurring?.interval !== interval) {
        throw new Error(`price ${item.lookupKey} is ${price.unit_amount} ${price.currency}/${price.recurring?.interval}, expected ${item.unitAmountCents} usd/${interval}`);
      }
      session.set(`line_items[${n}][price]`, price.id);
      session.set(`line_items[${n}][quantity]`, String(item.quantity));
    });

    const created = await stripe(key, 'POST', '/checkout/sessions', session);
    const url = typeof created.url === 'string' ? created.url : '';
    if (!url.startsWith('https://checkout.stripe.com/')) throw new Error('session has no checkout.stripe.com url');
    return Response.json({ ok: true, url }, { status: 200, headers });
  } catch (err) {
    console.error(`checkout: ${err instanceof Error ? err.message : 'unknown error'}`);
    return fail(503, 'server');
  }
}
