// POST /api/snapshot: the Beauty Business Snapshot form on /snapshot/.
//
// 1. Checks the origin, the per-IP rate limit, the body size and the form: every answer must be one of
//    the bands in src/config/snapshot.ts, and the ZIP (or city + state) must be in the bundled table.
// 2. A filled honeypot ("website") or a failed Turnstile check stores nothing.
// 3. Saves two rows in one D1 batch, in two tables that cannot be joined (migrations/0001_snapshot.sql):
//    - snapshot_answers: a random id, the region keys and the bands. No ZIP, email, name, IP or time.
//    - snapshot_contacts: another random id, the email, the optional first name, an HMAC of the email
//      (SNAPSHOT_HASH_SECRET) for one-submission-per-email, and the month.
//    A repeat email stores nothing new and still gets results, built from the public aggregates and
//    the answers in this request. Nothing is ever looked up by email.
// 4. Replies with the comparison: the most local group (city, metro, state, national) with at least
//    K_MIN answers, or clearly labeled sample data when even the national group is smaller.
//
// Replies with JSON: { ok: true, duplicate, results } or { ok: false, code, field? }.
// A plain form post (no JavaScript) is redirected back to /snapshot/?result=<code> instead.
// Nothing personal (email, name, IP, ZIP, token) is ever logged.
import { K_MIN, questions, sampleGroups, services } from '../src/config/snapshot';
import { isSameOriginPost, isValidEmail, readCapped, verifyTurnstile } from './shared';
import { regionForCity, regionForZip, type Region } from './snapshot-regions';

/** The parts of a D1 database binding this file uses. */
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

