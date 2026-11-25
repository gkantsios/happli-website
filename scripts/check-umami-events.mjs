#!/usr/bin/env node
// Fails the build if a TidyCal book-a-demo link in dist/ is missing
// data-umami-event="Book now", so click tracking stays on by default.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { untaggedBookingHrefs } from '../src/lib/umami-events.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = existsSync(path.join(root, 'dist/client')) ? path.join(root, 'dist/client') : path.join(root, 'dist');
if (!existsSync(dist)) {
  console.error('check-umami-events: dist not found. Run the build first.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) files.push(p);
  }
})(dist);

if (!files.length) {
  console.error(`check-umami-events: no HTML in ${dist}.`);
  process.exit(1);
}

const errors = [];
let bookingLinks = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
  const booking = hrefs.filter((h) => /tidycal\.com/i.test(h));
  bookingLinks += booking.length;
  const route = '/' + path.relative(dist, file).replace(/\\/g, '/');
  for (const href of untaggedBookingHrefs(html)) {
    errors.push(`${route}: booking link missing data-umami-event="Book now": ${href}`);
  }
}

if (!bookingLinks) errors.push(`no booking links found in ${dist}; the check itself may be broken`);
if (errors.length) {
  console.error(`check-umami-events failed:\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`check-umami-events: OK (${bookingLinks} booking links on ${files.length} pages)`);
