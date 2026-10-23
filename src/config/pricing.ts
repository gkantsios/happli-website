// Happli pricing: one plan, priced per team member who takes bookings, plus an optional Marketing add-on.
// This is the single source for every price on the site (/pricing, /signup, the home and niche pages,
// the compare index and the SoftwareApplication JSON-LD).
// The compare articles in src/content/compare/, the Terms (src/legal/terms.html), the refund policy
// (src/legal/refunds.html) and public/llms.txt repeat these numbers by hand, so update them too.
// Set by Grant on Oct 23, 2026 (one plan, launch pricing). Don't add other prices, trials or discounts
// without Grant's say-so.
//
// Stripe: plan buttons go to /signup/, which offers the book-a-call link, until new Payment Links exist.

export const signupHref = '/signup/';

type Prices = {
  /** Billed monthly, per month. */
  monthly: number;
  /** Billed yearly, shown per month. */
  yearly: number;
};

/** The one plan. `launch` is what studios pay; `regular` is shown struck through. */
export const plan = {
  name: 'Happli',
  forWho: 'Everything, for 1 team member who takes bookings',
  launch: { monthly: 52, yearly: 44 } satisfies Prices,
  regular: { monthly: 69, yearly: 59 } satisfies Prices,
  /** Each extra team member who takes bookings, per month. */
  extraMember: { monthly: 10, yearly: 8.6 } satisfies Prices,
  /** Each extra location costs this share of the location's total (half price). */
  extraLocationShare: 0.5,
  features: [
    'Online booking and calendar',
    'Clients, notes and forms',
    'Payments, packages and memberships',
    'Texting and reminders',
    'Reports',
    'Free front desk and admin logins',
  ],
  href: signupHref,
};

/** Every plan includes this many locations. */
export const includedLocations = 1;

/** Monthly price for a number of team members who take bookings and locations. */
export function monthlyTotal(teamMembers: number, locations: number, billing: keyof Prices, list: 'launch' | 'regular' = 'launch') {
  const base = plan[list][billing] + (teamMembers - 1) * plan.extraMember[billing];
  return base * (1 + (locations - 1) * plan.extraLocationShare);
}

/** Marketing add-on: monthly credit packs. */
export const marketingAddOn = {
  name: 'Marketing add-on',
  status: 'Coming soon',
  packs: [
    { credits: 2000, price: 19 },
    { credits: 5000, price: 39 },
    { credits: 12000, price: 79 },
    { credits: 30000, price: 159 },
  ],
  defaultCredits: 5000,
  /** Credits per message. One credit covers 2 emails. */
  emailsPerCredit: 2,
  creditsPerText: 3,
  creditsPerPictureText: 7,
  extraCreditCents: 1,
};

/** Appointment reminder texts are included on every plan, with a fair-use cap of about this many a month. */
export const reminderFairUse = 1000;

/** Free until the studio goes live, capped at this many days. */
export const trialDays = 30;

/** "$52", or "$8.60" for prices with cents. */
export const usd = (n: number) =>
  Number.isInteger(n) ? `$${n.toLocaleString('en-US')}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const yearlyTotal = (perMonth: number) => Math.round(perMonth * 12 * 100) / 100;

/** Billing yearly saves this much, in whole percent, rounded down ("save 14%"). */
export const yearlySavePercent = Math.floor((1 - plan.launch.yearly / plan.launch.monthly) * 100);

/** Lowest advertised price: the launch price billed yearly. */
export const lowPrice = plan.launch.yearly;
