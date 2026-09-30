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

- [ ] Confirm the booking link format in the drafted offer text: "Book it here: goldenglow.gohappli.com" (`src/components/sections/Walkthrough.astro`, `src/components/sections/HeroZoom.astro`).

## Claims to confirm (copy doc `[confirm]` items)

- [ ] Live texting to clients is switched on (texting, email and Stripe are still in test mode): home "Reminders in your own words" card, home FAQ "Does Happli text my clients without asking me?", the "Reminders in your own words" row and "Reminders and client messages" on /features.
- [ ] CSV import is run by the Happli team (not self-serve): home FAQ "Is switching hard?", "How it works" step 1, and "Switching from another system" on /features.
- [ ] The owner phone view is ready to advertise: "Check your day from your phone" on /features.
- [ ] Advertise the online waitlist join: "Online waitlist" on /features.
- [ ] The chat widget is available to studios on the Happli booking system: "Website chat assistant" on /features.

## Placeholders to fill

- [ ] **Pricing plans** (`src/components/sections/PricingPlans.astro`): plan names, prices, billing unit, "best for", locations, team members, SMS allowance, whether the chat assistant is included, client import (included or fee), support level, and the per-plan CTA label. All are shown on the page as highlighted `[PLACEHOLDER]` text.
- [ ] Pricing extras (commented out): founding member offer, free trial, annual discount.
- [ ] Pricing fee list: the "Happli fee on payments: none." line was removed until Grant decides on the fee wording. Other "no fee" wording (hero trust line, payments section, FAQ, pricing subhead and meta description, /features Stripe Connect line) is unchanged for now.
- [ ] Pricing FAQ answers (`src/pages/pricing.astro`): setup fee, contract/cancellation terms, SMS pricing, import pricing.
- [ ] Pricing meta description: add "[PRICE] per [UNIT]." back once pricing is set (`src/pages/pricing.astro`).
- [ ] Add `offers` to the SoftwareApplication JSON-LD once pricing is real (`src/lib/jsonld.ts`).
- [ ] Testimonials (`src/components/sections/Testimonials.astro`): 3 slots, rendered only when real quotes with written permission are added. Optional logos row, same rule.
- [ ] Home final CTA secondary button "Join the founding member program" (only if the program is still open) (`src/pages/index.astro`). The old site's Stripe buy links for founding members were removed with the old index.html. If those links are still live, they need a new home.
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
- Sample names in the calendar, phone and walkthrough illustrations (Jess, Maya, Tori, Golden Glow Studio; walkthrough client and team names are from the mockup; its prices ($55, $15, $20 deposit, $10 tip) are illustrative)

## After the first post

/blog and /compare are switched off in `src/config/site.ts` (`sections`): the pages build and work by URL, but they're noindex, left out of the sitemap and footer, and the RSS link is left out of the page head.

- [ ] Set `sections.blog` (or `sections.compare`) to `true` in `src/config/site.ts`, and add `{ label: 'Blog', href: '/blog/' }` to `nav` if it should be in the header.
- [ ] Delete the two draft samples in `src/content/blog/` and `src/content/compare/`.
