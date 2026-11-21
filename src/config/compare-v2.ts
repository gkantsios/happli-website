// Compare v2 (hidden preview at /compare-v2/): the ranked "What a studio pays a month" chart and the platform list.
// Every competitor number here comes from that company's own pricing page, checked on `checked` below, and is
// cited on the page. Happli's numbers come from src/config/pricing.ts. Money is integer cents; every total is
// computed from the unit prices, so the chart can't drift from its own math.
//
// Chart rules (shown in the footnote): bookable people only, one location, billed monthly in USD, software only
// (no card processing), and each platform's cheapest plan with online booking and reminders for that many people.
// The plan picks follow the Team of 3 reference agreed for this page. Square: Plus on every tab (its Free plan is
// footnoted). GlossGenius: Standard for one, Gold (up to 9 staff) for a team. Fresha: Independent for one, Team per
// bookable member for a team. Vagaro: the 6-month intro rate (footnoted with the regular $30).

import { plan } from './pricing';

/** The day every competitor price below was read from its pricing page. */
export const checked = 'Nov 21, 2026';
export const checkedIso = '2026-11-21';

export type SizeKey = 'solo' | 'team3' | 'team5';
export const sizes: ReadonlyArray<{ key: SizeKey; label: string; people: number }> = [
  { key: 'solo', label: 'Solo', people: 1 },
  { key: 'team3', label: 'Team of 3', people: 3 },
  { key: 'team5', label: 'Team of 5', people: 5 },
];
export const defaultSize: SizeKey = 'team3';

export type Pick = {
  /** The plan the chart uses for this many people. */
  plan: string;
  /** Monthly price in cents. */
  cents: number;
  /** How the price is worked out, for the footnote, the platform page and the PR. */
  math: string;
};

export type Platform = {
  slug: string;
  name: string;
  /** Shorter name for tight rows. */
  short: string;
  source: { href: string; text: string };
  pick: (people: number) => Pick;
  /** Shown under the chart as a footnote for this row (an intro price, a cap). */
  note?: string;
};

const usdCents = (c: number) => (c % 100 === 0 ? `$${(c / 100).toLocaleString('en-US')}` : `$${(c / 100).toFixed(2)}`);
export const formatCents = usdCents;

const happliBase = Math.round(plan.launch.monthly * 100);
const happliExtra = Math.round(plan.extraMember.monthly * 100);

export const happli: Platform = {
  slug: 'happli',
  name: 'Happli',
  short: 'Happli',
  source: { href: '/pricing/', text: 'gohappli.com/pricing' },
  pick: (n) => ({
    plan: 'Launch price',
    cents: happliBase + (n - 1) * happliExtra,
    math: n === 1 ? `${usdCents(happliBase)} for one booker` : `${usdCents(happliBase)} + ${n - 1} × ${usdCents(happliExtra)} per extra booker`,
  }),
};

export const platforms: ReadonlyArray<Platform> = [
  {
    slug: 'square',
    name: 'Square Appointments',
    short: 'Square',
    source: { href: 'https://squareup.com/us/en/appointments/pricing', text: 'squareup.com/appointments/pricing' },
    pick: () => ({ plan: 'Plus', cents: 4900, math: '$49 per location, unlimited staff calendars' }),
    note: 'Square: a Free plan ($0 per location) also exists; the chart uses Plus, where waitlist and no-show fees start.',
  },
  {
    slug: 'glossgenius',
    name: 'GlossGenius',
    short: 'GlossGenius',
    source: { href: 'https://glossgenius.com/pricing', text: 'glossgenius.com/pricing' },
    pick: (n) =>
      n === 1
        ? { plan: 'Standard', cents: 2800, math: '$28 a month billed monthly' }
        : { plan: 'Gold', cents: 5600, math: '$56 a month billed monthly, up to 9 staff' },
  },
  {
    slug: 'vagaro',
    name: 'Vagaro',
    short: 'Vagaro',
    source: { href: 'https://www.vagaro.com/pro/pricing', text: 'vagaro.com/pro/pricing' },
    pick: (n) => ({
      plan: 'Intro rate',
      cents: 2399 + (n - 1) * 1000,
      math: n === 1 ? '$23.99 intro rate' : `$23.99 intro rate + ${n - 1} × $10 bookable calendar`,
    }),
    note: 'Vagaro: $23.99 is an intro rate for the first 6 months; $30 after that.',
  },
  {
    slug: 'fresha',
    name: 'Fresha',
    short: 'Fresha',
    source: { href: 'https://www.fresha.com/pricing', text: 'fresha.com/pricing' },
    pick: (n) =>
      n === 1
        ? { plan: 'Independent', cents: 1995, math: '$19.95 a month' }
        : { plan: 'Team', cents: 1495 * n, math: `${n} × $14.95 per bookable member` },
  },
  {
    slug: 'mangomint',
    name: 'Mangomint',
    short: 'Mangomint',
    source: { href: 'https://mangomint.com/pricing', text: 'mangomint.com/pricing' },
    pick: (n) => ({ plan: 'Per location + users', cents: 12000 + n * 1000, math: `$120 per location + ${n} × $10 per user` }),
  },
  {
    slug: 'boulevard',
    name: 'Boulevard',
    short: 'Boulevard',
    source: { href: 'https://www.joinblvd.com/pricing', text: 'joinblvd.com/pricing' },
    pick: () => ({ plan: 'Essentials', cents: 15900, math: '$159 a month, 1 location, up to 5 providers' }),
  },
];

export type ChartRow = { slug: string; name: string; short: string; plan: string; cents: number; price: string; math: string; happli: boolean };

/** One tab of the chart: every platform's pick for this many people, cheapest first (ties keep list order). */
export function chartRows(people: number): ChartRow[] {
  return [happli, ...platforms]
    .map((p, i) => ({ p, i, pick: p.pick(people) }))
    .sort((a, b) => a.pick.cents - b.pick.cents || a.i - b.i)
    .map(({ p, pick }) => ({
      slug: p.slug,
      name: p.name,
      short: p.short,
      plan: pick.plan,
      cents: pick.cents,
      price: usdCents(pick.cents),
      math: pick.math,
      happli: p.slug === 'happli',
    }));
}

/** Stripe's standard US card rate, which studios pay on their own Stripe account; Happli adds nothing. */
export const stripeRate = { text: '2.9% + 30¢', href: 'https://stripe.com/pricing' };

/** The live hub and pages this preview mirrors; the preview never links back into the live site's compare section. */
export const v2Base = '/compare-v2/';
