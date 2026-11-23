// Beauty Business Snapshot (/snapshot/): the questions, their answer bands and the sample data shown
// before there are enough real answers. Shared by the page and the Worker (worker/snapshot.ts), so the
// form, the server's allowlist and the results charts always agree.

export type Band = { value: string; label: string; short?: string };
export type BandQuestion = { name: string; title: string; hint?: string; chart: string; bands: Band[] };

/** Smallest group the results will ever show (k-anonymity). Below this, fall back a level. */
export const K_MIN = 15;

export const services: Band[] = [
  { value: 'spray_tan', label: 'Spray tan' },
  { value: 'lashes', label: 'Lashes' },
  { value: 'brows', label: 'Brows' },
  { value: 'facials', label: 'Facials / esthetics' },
  { value: 'waxing', label: 'Waxing' },
  { value: 'nails', label: 'Nails' },
  { value: 'hair', label: 'Hair' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'other', label: 'Other' },
];

const trend: Band[] = [
  { value: 'down_lot', label: 'Down a lot' },
  { value: 'down_little', label: 'Down a little' },
  { value: 'same', label: 'About the same' },
  { value: 'up_little', label: 'Up a little' },
  { value: 'up_lot', label: 'Up a lot' },
  { value: 'new', label: 'Too new to say' },
];

// Questions 3 to 10, in form order. `name` is the form field and the answers-table column.
export const questions: BandQuestion[] = [
  {
    name: 'team',
    title: 'Who works there?',
    hint: 'Count everyone who takes clients, you included.',
    chart: 'Team size',
    bands: [
      { value: 'solo', label: 'Just me' },
      { value: '2_3', label: '2–3' },
      { value: '4_6', label: '4–6' },
      { value: '7_plus', label: '7 or more' },
    ],
  },
  {
    name: 'revenue',
    title: 'Typical monthly revenue, last 3 months',
    hint: 'A rough range is perfect.',
    chart: 'Monthly revenue',
    bands: [
      { value: 'lt5k', label: 'Under $5k' },
      { value: '5_10k', label: '$5–10k' },
      { value: '10_20k', label: '$10–20k' },
      { value: '20_40k', label: '$20–40k' },
      { value: '40k_plus', label: '$40k or more' },
      { value: 'na', label: 'Prefer not to say' },
    ],
  },
  { name: 'revenue_trend', title: 'Revenue compared with a year ago', chart: 'Revenue vs. a year ago', bands: trend },
  { name: 'bookings_trend', title: 'Bookings in the last 90 days', hint: 'Compared with the same stretch a year ago.', chart: 'Bookings, last 90 days', bands: trend },
  {
    name: 'rebook',
    title: 'About what share of clients rebook?',
    chart: 'Clients who rebook',
    bands: [
      { value: 'lt20', label: 'Under 20%' },
      { value: '20_40', label: '20–40%' },
      { value: '40_60', label: '40–60%' },
      { value: '60_plus', label: '60% or more' },
      { value: 'unsure', label: 'Not sure' },
    ],
  },
  {
    name: 'ticket',
    title: 'Typical ticket',
    hint: 'The service total for one visit, not retail products.',
    chart: 'Typical ticket',
    bands: [
      { value: 'lt50', label: 'Under $50' },
      { value: '50_100', label: '$50–100' },
      { value: '100_175', label: '$100–175' },
      { value: '175_250', label: '$175–250' },
      { value: '250_plus', label: '$250 or more' },
    ],
  },
  {
    name: 'prices',
    title: 'Your prices in the last 12 months',
    chart: 'Prices, last 12 months',
    bands: [
      { value: 'cut', label: 'Cut' },
      { value: 'held', label: 'Held steady' },
      { value: 'raised_little', label: 'Raised a little' },
      { value: 'raised_lot', label: 'Raised a lot' },
    ],
  },
  {
    name: 'lead_time',
    title: 'How far out are you typically booked?',
    chart: 'Booked out',
    bands: [
      { value: 'same_day', label: 'Same day / walk-in' },
      { value: 'few_days', label: 'A few days' },
      { value: '1_2_weeks', label: '1–2 weeks' },
      { value: '3_weeks_plus', label: '3+ weeks' },
    ],
  },
];

export const states: [code: string, name: string][] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'],
  ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'],
  ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

// Made-up shapes, only so the results screen can be previewed before any group reaches K_MIN real
// answers. Always shown under a "Sample results, for preview — not live data" label, never stored,
// never described as real. Relative weights per band, in band order.
export const sampleWeights: Record<string, number[]> = {
  services: [5, 6, 5, 6, 5, 4, 4, 3, 2],
  team: [9, 5, 3, 2],
  revenue: [5, 6, 5, 3, 2, 2],
  revenue_trend: [2, 3, 5, 4, 2, 1],
  bookings_trend: [2, 4, 5, 4, 2, 1],
  rebook: [2, 4, 5, 3, 2],
  ticket: [3, 6, 5, 2, 1],
  prices: [1, 6, 7, 2],
  lead_time: [2, 6, 5, 2],
};

/** The sample shapes above as counts out of 100 answers (services: how many of 100 offer each). Never stored. */
export function sampleGroups(): Record<string, Record<string, number>> {
  const groups: Record<string, Record<string, number>> = {};
  groups.services = Object.fromEntries(services.map((s, i) => [s.value, sampleWeights.services[i] * 10]));
  for (const q of questions) {
    const w = sampleWeights[q.name];
    const sum = w.reduce((a, b) => a + b, 0);
    groups[q.name] = Object.fromEntries(q.bands.map((b, i) => [b.value, Math.round((w[i] / sum) * 100)]));
  }
  return groups;
}
