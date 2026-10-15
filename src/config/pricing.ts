// Founding member pricing. These are the live prices and Stripe Payment Links from the current
// gohappli.com. Don't add other prices, trials or discounts without Grant's say-so.

export const plans = [
  {
    id: 'one',
    name: '1 Location',
    price: 99,
    bestFor: 'A solo artist or a single studio.',
    href: 'https://buy.stripe.com/00wbJ39T79NibA8cBr7Vm00',
  },
  {
    id: 'two',
    name: '2 Locations',
    price: 149,
    bestFor: 'A studio with a second site, or a studio plus a mobile location.',
    href: 'https://buy.stripe.com/fZu9AV8P30cI33C1WN7Vm01',
    featured: true,
  },
  {
    id: 'three',
    name: '3 Locations',
    price: 199,
    bestFor: 'Growing studios running three locations.',
    href: 'https://buy.stripe.com/9B6dRbaXb4sYeMk58Z7Vm02',
  },
] as const;

export const foundingPerks = [
  'Locked founding pricing for current locations',
  'White-glove onboarding and priority support',
  'Early access to new features',
  'Direct influence on the roadmap',
  'Featured as a founding case study',
];

export const pricingFootnote =
  'Normal email and SMS usage is included during the founding phase. Unusually high messaging usage, dedicated phone numbers, or carrier fees may be priced separately in the future. Founding pricing applies to the locations enrolled when you join.';

export const lowPrice = Math.min(...plans.map((p) => p.price));
export const highPrice = Math.max(...plans.map((p) => p.price));
