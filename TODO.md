# Launch TODOs and placeholders

Everything below is marked in the source with `TODO confirm:` or `PLACEHOLDER` (as Astro/JS comments, so none of it ships in the built HTML). Search the repo for `TODO` and `PLACEHOLDER` to find each one.

## Launch blockers

- [ ] **happli-coo PR #297 (direct charges on the studio's own Stripe account) must merge before launch.** It backs the "Your money goes to you" payments section on home, the Stripe Connect line on /features, and the /pricing subhead, meta description and fee list. Files: `src/components/sections/PaymentsTrust.astro`, `src/pages/features.astro`, `src/pages/pricing.astro`. (The hero, home meta description and final CTA no longer mention payments. The home FAQ says only that Happli never takes a cut and that card processing fees go to Stripe.)
- [ ] **The legal pages contradict the new product copy on message approval.** They were ported word-for-word (as required), but the new copy says confirmations and reminders send automatically once turned on. The legal pages say:
  - security.html, "The approval gate as a safety control": "No client-facing message leaves the Service without the business operator's explicit approval. This is a permanent architectural decision, not a setting…"
  - terms.html §2, "Your approval controls outbound communication".
  - privacy.html §3: "We never send a client-facing message without your approval."
  These need a legal/wording pass before launch. Files: `src/legal/security.html`, `src/legal/terms.html`, `src/legal/privacy.html`.
