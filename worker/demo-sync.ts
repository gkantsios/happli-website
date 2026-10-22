// Cron (every 5 minutes, wrangler.jsonc "triggers"): tags new "Happli Demo" TidyCal bookings in Kit.
//
// TidyCal has no webhooks, so this polls GET https://tidycal.com/api/bookings. That endpoint can't
// filter by booking type or creation time (both are ignored), but it does filter by `starts_at`
// (bookings starting at or after that time), and pages are newest-start first, 100 a page. So:
//   1. ask for bookings starting from LOOKBACK ago onward (a new demo is always in the future),
//   2. keep those with booking_type_id === TIDYCAL_BOOKING_TYPE_ID, no cancelled_at / deleted_at,
//      and created_at within the last LOOKBACK,
//   3. subscribe each contact to the Kit v3 tag KIT_DEMO_TAG_ID.
// The 30-minute window overlaps six runs, so a run that fails is retried by the next ones. Kit's tag
// subscribe is idempotent (a known email that already has the tag is a 200), so repeats are harmless
// and no state (KV) is needed.
// Logs hold only counts and status codes: never an email, name or booking id.

export interface DemoSyncEnv {
  TIDYCAL_API_TOKEN?: string;
  TIDYCAL_BOOKING_TYPE_ID?: string;
  KIT_API_KEY?: string;
  KIT_DEMO_TAG_ID?: string;
}

export interface DemoSyncResult {
  ok: boolean;
  matched: number;
  tagged: number;
  failed: number;
  reason?: string;
}

const TIDYCAL_API = 'https://tidycal.com/api';
const KIT_API = 'https://api.convertkit.com/v3';
export const LOOKBACK_MS = 30 * 60 * 1000;
const MAX_PAGES = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Booking {
  booking_type_id?: number;
  created_at?: string;
  cancelled_at?: string | null;
  deleted_at?: string | null;
  contact?: { email?: string; name?: string } | null;
}
interface Page {
  data?: Booking[];
  next_page_url?: string | null;
}

export async function syncDemoBookings(env: DemoSyncEnv, now: Date = new Date()): Promise<DemoSyncResult> {
  const missing = (['TIDYCAL_API_TOKEN', 'TIDYCAL_BOOKING_TYPE_ID', 'KIT_API_KEY', 'KIT_DEMO_TAG_ID'] as const).filter(
    (name) => !env[name]?.trim(),
  );
  if (missing.length) {
    console.error(`demo-sync: not configured, missing ${missing.join(', ')}`);
    return { ok: false, matched: 0, tagged: 0, failed: 0, reason: 'not_configured' };
  }
  const typeId = Number(env.TIDYCAL_BOOKING_TYPE_ID!.trim());
  const tagId = env.KIT_DEMO_TAG_ID!.trim();
  if (!Number.isInteger(typeId) || !/^\d+$/.test(tagId)) {
    console.error('demo-sync: not configured, TIDYCAL_BOOKING_TYPE_ID and KIT_DEMO_TAG_ID must be numeric');
    return { ok: false, matched: 0, tagged: 0, failed: 0, reason: 'not_configured' };
  }

  const since = now.getTime() - LOOKBACK_MS;
  const startsFrom = new Date(since).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const found = new Map<string, string>(); // email -> first name

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${TIDYCAL_API}/bookings?starts_at=${encodeURIComponent(startsFrom)}&page=${page}`;
    let data: Page;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${env.TIDYCAL_API_TOKEN!.trim()}`, Accept: 'application/json' },
      });
      if (!res.ok) {
        console.error(`demo-sync: tidycal GET /bookings ${res.status}`);
        return { ok: false, matched: 0, tagged: 0, failed: 0, reason: 'tidycal' };
      }
      data = (await res.json()) as Page;
    } catch {
      console.error('demo-sync: tidycal unreachable');
      return { ok: false, matched: 0, tagged: 0, failed: 0, reason: 'tidycal' };
    }
    for (const b of data.data ?? []) {
      if (b.booking_type_id !== typeId || b.cancelled_at || b.deleted_at) continue;
      const created = Date.parse(b.created_at ?? '');
      if (!(created >= since)) continue;
      const email = (b.contact?.email ?? '').trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 254) continue;
      if (!found.has(email)) found.set(email, (b.contact?.name ?? '').trim().split(/\s+/)[0]?.slice(0, 100) ?? '');
    }
    if (!data.next_page_url) break;
  }

  let tagged = 0;
  let failed = 0;
  const statuses: number[] = [];
  for (const [email, firstName] of found) {
    try {
      const res = await fetch(`${KIT_API}/tags/${tagId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_key: env.KIT_API_KEY!.trim(), email, ...(firstName ? { first_name: firstName } : {}) }),
      });
      if (res.ok) tagged++;
      else {
        failed++;
        statuses.push(res.status);
      }
    } catch {
      failed++;
      statuses.push(0);
    }
  }
  const tail = statuses.length ? ` (kit statuses ${[...new Set(statuses)].join(', ')})` : '';
  console.log(`demo-sync: matched ${found.size}, tagged ${tagged}, failed ${failed}${tail}`);
  return { ok: failed === 0, matched: found.size, tagged, failed };
}
