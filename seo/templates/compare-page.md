# Template: compare page

Use for `src/content/compare/<competitor>.md`. Required: `competitor`, dates, sources, and a "Who should pick" section for both products.

```yaml
---
title: 'Happli vs <Competitor> for Spray Tan Studios (2026)'   # up to 70 characters
description: 'How Happli and <Competitor> compare on <3 things>. Last checked <date>.'   # up to 170
pubDate: YYYY-MM-DD
updatedDate: YYYY-MM-DD        # bump on every re-check
author: 'Happli team'
competitor: '<Competitor>'
tags: ['comparison', '<competitor>']
draft: false
todo:                          # claims to verify. Never rendered.
  - '<what you could not confirm>'
---
```

## Body

1. Italic line: `*Last checked <date>. <Competitor> details come from its [public pricing page](url).*`
2. Two or three sentences on what each product is. Neutral.
3. **## At a glance** table, rows: starting price, how it scales, free trial, online booking, deposits, reminders, packages, memberships, payments, waitlist and gap offers. Columns: blank, Happli, Competitor. Write "Not stated" or "Not listed" when a page doesn't say. Never guess.
4. **## Pricing**: the competitor's model with exact figures and a source link; Happli's prices from `src/config/pricing.ts`. Say plainly who is cheaper at the entry level.
5. **## Where <Competitor> is stronger** (be honest).
6. **## Where Happli is different** (only built, shipped features; check `/features/`).
7. **## Who should pick <Competitor>** and **## Who should pick Happli**.
8. **## Sources**: one link per competitor claim, plus Happli's own pages.

## Rules

- Every competitor claim needs a link to the competitor's own public page, and the check date.
- Don't render anything unverified. Put it in `todo:`.
- Don't say a competitor "lacks" a feature unless their own pages say so. Use "not listed on the pricing page."
- Re-check quarterly.
