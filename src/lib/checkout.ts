// Signup checkout math, shared by /signup/ (display only) and the Worker's POST /api/checkout
// (worker/checkout.ts), which is the one that decides what Stripe charges.
// Every amount comes from src/config/pricing.ts; Stripe prices are found by lookup key and must match.
import { plans, includedLocations, type Plan } from '../config/pricing';

export type PlanId = Plan['id'];
export type Period = 'monthly' | 'yearly';

/** Most locations that can sign up online. More than this goes to "Book a call". */
export const maxOnlineLocations = 10;

export type CheckoutChoice = { plan: PlanId; period: Period; locations: number; founding: boolean };

export const planById = (id: PlanId): Plan => {
  const p = plans.find((x) => x.id === id);
  if (!p) throw new Error(`unknown plan ${id}`);
  return p;
};

/** Stripe lookup keys, as created in the catalog: `{founding_}{plan}_{period}` and `{founding_}extra_loc_{plan}_{period}`. */
export function lookupKeys(c: Pick<CheckoutChoice, 'plan' | 'period' | 'founding'>): { plan: string; extraLocation: string } {
  const f = c.founding ? 'founding_' : '';
  return { plan: `${f}${c.plan}_${c.period}`, extraLocation: `${f}extra_loc_${c.plan}_${c.period}` };
}

/**
 * What one billing period costs, in whole dollars, per line. Yearly prices on the site are shown
 * per month; Stripe bills the yearly total (per month × 12).
 */
export function unitPrices(c: Pick<CheckoutChoice, 'plan' | 'period' | 'founding'>): { plan: number; extraLocation: number } {
  const p = planById(c.plan);
  const planPrices = c.founding ? p.founding : p;
  const extraPrices = c.founding ? p.extraLocation.founding : p.extraLocation;
  const months = c.period === 'yearly' ? 12 : 1;
  return { plan: planPrices[c.period] * months, extraLocation: extraPrices[c.period] * months };
}

export const extraLocations = (locations: number) => Math.max(0, locations - includedLocations);

export type LineItem = { lookupKey: string; quantity: number; unitAmountCents: number };

/** The Checkout line items: the plan × 1, plus extra locations × (locations − 1), left out at 1 location. */
export function lineItems(c: CheckoutChoice): LineItem[] {
  const keys = lookupKeys(c);
  const prices = unitPrices(c);
  const items: LineItem[] = [{ lookupKey: keys.plan, quantity: 1, unitAmountCents: prices.plan * 100 }];
  const extra = extraLocations(c.locations);
  if (extra > 0) items.push({ lookupKey: keys.extraLocation, quantity: extra, unitAmountCents: prices.extraLocation * 100 });
  return items;
}

/** Total per billing period, in whole dollars. */
export function total(c: CheckoutChoice): number {
  return lineItems(c).reduce((sum, i) => sum + (i.unitAmountCents / 100) * i.quantity, 0);
}
