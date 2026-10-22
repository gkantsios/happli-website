// POST /api/waitlist: the Marketing add-on waitlist form on /pricing/.
//
// 1. A filled honeypot ("company") gets a silent { ok: true } and nothing else happens.
// 2. The email is validated here, whatever the browser checked.
// 3. The Turnstile token is verified with Cloudflare's siteverify.
// 4. The email is subscribed in Kit and tagged "Marketing waitlist". Kit's create-subscriber call
//    returns the existing subscriber for a known email, so "already subscribed" counts as success.
//
// Replies with JSON: { ok: true } or { ok: false, code: 'invalid_email' | 'verification_failed' | 'server' }.
// A plain form post (no JavaScript) is redirected back to /pricing/ instead.
// Secrets stay server-side, and nothing personal (email, IP, token) is ever logged.

export interface WaitlistEnv {
  TURNSTILE_SECRET_KEY?: string;
  KIT_API_KEY?: string;
  /** The Kit tag's id. If it's not set, the tag is looked up by name (and created if missing). */
  KIT_WAITLIST_TAG_ID?: string;
  /** The Kit tag's name, used only when KIT_WAITLIST_TAG_ID isn't set. */
  KIT_WAITLIST_TAG_NAME?: string;
  /** Optional Workers rate limiting binding (wrangler.jsonc "ratelimits"), keyed per IP. */
  WAITLIST_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

type Code = 'invalid_email' | 'verification_failed' | 'server' | 'rate_limited';

const KIT_API = 'https://api.kit.com/v4';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_TAG_NAME = 'Marketing waitlist';
const MAX_BODY_BYTES = 8 * 1024;
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

  // Only our own pages post here.
  const origin = request.headers.get('origin');
  if (origin && URL.parse(origin)?.host !== new URL(request.url).host) {
    return Response.json({ ok: false, code: 'server' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  if (env.WAITLIST_RATE_LIMITER) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await env.WAITLIST_RATE_LIMITER.limit({ key: `waitlist:${ip}` });
    if (!success) return reply(429, { ok: false, code: 'rate_limited' });
  }

  const missing = (['TURNSTILE_SECRET_KEY', 'KIT_API_KEY'] as const).filter((name) => !env[name]);
  if (missing.length) {
    console.error(`waitlist: not configured, missing ${missing.join(', ')}`);
    return reply(503, { ok: false, code: 'server', message: 'The waitlist is not configured yet.' });
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { ok: false, code: 'invalid_email' });

  let form: FormData;
  try {
    form = await request.formData();
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
    const outcome = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn(`waitlist: turnstile rejected (${(outcome['error-codes'] ?? []).join(', ') || 'no code'})`);
      return reply(403, { ok: false, code: 'verification_failed' });
    }
  } catch {
    console.error('waitlist: turnstile siteverify unreachable');
    return reply(502, { ok: false, code: 'server' });
  }

  // 4. Kit
  try {
    await subscribe(env, email);
  } catch (err) {
    console.error(`waitlist: kit failed (${err instanceof Error ? err.message : 'unknown'})`);
    return reply(502, { ok: false, code: 'server' });
  }
  return reply(200, { ok: true });
}

async function kit(env: WaitlistEnv, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${KIT_API}${path}`, {
    ...init,
    headers: { 'X-Kit-Api-Key': env.KIT_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  // Only the status goes into the error: Kit's error bodies can echo the email back.
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path.split('?')[0].replace(/\/\d+\//, '/:id/')} ${res.status}`);
  return res;
}

async function subscribe(env: WaitlistEnv, email: string): Promise<void> {
  // Creates the subscriber, or returns the existing one (200) if the email is already in Kit.
  await kit(env, '/subscribers', { method: 'POST', body: JSON.stringify({ email_address: email }) });
  const tagId = env.KIT_WAITLIST_TAG_ID?.trim() || (await findOrCreateTag(env, env.KIT_WAITLIST_TAG_NAME?.trim() || DEFAULT_TAG_NAME));
  // Tagging someone who already has the tag is a 200, not an error.
  await kit(env, `/tags/${encodeURIComponent(tagId)}/subscribers`, { method: 'POST', body: JSON.stringify({ email_address: email }) });
}

let cachedTagId: string | undefined;

async function findOrCreateTag(env: WaitlistEnv, name: string): Promise<string> {
  if (cachedTagId) return cachedTagId;
  type Page = { tags: { id: number; name: string }[]; pagination?: { has_next_page?: boolean; end_cursor?: string } };
  let after = '';
  for (let page = 0; page < 20; page++) {
    const res = await kit(env, `/tags?per_page=1000${after ? `&after=${encodeURIComponent(after)}` : ''}`);
    const data = (await res.json()) as Page;
    const tag = data.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (tag) return (cachedTagId = String(tag.id));
    if (!data.pagination?.has_next_page || !data.pagination.end_cursor) break;
    after = data.pagination.end_cursor;
  }
  const res = await kit(env, '/tags', { method: 'POST', body: JSON.stringify({ name }) });
  const created = (await res.json()) as { tag: { id: number } };
  return (cachedTagId = String(created.tag.id));
}
