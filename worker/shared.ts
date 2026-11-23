// Small helpers shared by the Worker's form endpoints (worker/waitlist.ts, worker/snapshot.ts).
// Nothing here logs a token, an email or an IP.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const FETCH_TIMEOUT_MS = 10_000; // per outside call (Turnstile, Kit)

// Hostnames a Turnstile token may have been solved on: production, plus the workers.dev preview
// host and its per-branch and per-version aliases (e.g. feat-site-polish-happli-website.…).
const TURNSTILE_HOSTS = new Set(['gohappli.com', 'www.gohappli.com', 'happli-website.gkantsios.workers.dev']);
const PREVIEW_HOST_SUFFIX = '-happli-website.gkantsios.workers.dev';

export function isAllowedTurnstileHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return TURNSTILE_HOSTS.has(host) || (host.endsWith(PREVIEW_HOST_SUFFIX) && /^[a-z0-9-]+$/.test(host.slice(0, -PREVIEW_HOST_SUFFIX.length)));
}

/**
 * Checks a Turnstile token with Cloudflare's siteverify, and that it was solved on one of our hostnames.
 * `tag` prefixes the (token-free) log lines, e.g. "waitlist".
 */
export async function verifyTurnstile(secret: string, token: string, ip: string | null, tag: string): Promise<'ok' | 'rejected' | 'unreachable'> {
  if (!token || token.length > 2048) return 'rejected';
  try {
    const body = new FormData();
    body.set('secret', secret);
    body.set('response', token);
    if (ip) body.set('remoteip', ip);
    const res = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const outcome = (await res.json()) as { success?: boolean; hostname?: string; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn(`${tag}: turnstile rejected (${(outcome['error-codes'] ?? []).join(', ') || 'no code'})`);
      return 'rejected';
    }
    if (!isAllowedTurnstileHost(outcome.hostname)) {
      console.warn(`${tag}: turnstile token solved on a hostname not in the allowlist`);
      return 'rejected';
    }
    return 'ok';
  } catch {
    console.error(`${tag}: turnstile siteverify unreachable`);
    return 'unreachable';
  }
}

/** Reads the body, giving up as soon as it passes `max` bytes (null), whatever Content-Length says. */
export async function readCapped(request: Request, max: number): Promise<Uint8Array | null> {
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

/**
 * Only our own pages post to the API. Browsers send Origin on every POST; the one exception allowed is
 * a plain HTML form post (no JavaScript), recognized by its form content type.
 */
export function isSameOriginPost(request: Request, wantsJson: boolean, plainTypes: string[]): boolean {
  const origin = request.headers.get('origin');
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  const plainFormPost = !wantsJson && plainTypes.some((t) => contentType.startsWith(t));
  return origin ? URL.parse(origin)?.host === new URL(request.url).host : plainFormPost;
}
