// Compare v2 (hidden preview at /compare-v2/): the ranked "What a studio pays a month" chart, its two modes, the
// "What comes in that price" matrix and the platform list. Every competitor fact here comes from one of the source
// pages in `sources` below, checked on `checked`, and is linked on the page. Happli's prices come from
// src/config/pricing.ts. Money is integer cents; every total is computed from unit prices, so the chart, the cards
// and the PR math can't drift apart.
//
// Chart rules (shown in the footnote): bookable people only, one location, billed monthly in USD, software only
// (no card processing).
// - "Software only": each platform's cheapest plan with online booking and reminders for that many people.
//   Square: Plus on every tab (its Free plan is footnoted). GlossGenius: Standard for one, Gold (up to 9 staff) for
//   a team. Fresha: Independent for one, Team per bookable member for a team. Vagaro: the 6-month intro rate
//   (footnoted with the regular $30).
// - "With forms, waitlist and a website": the cheapest plan that includes forms and a waitlist, plus any published
//   website or website-builder add-on (not a booking link alone). Where forms or a website add-on have no published
//   price, the plan stays as it is and the footnote says so. Marketing add-ons are never added.

import { plan } from './pricing';

/** The day every competitor fact below was read from its source page. */
export const checked = 'Nov 21, 2026';
export const checkedIso = '2026-11-21';

export type SizeKey = 'solo' | 'team3' | 'team5';
export const sizes: ReadonlyArray<{ key: SizeKey; label: string; people: number }> = [
  { key: 'solo', label: 'Solo', people: 1 },
  { key: 'team3', label: 'Team of 3', people: 3 },
  { key: 'team5', label: 'Team of 5', people: 5 },
];
export const defaultSize: SizeKey = 'team3';

export type ModeKey = 'base' | 'loaded';
export const modes: ReadonlyArray<{ key: ModeKey; label: string }> = [
  { key: 'base', label: 'Software only' },
  { key: 'loaded', label: 'With forms, waitlist and a website' },
];
export const defaultMode: ModeKey = 'base';

/** Every page a claim on the preview cites. */
export const sources = {
  happliPricing: { href: '/pricing/', text: 'Happli pricing' },
  happliFeatures: { href: '/features/', text: 'Happli features' },
  stripe: { href: 'https://stripe.com/pricing', text: 'Stripe pricing' },
  square: { href: 'https://squareup.com/us/en/appointments/pricing', text: 'Square Appointments pricing' },
  squareSite: { href: 'https://squareup.com/us/en/appointments/features/online-booking-website', text: 'Square online booking website' },
  gg: { href: 'https://glossgenius.com/pricing', text: 'GlossGenius pricing' },
  ggSite: { href: 'https://glossgenius.com/custom-website-builder', text: 'GlossGenius website builder' },
  vagaro: { href: 'https://www.vagaro.com/pro/pricing', text: 'Vagaro pricing' },
  fresha: { href: 'https://www.fresha.com/pricing', text: 'Fresha pricing' },
  freshaSite: { href: 'https://www.fresha.com/help-center/knowledge-base/online-presence/109897-launch-your-website', text: 'Fresha Smart Website help' },
  mm: { href: 'https://mangomint.com/pricing', text: 'Mangomint pricing' },
  mmBooking: { href: 'https://mangomint.com/features/online-booking/', text: 'Mangomint online booking' },
  mmSite: { href: 'https://www.mangomint.com/learn/adding-online-booking-to-your-website/', text: 'Mangomint: add booking to your website' },
  blvd: { href: 'https://www.joinblvd.com/pricing', text: 'Boulevard pricing' },
  blvdBooking: { href: 'https://www.joinblvd.com/features/self-booking', text: 'Boulevard self-booking' },
  blvdForms: { href: 'https://www.joinblvd.com/features/forms', text: 'Boulevard forms' },
} as const;
export type SourceKey = keyof typeof sources;

export type Pick = {
  /** The plan (and add-ons) the chart uses for this many people. */
  plan: string;
  /** Monthly price in cents. */
  cents: number;
  /** How the price is worked out, for the PR and the notes. */
  math: string;
};

