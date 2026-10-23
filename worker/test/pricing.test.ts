// Pricing and line-item math for the signup checkout (src/lib/checkout.ts). Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solo, studio } from '../../src/config/pricing.ts';
import { lineItems, lookupKeys, total, unitPrices } from '../../src/lib/checkout.ts';

test('plan and extra-location prices match the Stripe catalog', () => {
  assert.deepEqual([solo.monthly, solo.yearly, studio.monthly, studio.yearly], [69, 59, 149, 129]);
  assert.deepEqual(solo.extraLocation, { monthly: 34, yearly: 29, founding: { monthly: 26, yearly: 22 } });
  assert.deepEqual(studio.extraLocation, { monthly: 74, yearly: 64, founding: { monthly: 56, yearly: 48 } });
  assert.deepEqual(solo.founding, { monthly: 52, yearly: 44 });
  assert.deepEqual(studio.founding, { monthly: 112, yearly: 97 });
});

test('unit prices per billing period (yearly = per month x 12)', () => {
  assert.deepEqual(unitPrices({ plan: 'solo', period: 'monthly', founding: false }), { plan: 69, extraLocation: 34 });
  assert.deepEqual(unitPrices({ plan: 'solo', period: 'yearly', founding: false }), { plan: 708, extraLocation: 348 });
  assert.deepEqual(unitPrices({ plan: 'studio', period: 'monthly', founding: false }), { plan: 149, extraLocation: 74 });
  assert.deepEqual(unitPrices({ plan: 'studio', period: 'yearly', founding: false }), { plan: 1548, extraLocation: 768 });
  assert.deepEqual(unitPrices({ plan: 'solo', period: 'monthly', founding: true }), { plan: 52, extraLocation: 26 });
  assert.deepEqual(unitPrices({ plan: 'solo', period: 'yearly', founding: true }), { plan: 528, extraLocation: 264 });
  assert.deepEqual(unitPrices({ plan: 'studio', period: 'monthly', founding: true }), { plan: 112, extraLocation: 56 });
  assert.deepEqual(unitPrices({ plan: 'studio', period: 'yearly', founding: true }), { plan: 1164, extraLocation: 576 });
});

test('lookup keys follow the catalog naming', () => {
  assert.deepEqual(lookupKeys({ plan: 'studio', period: 'monthly', founding: false }), { plan: 'studio_monthly', extraLocation: 'extra_loc_studio_monthly' });
  assert.deepEqual(lookupKeys({ plan: 'solo', period: 'yearly', founding: true }), { plan: 'founding_solo_yearly', extraLocation: 'founding_extra_loc_solo_yearly' });
});

test('one location: plan line only', () => {
  assert.deepEqual(lineItems({ plan: 'solo', period: 'monthly', locations: 1, founding: false }), [{ lookupKey: 'solo_monthly', quantity: 1, unitAmountCents: 6900 }]);
});

test('extra locations: quantity is locations - 1', () => {
  assert.deepEqual(lineItems({ plan: 'studio', period: 'monthly', locations: 3, founding: false }), [
    { lookupKey: 'studio_monthly', quantity: 1, unitAmountCents: 14900 },
    { lookupKey: 'extra_loc_studio_monthly', quantity: 2, unitAmountCents: 7400 },
  ]);
});

test('totals match the test plan', () => {
  assert.equal(total({ plan: 'solo', period: 'monthly', locations: 1, founding: false }), 69);
  assert.equal(total({ plan: 'studio', period: 'monthly', locations: 3, founding: false }), 297);
  assert.equal(total({ plan: 'studio', period: 'yearly', locations: 1, founding: false }), 1548);
  assert.equal(total({ plan: 'solo', period: 'yearly', locations: 3, founding: false }), 1404);
  assert.equal(total({ plan: 'studio', period: 'monthly', locations: 2, founding: true }), 168);
  assert.equal(total({ plan: 'solo', period: 'yearly', locations: 1, founding: true }), 528);
  assert.equal(total({ plan: 'studio', period: 'monthly', locations: 10, founding: false }), 149 + 9 * 74);
});
