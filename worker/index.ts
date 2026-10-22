// The site's Worker. Static pages are served straight from dist/ (assets); only /api/* runs this
// script first (wrangler.jsonc "run_worker_first"). Anything else that reaches it goes to the assets.
import { handleWaitlist, type WaitlistEnv } from './waitlist';
import { syncDemoBookings, type DemoSyncEnv } from './demo-sync';

interface Env extends WaitlistEnv, DemoSyncEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/waitlist' || pathname === '/api/waitlist/') return handleWaitlist(request, env);
    if (pathname.startsWith('/api/')) return Response.json({ ok: false, code: 'not_found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },

  // Cron (wrangler.jsonc "triggers"): tag new Happli Demo bookings in Kit. See worker/demo-sync.ts.
  async scheduled(_controller: unknown, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(syncDemoBookings(env));
  },
};