- [ ] The legal pages also describe older product details (syncing from Square/Vagaro, Google Business Profile features, "Beta program", "Last updated: July 2026"). Review them together with the item above.
- [ ] Stripe live mode: live card payments need the Stripe go-live checklist completed (deposits block on home, Payments section on /features).
- [ ] **Point gohappli.com at the Worker in Cloudflare** at launch:
  1. Connect Workers Builds to this repo with the build settings in the README (build `npm run build`, deploy `npx wrangler deploy`, root `/`, Node 22 from `.node-version`), and confirm a deploy of `main` succeeds on the `*.workers.dev` URL.
  2. Delete the old GitHub Pages DNS records for `gohappli.com` / `www` (Cloudflare can't add a Custom Domain on a hostname that has a CNAME record).
  3. On the `happli-website` Worker: Settings → Domains & Routes → Add → Custom Domain → `gohappli.com` (and `www.gohappli.com` if wanted).
  4. Check the live domain: pages load, `/privacy.html` 301s to `/privacy/`, and an unknown path shows the 404 page.
  5. Turn off GitHub Pages for this repo (Settings → Pages) so the old site stops serving.

- [ ] **Replace the zoom hero's studio photo.** The current `src/assets/hero-studio.jpg` is the design mockup's hair-salon placeholder (styling chairs, mirrors, "Good hair happier people" signage). Swap in a spray tan studio photo in one place, `src/config/hero.ts`: point the import at the new file and set `monitor` to the screen's pixel box. Photo spec (also in the README): landscape 16:9, at least 1920×1080 (2560×1440 is better); monitor shot straight on, screen about 16:10 and 15–25% of the photo's width, near the horizontal center and 40–60% down; calm top third with no signage.

## Walkthrough and hero panels

These now match the app: Needs you shows an open gap ("Draft an offer") and a waitlist match (Book or Dismiss); a gap offer goes to one client you pick, Happli drafts the text, and it sends only after you approve ("Sent to Maria"), with no read receipts or booking by reply; checkout shows "Paid · tip $10"; rebooking is "Book her next visit" with time slots; the mock app's tabs are Calendar, Clients and Messages with a Settings gear.

The zoom hero's landed screen (`src/components/sections/AppScreen.astro`) is modeled on the real owner app's Calendar day view, with sample data. It shows only what the app does today: the gap offer draft waits for approval (Approve shows "Approved · sent to Maria"), New booking can't book, Check out ends on "Paid", and the Card button is labeled as demo only. The in-app "UTILIZATION" heading and summary note ("Maya is at 75% — your busiest schedule today.") avoid "chair" wording.

- [ ] Confirm the booking link format in the drafted offer text: "Book it here: goldenglow.gohappli.com" (`src/components/sections/Walkthrough.astro`, `src/components/sections/HeroZoom.astro`, `src/components/sections/AppScreen.astro`).
- [ ] If the app's look changes (nav, colors, the rail), update `AppScreen.astro` to match. Its demo numbers (8 / 12 booked, $600 projected, Dana 67%, Jess 42%, Maya 75%) are computed from the sample data and checked at build time.

## Claims to confirm (copy doc `[confirm]` items)

- [ ] Live texting to clients is switched on (texting, email and Stripe are still in test mode): home "Reminders in your own words" card, home FAQ "Does Happli text my clients without asking me?", the "Reminders in your own words" row and "Reminders and client messages" on /features.
- [ ] CSV import is run by the Happli team (not self-serve): home FAQ "Is switching hard?", "How it works" step 1, and "Switching from another system" on /features.
- [ ] The owner phone view is ready to advertise: "Check your day from your phone" on /features.
- [ ] Advertise the online waitlist join: "Online waitlist" on /features.
- [ ] The chat widget is available to studios on the Happli booking system: "Website chat assistant" on /features.

## Placeholders to fill

- [ ] **New Stripe Payment Links** for Solo and Studio (monthly and yearly, normal and Founding Studio prices). The old links were for the old 1/2/3-location prices and are no longer linked; plan buttons go to /signup/ and the book-a-call link until the new ones exist (`src/config/pricing.ts`).
- [ ] Rerun `node scripts/generate-og.mjs` (Node 22) to refresh `public/og-default.png`. The script now says "Plans from $69/month", but the committed image still shows the old "$99/month" line.
- [ ] `src/legal/terms.html` still says "Founding-member pricing". Review the wording against the Founding Studio offer.
- [ ] Pricing FAQ: the contract/cancellation answer is unsourced, so it's not rendered (TODO comment in `src/pages/pricing.astro`).
- [ ] Signup page "What happens next" steps and timing (`src/pages/signup.astro`) are generic. Confirm the real onboarding steps.
- [ ] Testimonials (`src/components/sections/Testimonials.astro`): 3 slots, rendered only when real quotes with written permission are added. Optional logos row, same rule.
- [ ] Default OG image (`public/og-default.png`) is a generated placeholder. Replace it with a designed 1200×630 image, or edit and rerun `node scripts/generate-og.mjs`.
- [ ] Primary CTA currently points to the TidyCal 30-minute meeting link. Change `cta.href` in `src/config/site.ts` if that changes.

## Review (added for layout, not from the copy doc)

The copy doc has no headings for some sections, so these were added. Please review:

- Hero eyebrow: "For spray tan studios and beauty pros"
- Zoom hero panel titles (adapted from the mockup): "An hour opens up. Pick who gets the offer.", "Three taps, from any phone.", "Notes and history, right where you need them."
- Hero lead message: "Your front desk, down to one short list." (also in the social image, `public/og-default.png`, made by `node scripts/generate-og.mjs`)
- Home feature cards: eyebrow "What it does", heading "What Happli takes off your plate.", card titles and captions (`src/components/sections/FeatureCards.astro`)
- /features rows: eyebrows, headings and text (`src/components/sections/FeatureRows.astro`)
- Walkthrough section head: "How a Thursday runs" / "Four moments. None of them at the front desk." (from the mockup)
- How it works eyebrow "3 steps"; payments section eyebrow "Payments and trust"; "Trust points" label
- /blog heading "Notes for busy studio owners."; /compare heading "How Happli compares."
- Footer tagline and "Made for spray tan studios and beauty pros."
- Sample names in the calendar, phone and walkthrough illustrations (Dana, Jess, Maya, Golden Glow; the static hero's calendar still uses Tori; walkthrough client and team names are from the mockup; its prices ($55, $15, $20 deposit, $10 tip) are illustrative)

## Competitor claims to verify (/compare, checked Oct 15, 2026)

Each compare page lists its own open items in the `todo:` frontmatter (not rendered). Search for `todo:` in `src/content/compare/`. Summary:

- [ ] **Mangomint:** free-trial length; whether it has a waitlist or gap feature; whether deposits and no-show fees work without Mangomint Payments.
- [ ] **GlossGenius:** card processing rates (the rate fields didn't render when fetched); deposit and no-show policy availability by tier; text-credit limits by tier.
- [ ] **Vagaro:** standard price after the first-6-months rate ($30.00 appears unlabeled, so it isn't shown); text/SMS, forms and processing prices; how the $10 per bookable calendar license combines with the base price.
- [ ] Re-check all four pages quarterly and bump `updatedDate`.
- [ ] Happli side: memberships are not claimed anywhere (the compare tables say "not listed on our features page"). Update if you offer them. Client import wording ("done by the Happli team") depends on the CSV import item above.

## Other open items from this pass

- [ ] **Try the demo:** set `site.demo.enabled` to `true` in `src/config/site.ts` once https://app.gohappli.com/demo is live. It then appears in the header, home hero, final CTA bands and the /phone/, niche and signup pages.
- [ ] /phone/ and the spray tan niche page: unconfirmed claims are marked `TODO confirm` in the source (owner phone view ready to advertise; live texting; post-care texts are described only as custom messages; memberships are left out).
- [ ] **Cloudflare:** after the cutover, open /robots.txt and confirm it's this repo's file, not Cloudflare's managed one (`seo/robots.md`). Verify Search Console via a DNS TXT record, submit the sitemap, and set up Bing (`seo/tracking/README.md`). Decide on Amazonbot (left allowed).
- [ ] AI-instructions draft (`/workspace/ai-instructions/`) describes Happli as a layer on another booking system; reconcile with the new positioning before publishing anything like it.
- [ ] Fill volume and KD in `seo/keyword-map.csv` (marked TODO).
- [ ] Node: the repo needs Node 22.12 or newer (`.node-version`).

## After the first post

/blog is switched off in `src/config/site.ts` (`sections`): its pages build and work by URL, but they're noindex, left out of the sitemap and footer, and the RSS link is left out of the page head. /compare is on.

- [ ] Set `sections.blog` to `true` in `src/config/site.ts`, and add `{ label: 'Blog', href: '/blog/' }` to `nav` if it should be in the header.
- [ ] Delete the draft sample in `src/content/blog/`.
