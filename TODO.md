# Launch TODOs and placeholders

Everything below is marked in the source with `TODO confirm:` or `PLACEHOLDER` (as Astro/JS comments, so none of it ships in the built HTML). Search the repo for `TODO` and `PLACEHOLDER` to find each one.

## Launch blockers

- [ ] **happli-coo PR #297 (direct charges on the studio's own Stripe account) must merge before launch.** It backs the hero headline ("Your money, yours."), the hero subhead, the home meta description, the whole "Your money goes to you" section, the home final CTA body, FAQ 1 and 2, the Stripe Connect line on /features, and the /pricing subhead, meta description and fee list. Files: `src/components/sections/HeroZoom.astro`, `src/components/sections/HeroStatic.astro`, `src/components/sections/PaymentsTrust.astro`, `src/pages/index.astro`, `src/pages/features.astro`, `src/pages/pricing.astro`.
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

- [ ] **Replace the zoom hero's studio photo** (`src/assets/hero-studio.jpg`). It's the design mockup's photo of a hair salon (styling chairs, mirrors, "Good hair happier people" signage), used as a placeholder. Swap in a spray tan studio photo with a monitor on the front desk, then update `MONITOR` in `src/components/sections/HeroZoom.astro` to the screen's pixel box (left, top, right, bottom) in the new photo.

## Zoom hero claims to confirm (`src/components/sections/HeroZoom.astro`)

- [ ] Panel "Gaps get noticed": one open hour offered to 4 due clients at once ("Offered" on each), then "You approved the offer at 11:12 · Maria K. booked 1:15". Same claim as the walkthrough's "Offer sent to 4".
- [ ] Panel "On the appointment": visit count ("6th visit") and past visits with prices shown on the appointment.

## Walkthrough claims to confirm (home page, `src/components/sections/Walkthrough.astro`)

The walkthrough was ported from the mockup on request. Service names, notes and deposits were adapted for spray tan studios, but these interactions still go beyond what the copy doc lists as built. Confirm each one or ask for the scene to be reworded before launch:

- [ ] Needs you: a "Deposit failed" row with a one-click "Text her", and "Priya is out Thursday · 3 appointments to move" with a one-click "Move them" (bulk move + texting 3 clients).
- [ ] The book: one gap offered to 4 due clients at once ("Offer sent to 4"), "opened" status for texts, and the automatic "Told the other three the slot is gone". The copy doc says you pick a client and Happli drafts one offer for you to approve.
- [ ] Appointment: "receipt texted" after checkout.
- [ ] Rebook: the "Maria usually comes back every 2 weeks. Book her now?" suggestion at checkout.

## Claims to confirm (copy doc `[confirm]` items)

- [ ] Live texting to clients is switched on: home reminders block, home FAQ 6, "Reminders and client messages" on /features.
- [ ] CSV import is run by the Happli team (not self-serve): home "Switch without starting over", "Switching from another system" on /features.
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
- Zoom hero panel titles (adapted from the mockup): "An hour opens up. Four clients are due.", "Three taps, from any phone.", "Notes and history, right where you need them."
- Solution heading: "Booking, payments, reminders and clients, in one place."
- Home features heading: "Everything your front desk does, in one place." (reuses the /features headline)
- Booking page section lede: "Clients book themselves on a phone-friendly booking page, any time of day."
- Walkthrough section head (from the mockup): "How a Tuesday runs" / "Four moments. None of them at the front desk."
- How it works eyebrow "3 steps"; payments section eyebrow "Payments and trust"; "Trust points" label
- /blog heading "Notes for busy studio owners."; /compare heading "How Happli compares."
- Footer tagline and "Made for spray tan studios and beauty pros."
- Sample names in the calendar, phone and walkthrough illustrations (Jess, Maya, Tori, Golden Glow Studio; walkthrough client and team names are from the mockup; its prices ($55, $15, $20 deposit, $10 tip) are illustrative)

## After the first post

- [ ] Add `{ label: 'Blog', href: '/blog/' }` to `nav` in `src/config/site.ts`.
- [ ] Delete the two draft samples in `src/content/blog/` and `src/content/compare/`.
