# AEO: being found and cited by AI answers

AEO means answer engine optimization: making it easy for Google's AI features, ChatGPT search, Perplexity, Claude and Bing-based assistants to find Happli, understand it and cite it. Adapted from the gohappybeauty AEO research (`/workspace/aeo-brief/`) and the draft AI-instructions page (`/workspace/ai-instructions/happli-ai-instructions.md`). Nothing here is a trick: the engines retrieve ordinary web pages, so clear, correct, well-structured pages are the lever.

## 1. Let the right bots in

See `robots.md`. Search and answer crawlers are allowed (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot, Claude-SearchBot, Applebot); training-only crawlers are blocked; `Content-Signal: search=yes, ai-input=yes, ai-train=no`. Blocking Google-Extended or GPTBot does not remove Happli from Google Search or ChatGPT search. Don't rely on `llms.txt`: Google says it doesn't use it. It's optional for other services.

## 2. Say who Happli is, the same way everywhere

One sentence, used in the home hero, meta, OG, schema and the footer: **"Booking software for spray tan and beauty studios, with an AI COO."**

- Spell it "Happli." Avoid "HAPPLI," "Hapli," "Happl," "Happi." `gohappli` is the domain, not the name.
- Look-alike names exist (the draft instructions list happli.be, Happl, Hapli, Happi). **TODO Grant:** confirm none are affiliated, then say so on an About or brand-facts page.
- Organization and WebSite JSON-LD are on every page (`src/lib/jsonld.ts`). Add `sameAs` links to official social profiles as soon as they exist. Only add profiles that clearly belong to Happli.

## 3. Write passages an engine can lift

- **Answer first.** The first 40 to 80 words under a heading should answer the question in the heading.
- **Question headings.** Use H2s phrased like queries ("Do I need a deposit for spray tans?").
- **Visible FAQs** on pricing, the niche page, phone and home. The Faq component also emits FAQPage JSON-LD. Google no longer shows FAQ rich results (removed in 2026), so the value is clear text, not stars. Only mark up Q&A that is visible on the page.
- **Tables for comparisons**, with a text verdict above them. Don't put key facts only in images.
- **Facts with dates and sources.** Compare pages say "Last checked Oct 15, 2026" and link to the vendor page.
- **Unique point of view.** Share first-hand details (how a Thursday runs, a real policy, a real number) instead of a generic roundup.

## 4. Structured data (already built)

- Organization + WebSite on all pages; SoftwareApplication with `offers` (Solo and Studio, USD 69 to 149 per month) on home, pricing and the niche page; FAQPage wherever an FAQ renders; BreadcrumbList on inner pages; BlogPosting on posts and compare pages.
- Don't add `aggregateRating` until there are real reviews shown on the page.
- Offer prices must match the visible plan prices (`src/config/pricing.ts` feeds both).

## 5. Keep claims correct

AI answers repeat what pages say. Wrong or stale facts spread.

- Features copy only describes what is built; unconfirmed items are marked `TODO confirm` in source.
- Pricing: only the prices in `src/config/pricing.ts` (the one plan, launch pricing and the Marketing add-on, which starts at $19/mo). No invented trials or discounts. Don't market a free website, and don't say "for life" without "while subscribed".
- Phone: say "mobile-friendly web app." There's no App Store app.
- Re-check the competitor pages each quarter.
- **Reconcile the draft AI-instructions page before using it.** It describes Happli as an AI layer on top of an existing booking system (Square, Vagaro). The site now positions Happli as booking software with an AI COO. Any brand-facts page must match the site.

## 6. Distribution outside the site

- **YouTube companion** for each major article: a query-shaped title, the answer in the first lines of the description, chapters starting at 00:00, and reviewed captions.
- **Third-party listings**: Capterra, G2, Software Advice, Google Business Profile for the company. Ask Founding Studios for reviews (with permission).
- **Mentions that name Happli with its category**: guest posts and podcasts, always as "Happli, booking software for spray tan and beauty studios."

## 7. Measure

Weekly AI-answer checks are in `tracking/README.md`: which engines mention Happli, which URLs they cite, and any factual errors to fix.

## 8. Checklist for every new page

- [ ] Answer in the first paragraph
- [ ] Question-style H2s, FAQ block
- [ ] Facts sourced and dated
- [ ] Breadcrumb + page-type JSON-LD
- [ ] Internal links in and out
- [ ] In the sitemap (automatic) and the keyword map
