// POST /api/waitlist: the Marketing add-on waitlist form on /pricing/.
//
// 1. A filled honeypot ("company") gets a silent { ok: true } and nothing else happens.
// 2. The email is validated here, whatever the browser checked.
// 3. The Turnstile token is verified with Cloudflare's siteverify.
// 4. The email is subscribed in Kit (v3 API) by adding the "Happli Marketing waitlist" tag. Kit's
//    tag-subscribe call returns the existing subscriber for a known email, so "already subscribed"
//    counts as success.
//
// Replies with JSON: { ok: true } or { ok: false, code: 'invalid_email' | 'verification_failed' | 'server' }.
// A plain form post (no JavaScript) is redirected back to /pricing/ instead.
// Secrets stay server-side, and nothing personal (email, IP, token) is ever logged.

import { FETCH_TIMEOUT_MS, isAllowedTurnstileHost, isSameOriginPost, isValidEmail, readCapped, verifyTurnstile } from './shared';

export interface WaitlistEnv {
  TURNSTILE_SECRET_KEY?: string;
  /** A Kit v3 API key (not the v3 API secret). */
  KIT_API_KEY?: string;
  /** The id of the Kit tag "Happli Marketing waitlist" (set in wrangler.jsonc). */
  KIT_WAITLIST_TAG_ID?: string;
  /** Optional Workers rate limiting binding (wrangler.jsonc "ratelimits"), keyed per IP. */
  WAITLIST_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

type Code = 'invalid_email' | 'verification_failed' | 'server' | 'rate_limited' | 'too_large';

const KIT_API = 'https://api.convertkit.com/v3';
const MAX_BODY_BYTES = 8 * 1024;

// The Turnstile hostname allowlist and the email check live in worker/shared.ts (also used by
// /api/snapshot); re-exported here for the existing callers and tests.
export { isAllowedTurnstileHost, isValidEmail };

export async function handleWaitlist(request: Request, env: WaitlistEnv): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, body: { ok: true } | { ok: false; code: Code; message?: string }) => {
    if (!wantsJson && request.method === 'POST') {
      const result = body.ok ? 'ok' : body.code;
      return new Response(null, {
        status: 303,
        headers: { Location: `/pricing/?waitlist=${result}#marketing`, 'Cache-Control': 'no-store' },
      });
    }
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  };

  if (request.method !== 'POST') {
    return Response.json({ ok: false, code: 'server' }, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
  }

  // Only our own pages post here (see isSameOriginPost: a plain urlencoded form post may come without Origin).
  // Kept as sent: a multipart boundary is case-sensitive (lowercasing it breaks parsing on Workers).
  const contentType = request.headers.get('content-type') ?? '';
  if (!isSameOriginPost(request, wantsJson, ['application/x-www-form-urlencoded'])) {
    return Response.json({ ok: false, code: 'server' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  // Fail closed: no rate limiter, no sign-ups.
  if (!env.WAITLIST_RATE_LIMITER) {
    console.error('waitlist: not configured, missing WAITLIST_RATE_LIMITER binding');
    return reply(503, { ok: false, code: 'server', message: 'The waitlist is not configured yet.' });
  }
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const { success } = await env.WAITLIST_RATE_LIMITER.limit({ key: `waitlist:${ip}` });
  if (!success) return reply(429, { ok: false, code: 'rate_limited' });

  const missing = (['TURNSTILE_SECRET_KEY', 'KIT_API_KEY', 'KIT_WAITLIST_TAG_ID'] as const).filter((name) => !env[name]?.trim());
  if (missing.length) {
    console.error(`waitlist: not configured, missing ${missing.join(', ')}`);
    return reply(503, { ok: false, code: 'server', message: 'The waitlist is not configured yet.' });
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { ok: false, code: 'too_large' });
  const bytes = await readCapped(request, MAX_BODY_BYTES);
  if (!bytes) return reply(413, { ok: false, code: 'too_large' });

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(bytes), { headers: { 'content-type': contentType } }).formData();
  } catch {
    return reply(400, { ok: false, code: 'invalid_email' });
  }
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };

  // 1. Honeypot: bots fill every field. Pretend it worked.
  if (field('company').trim() !== '') return reply(200, { ok: true });

  // 2. Email
  const email = field('email').trim().toLowerCase();
  if (!isValidEmail(email)) return reply(400, { ok: false, code: 'invalid_email' });

  // 3. Turnstile
  const verified = await verifyTurnstile(env.TURNSTILE_SECRET_KEY!, field('cf-turnstile-response'), request.headers.get('cf-connecting-ip'), 'waitlist');
  if (verified === 'unreachable') return reply(502, { ok: false, code: 'server' });
  if (verified !== 'ok') return reply(403, { ok: false, code: 'verification_failed' });

  // 4. Kit
  try {
    await subscribe(env, email, field('first_name').trim().slice(0, 100));
  } catch (err) {
    console.error(`waitlist: kit failed (${err instanceof Error ? err.message : 'unknown'})`);
    return reply(502, { ok: false, code: 'server' });
  }
  return reply(200, { ok: true });
}

async function subscribe(env: WaitlistEnv, email: string, firstName: string): Promise<void> {
  const tagId = env.KIT_WAITLIST_TAG_ID!.trim();
  // Adds the tag, creating the subscriber if needed. A known email or an existing tag is a 200.
  const res = await fetch(`${KIT_API}/tags/${encodeURIComponent(tagId)}/subscribe`, {
    method: 'POST',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ api_key: env.KIT_API_KEY, email, ...(firstName ? { first_name: firstName } : {}) }),
  });
  // Only the status goes into the error: Kit's error bodies can echo the email back.
  if (!res.ok) throw new Error(`POST /tags/:id/subscribe ${res.status}`);
}