export interface SnapshotEnv {
  /** D1 database "happli-snapshot" (wrangler.jsonc "d1_databases"). */
  SNAPSHOT_DB?: D1Like;
  /** Long random pepper for the email HMAC. Worker secret. */
  SNAPSHOT_HASH_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** Per-IP limit on submissions (wrangler.jsonc "ratelimits"). */
  SNAPSHOT_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

type Code =
  | 'not_configured'
  | 'rate_limited'
  | 'too_large'
  | 'invalid_answers'
  | 'missing_location'
  | 'unknown_zip'
  | 'unknown_city'
  | 'invalid_email'
  | 'verification_failed'
  | 'server';

export type Level = 'city' | 'metro' | 'state' | 'national';
export type Results = {
  level: Level;
  /** "Tulsa", "the Tulsa area", "Oklahoma" or "the US". */
  place: string;
  /** True when the distributions are the made-up preview shapes, not live answers. */
  sample: boolean;
  /** Live answers in the group (null for sample data). */
  count: number | null;
  /** Why a less local group is shown, e.g. "Not enough local answers yet — here is Oklahoma." */
  fallback: string | null;
  /** Answers per band for each question; for services, how many offer each one (out of `total`). */
  groups: Record<string, Record<string, number>>;
  total: number;
};

const MAX_BODY_BYTES = 8 * 1024;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const serviceValues = new Set(services.map((s) => s.value));

export type Answers = { services: string[] } & Record<string, string | string[]>;

/** The form's answers, or the name of the first field that isn't one of its allowed bands. */
export function parseAnswers(get: (name: string) => string, getAll: (name: string) => string[]): { answers: Answers } | { field: string } {
  const picked = [...new Set(getAll('services'))];
  if (!picked.length || picked.length > services.length || picked.some((s) => !serviceValues.has(s))) return { field: 'services' };
  const answers: Answers = { services: picked.sort() };
  for (const q of questions) {
    const value = get(q.name);
    if (!q.bands.some((b) => b.value === value)) return { field: q.name };
    answers[q.name] = value;
  }
  return { answers };
}

/** The most local group with at least K_MIN answers; a city or metro below that never shows. Null: none has. */
export function pickLevel(counts: { city: number; metro: number | null; state: number; national: number }): Level | null {
  if (counts.city >= K_MIN) return 'city';
  if (counts.metro !== null && counts.metro >= K_MIN) return 'metro';
  if (counts.state >= K_MIN) return 'state';
  if (counts.national >= K_MIN) return 'national';
  return null;
}

export function placeName(level: Level, region: Region): string {
  if (level === 'city') return region.city;
  if (level === 'metro') return `the ${region.metro} area`;
  if (level === 'state') return region.stateName;
  return 'the US';
}

export function fallbackNote(level: Level | null, region: Region): string | null {
  if (level === 'city') return null;
  if (level === 'metro') return `Not enough answers in ${region.city} yet — here is ${placeName('metro', region)}.`;
  if (level === 'state') return `Not enough local answers yet — here is ${region.stateName}.`;
  if (level === 'national') return `Not enough answers in ${region.stateName} yet — here is the national picture.`;
  return 'Not enough answers anywhere yet, so the charts below use sample data.';
}

// Column names come from src/config/snapshot.ts, never from the request.
const WHERE: Record<Level, string> = { city: 'city_key = ?1', metro: 'metro_key = ?1', state: 'state = ?1', national: '?1 IS NULL' };

export async function compare(db: D1Like, region: Region): Promise<Results> {
  const counts = await db
    .prepare('SELECT COUNT(*) AS national, SUM(state = ?1) AS state, SUM(metro_key = ?2) AS metro, SUM(city_key = ?3) AS city FROM snapshot_answers')
    .bind(region.state, region.metroKey, region.cityKey)
    .first<Record<Level, number | null>>();
  const level = pickLevel({
    city: counts?.city ?? 0,
    metro: region.metroKey ? counts?.metro ?? 0 : null,
    state: counts?.state ?? 0,
    national: counts?.national ?? 0,
  });
  if (!level) {
    return { level: 'national', place: 'the US', sample: true, count: null, fallback: fallbackNote(null, region), groups: sampleGroups(), total: 100 };
  }

  const key = { city: region.cityKey, metro: region.metroKey, state: region.state, national: null }[level];
  const bands = questions.map((q) => `SELECT '${q.name}' AS q, ${q.name} AS b, COUNT(*) AS n FROM snapshot_answers WHERE ${WHERE[level]} GROUP BY ${q.name}`).join(' UNION ALL ');
  const offered = services.map((s) => `SUM(instr(services, ',${s.value},') > 0) AS ${s.value}`).join(', ');
  const [rows, svc] = await Promise.all([
    db.prepare(bands).bind(key).all<{ q: string; b: string; n: number }>(),
    db.prepare(`SELECT COUNT(*) AS total, ${offered} FROM snapshot_answers WHERE ${WHERE[level]}`).bind(key).first<Record<string, number | null>>(),
  ]);
  const groups: Record<string, Record<string, number>> = {};
  groups.services = Object.fromEntries(services.map((s) => [s.value, svc?.[s.value] ?? 0]));
  for (const q of questions) groups[q.name] = Object.fromEntries(q.bands.map((b) => [b.value, 0]));
  for (const r of rows.results) if (groups[r.q] && r.b in groups[r.q]) groups[r.q][r.b] = r.n;
  const total = svc?.total ?? 0;
  return { level, place: placeName(level, region), sample: false, count: total, fallback: fallbackNote(level, region), groups, total };
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Saves the answers and the contact, unlinked. False when the email already has a submission. */
export async function save(db: D1Like, secret: string, answers: Answers, region: Region, email: string, firstName: string): Promise<boolean> {
  const emailHash = await hmacHex(secret, email);
  const cols = questions.map((q) => q.name);
  const answerRow = db
    .prepare(`INSERT INTO snapshot_answers (id, city_key, metro_key, state, services, ${cols.join(', ')}) VALUES (${Array(5 + cols.length).fill('?').join(', ')})`)
    .bind(crypto.randomUUID(), region.cityKey, region.metroKey, region.state, `,${answers.services.join(',')},`, ...cols.map((c) => answers[c]));
  const contactRow = db
    .prepare('INSERT INTO snapshot_contacts (id, email, first_name, email_hash, period) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), email, firstName || null, emailHash, new Date().toISOString().slice(0, 7));
  try {
    // One transaction: a repeat email (UNIQUE email_hash) rolls back the answers row too.
    await db.batch([contactRow, answerRow]);
    return true;
  } catch (err) {
    if (/UNIQUE/i.test(err instanceof Error ? err.message : String(err))) return false;
    throw err;
  }
}

export async function handleSnapshot(request: Request, env: SnapshotEnv): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, body: { ok: true; duplicate: boolean; results: Results } | { ok: false; code: Code; field?: string }) => {
    if (!wantsJson && request.method === 'POST') {
      const result = body.ok ? (body.duplicate ? 'duplicate' : 'ok') : body.code;
      return new Response(null, { status: 303, headers: { Location: `/snapshot/?result=${result}`, 'Cache-Control': 'no-store' } });
    }
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  };

  if (request.method !== 'POST') {
    return Response.json({ ok: false, code: 'server' }, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
  }
  // Kept as sent: a multipart boundary is case-sensitive.
  const contentType = request.headers.get('content-type') ?? '';
  if (!isSameOriginPost(request, wantsJson, ['application/x-www-form-urlencoded', 'multipart/form-data'])) {
    return Response.json({ ok: false, code: 'server' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  // Fail closed: without the database, the pepper and the rate limiter, nothing is accepted.
  const host = new URL(request.url).hostname;
  const devWithoutTurnstile = !env.TURNSTILE_SECRET_KEY?.trim() && LOCAL_HOSTS.has(host);
  const missing = [
    !env.SNAPSHOT_DB && 'SNAPSHOT_DB',
    !env.SNAPSHOT_HASH_SECRET?.trim() && 'SNAPSHOT_HASH_SECRET',
    !env.SNAPSHOT_RATE_LIMITER && 'SNAPSHOT_RATE_LIMITER',
    !env.TURNSTILE_SECRET_KEY?.trim() && !devWithoutTurnstile && 'TURNSTILE_SECRET_KEY',
  ].filter(Boolean);
  if (missing.length) {
    console.error(`snapshot: not configured, missing ${missing.join(', ')}`);
    return reply(503, { ok: false, code: 'not_configured' });
  }
  const db = env.SNAPSHOT_DB!;

  // The IP is only a rate-limit key here and for Turnstile; it's never stored or logged.
  const ip = request.headers.get('cf-connecting-ip');
  const { success } = await env.SNAPSHOT_RATE_LIMITER!.limit({ key: `snapshot:${ip ?? 'unknown'}` });
  if (!success) return reply(429, { ok: false, code: 'rate_limited' });

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { ok: false, code: 'too_large' });
  const bytes = await readCapped(request, MAX_BODY_BYTES);
  if (!bytes) return reply(413, { ok: false, code: 'too_large' });
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(bytes), { headers: { 'content-type': contentType } }).formData();
  } catch {
    return reply(400, { ok: false, code: 'invalid_answers' });
  }
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };

  const parsed = parseAnswers(field, (name) => form.getAll(name).filter((v): v is string => typeof v === 'string'));
  if ('field' in parsed) return reply(400, { ok: false, code: 'invalid_answers', field: parsed.field });

  // The ZIP is only used to find the region; it isn't stored.
  const zip = field('zip').trim();
  let region: Region | null;
  if (zip) {
    region = regionForZip(zip);
    if (!region) return reply(400, { ok: false, code: 'unknown_zip', field: 'zip' });
  } else if (field('city').trim() || field('state').trim()) {
    region = regionForCity(field('city'), field('state'));
    if (!region) return reply(400, { ok: false, code: 'unknown_city', field: 'city' });
  } else {
    return reply(400, { ok: false, code: 'missing_location', field: 'zip' });
  }

  const email = field('email').trim().toLowerCase();
  if (!isValidEmail(email)) return reply(400, { ok: false, code: 'invalid_email', field: 'email' });
  const firstName = field('first_name').trim().replace(/\s+/g, ' ').slice(0, 60);

  try {
    // Honeypot: bots fill every field. Show them the comparison, store nothing.
    if (field('website').trim() !== '') return reply(200, { ok: true, duplicate: false, results: await compare(db, region) });

    if (!devWithoutTurnstile) {
      const verified = await verifyTurnstile(env.TURNSTILE_SECRET_KEY!, field('cf-turnstile-response'), ip, 'snapshot');
      if (verified === 'unreachable') return reply(502, { ok: false, code: 'server' });
      if (verified !== 'ok') return reply(403, { ok: false, code: 'verification_failed' });
    }

    const saved = await save(db, env.SNAPSHOT_HASH_SECRET!, parsed.answers, region, email, firstName);
    return reply(200, { ok: true, duplicate: !saved, results: await compare(db, region) });
  } catch (err) {
    // Only the error's name: D1 messages can include bound values.
    console.error(`snapshot: database error (${err instanceof Error ? err.name : 'unknown'})`);
    return reply(500, { ok: false, code: 'server' });
  }
}
