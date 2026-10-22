import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignupQuery, signupHref } from '../../src/lib/signup-query.ts';

test('reads valid plan, billing, locations and founding', () => {
  assert.deepEqual(parseSignupQuery('?plan=solo&billing=yearly&locations=3&founding=1'), { plan: 'solo', billing: 'yearly', locations: 3, founding: true });
  assert.deepEqual(parseSignupQuery('?plan=studio&billing=monthly&locations=10&founding=0'), { plan: 'studio', billing: 'monthly', locations: 10, founding: false });
});

test('ignores values outside the allowlist', () => {
  assert.deepEqual(parseSignupQuery('?plan=enterprise&billing=weekly&locations=0&founding=maybe'), {});
  for (const l of ['11', '-1', '2.5', '1e1', '03', ' 3', 'abc', '']) assert.equal(parseSignupQuery(`?locations=${encodeURIComponent(l)}`).locations, undefined, l);
  assert.deepEqual(parseSignupQuery('?plan=Solo&plan2=solo&__proto__=x&billing=YEARLY'), {});
  assert.deepEqual(parseSignupQuery('?plan=%3Cscript%3E'), {});
});

test('empty query and the older period= name', () => {
  assert.deepEqual(parseSignupQuery(''), {});
  assert.deepEqual(parseSignupQuery('?period=yearly'), { billing: 'yearly' });
  assert.deepEqual(parseSignupQuery('?billing=monthly&period=yearly'), { billing: 'monthly' });
});

test('the inlined source is self-contained and behaves the same', () => {
  const fn = new Function(`return (${parseSignupQuery.toString()})`)() as typeof parseSignupQuery;
  assert.deepEqual(fn('?plan=solo&billing=yearly&locations=4&founding=1'), { plan: 'solo', billing: 'yearly', locations: 4, founding: true });
});

test('plan CTA hrefs', () => {
  assert.equal(signupHref('solo', 'monthly'), '/signup/?plan=solo&billing=monthly');
  assert.equal(signupHref('studio', 'yearly'), '/signup/?plan=studio&billing=yearly');
});
