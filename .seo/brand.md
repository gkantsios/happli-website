# Happli — Brand Context

> The voice contract for `/seo` runs. Facts marked *unconfirmed* are filled at the first run's foundation checkpoint; ask, don't guess. Prices come from `src/config/pricing.ts` only.

## Product

- **Name:** Happli (Happy Industries, Inc. dba Happli, Charlotte, NC)
- **One-liner:** Booking software for spray tan studios and beauty pros, with AI built in.
- **What we do:** Online booking, deposits, card checkout, tips and tax, no-show fees, packages, waitlist and gap offers, reminders, and a short "Needs you" list of drafted texts and decisions the owner approves. Payments go to the studio's own Stripe account; Happli takes no cut of sales.
- **Pricing structure:** Solo and Studio plans, every feature on both, no setup fee (see `src/config/pricing.ts` and `/pricing/`).
- **Shipping status to respect:** texting, email and Stripe are in test mode; reports are live; package redemption is "coming soon"; CSV import is done by the team.

## Audience

- **Primary persona:** Spray tan studio owners and mobile spray tan artists.
- **Secondary personas:** Small beauty studios (lashes, brows, esthetics). *unconfirmed*

## Competitors

| Brand | URL | Tier | Notes |
|---|---|---|---|
| Vagaro | vagaro.com | head | Broad salon and spa platform; has a tanning page |
| GlossGenius | glossgenius.com | mid | Solo beauty pros; has a tanning studio page |
| Mangomint | mangomint.com | mid | Salon and spa teams |
| Square Appointments | squareup.com | head | Generic booking with a free plan |

One competitor is banned: see `GUARDRAILS.md` (pattern `my\s*sun\s*less`). It never appears in this table or anywhere else.

## Brand voice

- **Voice tags:** plain, warm, specific, no hype.
- **Person/perspective:** "we" for Happli, "you" for the studio owner.
- **Spelling:** American English.
- **Examples:** spray tan studios and appointments throughout.
- **Forbidden words/phrases:** the banned competitor (`my\s*sun\s*less`, any case or spacing); "seamless(ly)", "revolutionary", "game-changer".
- **Forbidden claims:** that texts send without the owner's approval; reply-to-confirm booking; live texting, email or Stripe while they're in test mode; package redemption as shipped; self-serve CSV import; any competitor claim without a source link and check date; implying a competitor has no AI or tanning features.

## Author

- **Default author:** Happli team. *unconfirmed*