export type Platform = {
  slug: string;
  name: string;
  /** Shorter name for tight rows and table headers. */
  short: string;
  source: { href: string; text: string };
  /** Software only. */
  pick: (people: number) => Pick;
  /** With forms, a waitlist and any published website add-on. */
  loaded: (people: number) => Pick;
};

const usdCents = (c: number) => (c % 100 === 0 ? `$${(c / 100).toLocaleString('en-US')}` : `$${(c / 100).toFixed(2)}`);
export const formatCents = usdCents;

const happliBase = Math.round(plan.launch.monthly * 100);
const happliExtra = Math.round(plan.extraMember.monthly * 100);
const happliPick = (n: number): Pick => ({
  plan: 'Launch price',
  cents: happliBase + (n - 1) * happliExtra,
  math: n === 1 ? `${usdCents(happliBase)} for one booker` : `${usdCents(happliBase)} + ${n - 1} × ${usdCents(happliExtra)} per extra booker`,
});

export const happli: Platform = {
  slug: 'happli',
  name: 'Happli',
  short: 'Happli',
  source: { href: '/pricing/', text: 'gohappli.com/pricing' },
  pick: happliPick,
  // Forms, a waitlist and a website built for you are in the plan.
  loaded: (n) => ({ ...happliPick(n), plan: 'Launch price, all in' }),
};

const VAGARO_FORMS = 1000;
const VAGARO_SITE = 2000;
const FRESHA_SITE = 1595;
const vagaroBase = (n: number) => 2399 + (n - 1) * 1000;
const freshaBase = (n: number): Pick =>
  n === 1
    ? { plan: 'Independent', cents: 1995, math: '$19.95 a month' }
    : { plan: 'Team', cents: 1495 * n, math: `${n} × $14.95 per bookable member` };

export const platforms: ReadonlyArray<Platform> = [
  {
    slug: 'square',
    name: 'Square Appointments',
    short: 'Square',
    source: { href: sources.square.href, text: 'squareup.com/appointments/pricing' },
    pick: () => ({ plan: 'Plus', cents: 4900, math: '$49 per location, unlimited staff calendars' }),
    // Waitlist starts on Plus; a booking site / Square Online site is included; forms aren't listed, so no bump.
    loaded: () => ({ plan: 'Plus, site included', cents: 4900, math: '$49 Plus (waitlist starts on Plus; booking site included)' }),
  },
  {
    slug: 'glossgenius',
    name: 'GlossGenius',
    short: 'GlossGenius',
    source: { href: sources.gg.href, text: 'glossgenius.com/pricing' },
    pick: (n) =>
      n === 1
        ? { plan: 'Standard', cents: 2800, math: '$28 a month billed monthly' }
        : { plan: 'Gold', cents: 5600, math: '$56 a month billed monthly, up to 9 staff' },
    // Forms and waitlist start on Gold; the website builder is on every plan.
    loaded: () => ({ plan: 'Gold, builder included', cents: 5600, math: '$56 Gold (forms and waitlist start on Gold; website builder included)' }),
  },
  {
    slug: 'vagaro',
    name: 'Vagaro',
    short: 'Vagaro',
    source: { href: sources.vagaro.href, text: 'vagaro.com/pro/pricing' },
    pick: (n) => ({
      plan: 'Intro rate',
      cents: vagaroBase(n),
      math: n === 1 ? '$23.99 intro rate' : `$23.99 intro rate + ${n - 1} × $10 bookable calendar`,
    }),
    // Waitlist is included; forms $10 and MySite $20 are add-ons.
    loaded: (n) => ({
      plan: 'Intro + forms + MySite',
      cents: vagaroBase(n) + VAGARO_FORMS + VAGARO_SITE,
      math: `${usdCents(vagaroBase(n))} intro + $10 forms + $20 MySite (after the intro: ${usdCents(3000 + (n - 1) * 1000 + VAGARO_FORMS + VAGARO_SITE)})`,
    }),
  },
  {
    slug: 'fresha',
    name: 'Fresha',
    short: 'Fresha',
    source: { href: sources.fresha.href, text: 'fresha.com/pricing' },
    pick: freshaBase,
    // Consultation forms and waitlists are on both plans; Smart Website is a $15.95 add-on.
    loaded: (n) => {
      const b = freshaBase(n);
      return { plan: `${b.plan} + Smart Website`, cents: b.cents + FRESHA_SITE, math: `${b.math} + $15.95 Smart Website` };
    },
  },
  {
    slug: 'mangomint',
    name: 'Mangomint',
    short: 'Mangomint',
    source: { href: sources.mm.href, text: 'mangomint.com/pricing' },
    pick: (n) => ({ plan: 'Per location + users', cents: 12000 + n * 1000, math: `$120 per location + ${n} × $10 per user` }),
    // Forms and waitlist are core; no website or builder add-on is listed, so the price stays.
    loaded: (n) => ({ plan: 'No site add-on listed', cents: 12000 + n * 1000, math: `$120 + ${n} × $10 per user (no website add-on listed)` }),
  },
  {
    slug: 'boulevard',
    name: 'Boulevard',
    short: 'Boulevard',
    source: { href: sources.blvd.href, text: 'joinblvd.com/pricing' },
    pick: () => ({ plan: 'Essentials', cents: 15900, math: '$159 a month, 1 location, up to 5 providers' }),
    // Forms add-on price isn't listed (bundled in Prestige), waitlist isn't listed: the price stays.
    loaded: () => ({ plan: 'Essentials, as listed', cents: 15900, math: '$159 Essentials (forms add-on price and waitlist not listed)' }),
  },
];

