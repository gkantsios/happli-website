// Query parameters /signup/ accepts, e.g. /signup/?plan=solo&billing=yearly&locations=3&founding=1.
// Each value is checked against an allowlist; anything else (unknown keys, bad values) is ignored.
// parseSignupQuery must stay self-contained (no imports or outer variables): its source is inlined
// into the page's script, so the browser and these tests run the same code.

export type SignupQuery = {
  plan?: 'solo' | 'studio';
  billing?: 'monthly' | 'yearly';
  locations?: number;
  founding?: boolean;
};

export function parseSignupQuery(search: string): SignupQuery {
  var q = new URLSearchParams(search);
  var out: SignupQuery = {};
  var plan = q.get('plan');
  if (plan === 'solo' || plan === 'studio') out.plan = plan;
  // "period" is the older name, kept so old links and canceled checkouts still work.
  var billing = q.get('billing') || q.get('period');
  if (billing === 'monthly' || billing === 'yearly') out.billing = billing;
  var locations = q.get('locations');
  if (locations !== null && /^(?:[1-9]|10)$/.test(locations)) out.locations = Number(locations);
  var f = q.get('founding');
  if (f === '1' || f === 'true') out.founding = true;
  else if (f === '0' || f === 'false') out.founding = false;
  return out;
}

export function signupHref(plan: 'solo' | 'studio', billing: 'monthly' | 'yearly'): string {
  return `/signup/?plan=${plan}&billing=${billing}`;
}
