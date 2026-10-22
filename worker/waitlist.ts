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
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_BODY_BYTES = 8 * 1024;
// Hostnames a Turnstile token may have been solved on: production, plus the workers.dev preview
// host and its per-branch and per-version aliases (e.g. feat-site-polish-happli-website.…).
const TURNSTILE_HOSTS = new Set(['gohappli.com', 'www.gohappli.com', 'happli-website.gkantsios.workers.dev']);
const PREVIEW_HOST_SUFFIX = '-happli-website.gkantsios.workers.dev';

export function isAllowedTurnstileHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return TURNSTILE_HOSTS.has(host) || (host.endsWith(PREVIEW_HOST_SUFFIX) && /^[a-z0-9-]+$/.test(host.slice(0, -PREVIEW_HOST_SUFFIX.length)));
}

/** Reads the body, giving up as soon as it passes `max` bytes (null), whatever Content-Length says. */
async function readCapped(request: Request, max: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length >= 6 && email.length <= 254 && EMAIL.test(email) && !email.includes('..');
}

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

  // Only our own pages post here. Browsers send Origin on every POST; the one exception allowed
  // is a plain HTML form post (no JavaScript), recognized by its urlencoded content type.
  const origin = request.headers.get('origin');
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  const plainFormPost = !wantsJson && contentType.startsWith('application/x-www-form-urlencoded');
  if (origin ? URL.parse(origin)?.host !== new URL(request.url).host : !plainFormPost) {
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
  const token = field('cf-turnstile-response');
  if (!token || token.length > 2048) return reply(403, { ok: false, code: 'verification_failed' });
  try {
    const body = new FormData();
    body.set('secret', env.TURNSTILE_SECRET_KEY!);
    body.set('response', token);
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) body.set('remoteip', ip);
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    const outcome = (await res.json()) as { success?: boolean; hostname?: string; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn(`waitlist: turnstile rejected (${(outcome['error-codes'] ?? []).join(', ') || 'no code'})`);
      return reply(403, { ok: false, code: 'verification_failed' });
    }
    if (!isAllowedTurnstileHost(outcome.hostname)) {
      console.warn('waitlist: turnstile token solved on a hostname not in the allowlist');
      return reply(403, { ok: false, code: 'verification_failed' });
    }
  } catch {
    console.error('waitlist: turnstile siteverify unreachable');
    return reply(502, { ok: false, code: 'server' });
  }

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
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ api_key: env.KIT_API_KEY, email, ...(firstName ? { first_name: firstName } : {}) }),
  });
  // Only the status goes into the error: Kit's error bodies can echo the email back.
  if (!res.ok) throw new Error(`POST /tags/:id/subscribe ${res.status}`);
}