export type ChartRow = { slug: string; name: string; short: string; plan: string; cents: number; price: string; math: string; happli: boolean };

/** One tab of the chart: every platform's pick for this mode and team size, cheapest first (ties keep list order). */
export function chartRows(people: number, mode: ModeKey = 'base'): ChartRow[] {
  return [happli, ...platforms]
    .map((p, i) => ({ p, i, pick: mode === 'loaded' ? p.loaded(people) : p.pick(people) }))
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

/** The longer chart notes, shown under the matrix rather than in the chart card. */
export const chartNotes: Record<ModeKey, string[]> = {
  base: [
    'Square: a Free plan ($0 per location) also exists; the chart uses Plus, where waitlist and no-show fees start.',
    'Vagaro: $23.99 is an intro rate for the first 6 months; $30 after that, so $30 / $50 / $70 for one, three and five people.',
    'GlossGenius Gold covers up to 9 staff; Boulevard Essentials covers up to 5 providers.',
    'Fresha: Independent for one person, Team at $14.95 per bookable member for a team.',
  ],
  loaded: [
    'Square: Plus, where the waitlist starts; a booking site or Square Online site is included. Forms and waivers aren’t listed on the Appointments pricing page, so the plan isn’t moved up for them.',
    'GlossGenius: Gold, where forms and the waitlist start; the website builder is on every plan.',
    'Vagaro: intro rate + forms ($10) + MySite ($20); the waitlist is already included. After the 6-month intro: $60 / $80 / $100. Text marketing isn’t added: reminders are already included.',
    'Fresha: plan + Smart Website ($15.95); consultation forms and waitlists are on both plans.',
    'Mangomint: forms and waitlist are core, and no website or website-builder add-on is listed (booking is added to a site you already have), so the price stays. Marketing add-ons aren’t added.',
    'Boulevard: forms are an add-on bundled in Prestige ($364/mo) with no standalone price listed, and a waitlist isn’t listed, so the price stays at Essentials.',
    'A website built for you can’t be priced as an add-on on every platform, so that difference is in the table above, not in this number.',
  ],
};

/** Stripe's standard US card rate, which studios pay on their own Stripe account; Happli adds nothing. */
export const stripeRate = { text: '2.9% + 30¢', href: sources.stripe.href };

/** The preview hub; the preview never links back into the live site's compare section. */
export const v2Base = '/compare-v2/';

// ---------------------------------------------------------------------------------------------------------------
// "What comes in that price": the matrix under the chart. One row per feature, one cell per platform. A cell's
// `tone` sets its soft styling: yes (included), addon (a paid add-on or a higher tier), partial (there, with a
// caveat), info (a fact with no verdict), unlisted (the source page is silent: never written as a No).

export type Tone = 'yes' | 'addon' | 'partial' | 'info' | 'unlisted';
export type Cell = { tone: Tone; label: string; detail?: string; src: SourceKey[] };
export type MatrixRow = { key: string; title: string; cells: Record<string, Cell> };

export const columns = ['happli', 'square', 'glossgenius', 'vagaro', 'fresha', 'mangomint', 'boulevard'] as const;
export const columnNames: Record<(typeof columns)[number], string> = {
  happli: 'Happli',
  square: 'Square',
  glossgenius: 'GlossGenius',
  vagaro: 'Vagaro',
  fresha: 'Fresha',
  mangomint: 'Mangomint',
  boulevard: 'Boulevard',
};

const NOT_LISTED_PRICING: Omit<Cell, 'src'> = { tone: 'unlisted', label: 'Not listed', detail: 'Not on its pricing page.' };

export const matrix: MatrixRow[] = [
  {
    key: 'website',
    title: 'A real website, built for you',
    cells: {
      happli: { tone: 'yes', label: 'Yes, built for you', detail: 'Our team at gohappybeauty builds it, it stays in sync with Happli, and it’s included.', src: ['happliPricing'] },
      square: { tone: 'partial', label: 'Included, you set it up', detail: 'A free booking site, or a Square Online site you customize from templates. Booking can also go on a site you have.', src: ['square', 'squareSite'] },
      glossgenius: { tone: 'partial', label: 'Builder included', detail: 'A booking website builder on every plan, with templates you customize.', src: ['gg', 'ggSite'] },
      vagaro: { tone: 'addon', label: 'Add-on, $20/mo', detail: 'Vagaro MySite, a site builder connected to your account.', src: ['vagaro'] },
      fresha: { tone: 'addon', label: 'Add-on, $15.95/mo', detail: 'Booking links are free; Smart Website is a builder that updates from your Fresha account.', src: ['fresha', 'freshaSite'] },
      mangomint: { tone: 'unlisted', label: 'Not listed', detail: 'No website or builder listed; booking is an overlay or link on a site you have.', src: ['mmBooking', 'mmSite'] },
      boulevard: { tone: 'unlisted', label: 'Not listed', detail: 'No website or builder listed; self-booking is an overlay that “stays on your site.”', src: ['blvd', 'blvdBooking'] },
    },
  },
  {
    key: 'setup',
    title: 'Free human setup and import',
    cells: {
      happli: { tone: 'yes', label: 'Yes, done for you', detail: 'Free setup; we import clients, services, team and appointments from CSV.', src: ['happliPricing'] },
      square: { ...NOT_LISTED_PRICING, src: ['square'] },
      glossgenius: { tone: 'partial', label: 'Free data transfer', src: ['gg'] },
      vagaro: { tone: 'yes', label: 'Free switch help', detail: 'Free data transfer from any software, plus training and workshops.', src: ['vagaro'] },
      fresha: { tone: 'partial', label: 'Self-serve import', detail: 'Paid help for complex migrations.', src: ['fresha'] },
      mangomint: { tone: 'yes', label: 'Free onboarding', detail: 'Free data transfer; teams of 2+ providers get a dedicated specialist.', src: ['mm'] },
      boulevard: { ...NOT_LISTED_PRICING, src: ['blvd'] },
    },
  },
  {
    key: 'fees',
    title: 'No extra platform fee on what clients pay you',
    cells: {
      happli: { tone: 'yes', label: 'No Happli fee', detail: 'Your own Stripe account at Stripe’s 2.9% + 30¢.', src: ['happliPricing', 'stripe'] },
      square: { tone: 'info', label: 'Square’s rates', detail: 'Plus: 2.5% + 15¢ in person, 2.9% + 30¢ online. Free: 3.3% + 30¢ online.', src: ['square'] },
      glossgenius: { tone: 'info', label: 'GlossGenius rates', detail: '2.4% + $0.15 in person; 2.9% + $0.30 online invoicing; 3.4% + $0.15 card on file, online or key-in. Instant payouts +1.8%.', src: ['gg'] },
      vagaro: { tone: 'unlisted', label: 'Card rates not listed', detail: '$0 taken from online booking and Marketplace revenue.', src: ['vagaro'] },
      fresha: { tone: 'addon', label: '20% on new marketplace clients', detail: 'One time, $6 minimum; none on returning or your own links. Cards: 2.79% + $0.20 online, 2.29% + $0.20 in person.', src: ['fresha'] },
      mangomint: { tone: 'info', label: 'No booking fee', detail: 'Its payments: 2.45% + 15¢ in person, 2.90% + 30¢ virtual. Deposits and cards on file need them.', src: ['mm'] },
      boulevard: { tone: 'unlisted', label: 'Standard rates not listed', detail: 'Optional Offset: clients pay 3%, the business 1%.', src: ['blvd'] },
    },
  },
  {
    key: 'approve',
    title: 'AI drafts, you approve (Needs you list)',
    cells: {
      happli: { tone: 'yes', label: 'Yes', detail: 'Open gaps, waitlist matches and drafted texts in one list; nothing AI-drafted sends until you approve.', src: ['happliFeatures'] },
      square: { tone: 'unlisted', label: 'Not listed', src: ['square'] },
      glossgenius: { tone: 'unlisted', label: 'Not listed', src: ['gg'] },
      vagaro: { tone: 'unlisted', label: 'Not listed', src: ['vagaro'] },
      fresha: { tone: 'unlisted', label: 'Not listed', src: ['fresha'] },
      mangomint: { tone: 'unlisted', label: 'Not listed', src: ['mm'] },
      boulevard: { tone: 'unlisted', label: 'Not listed', src: ['blvd'] },
    },
  },
  {
    key: 'forms',
    title: 'Forms and waivers in the base plan',
    cells: {
      happli: { tone: 'yes', label: 'Yes', detail: 'Including AI form import you review.', src: ['happliFeatures'] },
      square: { tone: 'unlisted', label: 'Not listed', detail: 'Intake forms or waivers aren’t on its Appointments pricing page.', src: ['square'] },
      glossgenius: { tone: 'addon', label: 'Gold and up', src: ['gg'] },
      vagaro: { tone: 'addon', label: 'Add-on, $10/mo', src: ['vagaro'] },
      fresha: { tone: 'yes', label: 'Yes', detail: 'Consultation forms on Independent and Team.', src: ['fresha'] },
      mangomint: { tone: 'yes', label: 'Yes', detail: 'Forms and charting are core features.', src: ['mm'] },
      boulevard: { tone: 'addon', label: 'Add-on', detail: 'Bundled in Prestige ($364/mo); standalone price not listed.', src: ['blvd', 'blvdForms'] },
    },
  },
  {
    key: 'waitlist',
    title: 'Waitlist in the base plan',
    cells: {
      happli: { tone: 'yes', label: 'Yes', detail: 'Plus gap-offer texts you approve.', src: ['happliFeatures'] },
      square: { tone: 'addon', label: 'Plus and up', src: ['square'] },
      glossgenius: { tone: 'addon', label: 'Gold and up', detail: 'Automated waitlist.', src: ['gg'] },
      vagaro: { tone: 'yes', label: 'Yes', detail: '“Customer waitlist options included.”', src: ['vagaro'] },
      fresha: { tone: 'yes', label: 'Yes', detail: 'On both plans.', src: ['fresha'] },
      mangomint: { tone: 'yes', label: 'Yes', detail: 'Clients can join a waitlist from online booking.', src: ['mmBooking'] },
      boulevard: { ...NOT_LISTED_PRICING, src: ['blvd'] },
    },
  },
  {
    key: 'contract',
    title: 'No contract',
    cells: {
      happli: { tone: 'yes', label: 'Yes', detail: 'Cancel anytime.', src: ['happliPricing'] },
      square: { tone: 'yes', label: 'Yes', detail: '“Cancel or switch plans anytime.”', src: ['square'] },
      glossgenius: { tone: 'yes', label: 'Yes', detail: '“No contracts.”', src: ['gg'] },
      vagaro: { tone: 'yes', label: 'Yes', detail: 'Cancel anytime, no cancellation fees.', src: ['vagaro'] },
      fresha: { tone: 'yes', label: 'Yes', detail: 'No minimum commitment; cancel anytime.', src: ['fresha'] },
      mangomint: { tone: 'yes', label: 'Yes', detail: 'No contracts; cancel anytime.', src: ['mm'] },
      boulevard: { ...NOT_LISTED_PRICING, src: ['blvd'] },
    },
  },
];
