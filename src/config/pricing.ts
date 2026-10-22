// Happli pricing: two plans and one add-on. This is the single source for every price on the site
// (/pricing, /signup, the home and niche pages, the compare index and the SoftwareApplication JSON-LD).
// The compare articles in src/content/compare/ and the Terms (src/legal/terms.html) repeat these numbers
// by hand, so update them too.
// Set by Grant on Oct 19, 2026. Don't add other prices, trials or discounts without Grant's say-so.
//
// Stripe: the old Payment Links were for the old 1/2/3-location prices, so they are no longer linked.
// New Payment Links are needed for Solo and Studio (monthly and yearly, normal and founding prices).
// Extra-location prices need their own Payment Links too (follow-up).
// Until they exist, plan buttons go to /signup/, which offers the book-a-call link.

export const signupHref = '/signup/';

/** Founding Studio offer: a percentage off the plans, for as long as the studio stays subscribed. */
export const founding = {
  discountPercent: 25,
  maxStudios: 50,
  days: 90,
};

// 25% off each listed monthly price, rounded to the nearest dollar. Yearly totals are that times 12.
const foundingPrice = (price: number) => Math.round(price * (1 - founding.discountPercent / 100));

type PlanPrices = {
  /** Billed monthly, per month. */
  monthly: number;
  /** Billed yearly, shown per month. */
  yearly: number;
};

export type Plan = PlanPrices & {
  id: 'solo' | 'studio';
  name: string;
  forWho: string;
  /** Text after the big price, e.g. "/mo". */
  unit: string;
  /** Short unit for inline prices, e.g. "/mo". */
  unitShort: string;
  points: string[];
  href: string;
  featured?: boolean;
  founding: PlanPrices;
  /** Each extra location beyond the one included: half the plan price, rounded down to a whole dollar. */
  extraLocation: PlanPrices & { founding: PlanPrices };
};

/** Every plan includes this many locations. */
export const includedLocations = 1;

// Extra location: half the plan price, rounded DOWN so "half price" is never more than half.
// Founding extra = half the Founding plan price, rounded down (same result as 25% off the regular extra).
export const extraLocationPrice = (planPrice: number) => Math.floor(planPrice / 2);

/** Studio includes this many team members who take bookings at each location. */
export const studioIncludedMembers = 10;
/** Each team member who takes bookings beyond the included ones, per month. */
export const extraMemberPrice = 10;

const plan = (p: Omit<Plan, 'founding' | 'extraLocation'>): Plan => {
  const f = { monthly: foundingPrice(p.monthly), yearly: foundingPrice(p.yearly) };
  return {
    ...p,
    founding: f,
    extraLocation: {
      monthly: extraLocationPrice(p.monthly),
      yearly: extraLocationPrice(p.yearly),
      founding: { monthly: extraLocationPrice(f.monthly), yearly: extraLocationPrice(f.yearly) },
    },
  };
};

export const solo = plan({
  id: 'solo',
  name: 'Solo',
  forWho: 'For the owner who does every appointment.',
  monthly: 69,
  yearly: 59,
  unit: '/mo',
  unitShort: '/mo',
  points: ['1 team member who takes bookings (you, the owner)', 'Every feature included', 'Free front desk and admin logins'],
  href: signupHref,
});

export const studio = plan({
  id: 'studio',
  name: 'Studio',
  forWho: 'For teams with more than one person taking bookings.',
  monthly: 149,
  yearly: 129,
  unit: '/mo',
  unitShort: '/mo',
  points: [
    `Up to ${studioIncludedMembers} team members who take bookings at each location, then +$${extraMemberPrice}/mo each`,
    'Every feature included',
    "Unlimited free logins for team members who don't take bookings",
  ],
  href: signupHref,
  featured: true,
});

export const plans: Plan[] = [solo, studio];

export const marketingAddOn = {
  name: 'Marketing add-on',
  price: 39,
  texts: 1000,
  emails: 10000,
  extraTextCents: 3,
};

/** Appointment reminder texts are included on every plan, with a fair-use cap of about this many a month. */
export const reminderFairUse = 1000;

/** Free until the studio goes live, capped at this many days. */
export const trialDays = 30;

export type Included = string | { label: string; status: 'Coming soon' | 'Early access' };
export const includedEverywhere: Included[] = [
  'Online booking',
  'Desk calendar',
  'Checkout',
  'Packages',
  'Gift cards',
  'Forms and waivers',
  'Reminders',
  { label: 'Memberships', status: 'Coming soon' },
  'Reports',
  'Ask your reports (AI)',
  'AI form import',
  { label: 'AI COO', status: 'Coming soon' },
  'Email rewards',
  'Client import',
  'Free team logins',
  'Booking pages',
];

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
export const yearlyTotal = (perMonth: number) => perMonth * 12;

/** Billing yearly saves up to this much, in whole percent, rounded down ("save up to 14%"). */
export const yearlySavePercent = Math.floor(Math.max(...plans.map((p) => (1 - p.yearly / p.monthly) * 100)));

export const lowPrice = Math.min(...plans.map((p) => p.monthly));
export const highPrice = Math.max(...plans.map((p) => p.monthly));
