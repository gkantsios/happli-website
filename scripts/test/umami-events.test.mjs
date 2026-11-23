import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UMAMI_EVENT,
  umamiEventAttrs,
  umamiAttrsForHref,
  umamiAttrString,
  isBookingHref,
  untaggedBookingHrefs,
  safeUmamiProp,
} from '../../src/lib/umami-events.mjs';

test('umamiEventAttrs writes data-umami-event and optional properties', () => {
  assert.deepEqual(umamiEventAttrs({ event: UMAMI_EVENT.bookNow, location: 'header' }), {
    'data-umami-event': 'Book now',
    'data-umami-event-location': 'header',
  });
});

test('umamiAttrsForHref infers Book now, Call, Email, Directions and Social', () => {
  assert.equal(umamiAttrsForHref('https://tidycal.com/gkantsios/happli-demo', { location: 'hero' })['data-umami-event'], 'Book now');
  assert.equal(umamiAttrsForHref('tel:+19186192384', { location: 'footer' })['data-umami-event'], 'Call');
  assert.equal(umamiAttrsForHref('mailto:hi@example.com')['data-umami-event'], 'Email');
  assert.equal(umamiAttrsForHref('sms:+19186192384')['data-umami-event'], 'Text');
  assert.equal(umamiAttrsForHref('/signup/', { location: 'header' })['data-umami-event'], 'Signup');
  assert.equal(
    umamiAttrsForHref('https://www.google.com/maps/search/?api=1&query=Tulsa')['data-umami-event'],
    'Directions',
  );
  assert.equal(umamiAttrsForHref('https://www.instagram.com/sprayd/')['data-umami-event-platform'], 'instagram');
  assert.deepEqual(umamiAttrsForHref('/faq/'), {});
});

test('isBookingHref matches TidyCal book-a-demo links only', () => {
  assert.equal(isBookingHref('https://tidycal.com/gkantsios/happli-demo'), true);
  assert.equal(isBookingHref('https://tidycal.com/gkantsios/happli-demo?x=1'), true);
  assert.equal(isBookingHref('https://app.gohappli.com/login'), false);
  assert.equal(isBookingHref('mailto:a@b.c'), false);
});

test('untaggedBookingHrefs fails a booking link with no data-umami-event', () => {
  const html = `
    <a href="https://tidycal.com/gkantsios/happli-demo">Book now</a>
    <a href="https://tidycal.com/gkantsios/happli-demo" data-umami-event="Book now">Book now</a>
  `;
  assert.deepEqual(untaggedBookingHrefs(html), ['https://tidycal.com/gkantsios/happli-demo']);
});

test('safeUmamiProp strips markup from untrusted text', () => {
  assert.equal(safeUmamiProp('Tan</script><script>alert("x")</script>'), 'Tan alert(x)');
});

test('umamiAttrString is safe to drop into renderText HTML', () => {
  assert.match(
    umamiAttrString('https://tidycal.com/gkantsios/happli-demo', { location: 'article' }),
    /data-umami-event="Book now"/,
  );
  assert.match(umamiAttrString('https://tidycal.com/gkantsios/happli-demo', { location: 'article' }), /location="article"/);
});
