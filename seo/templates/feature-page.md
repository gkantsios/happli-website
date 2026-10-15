# Template: feature page

Use for `/features/<feature>/` pages (online booking, text reminders, checkout, AI COO) or a section on `/features/`.

## Fields

| Field | Guidance |
|---|---|
| Title tag | `<Feature> for Spray Tan Studios \| Happli` (under 60 characters) |
| Meta description | What it does, who it's for, one proof point (under 160) |
| H1 | The outcome, not the feature name. Example: "Clients book and pay a deposit without calling you." |
| Eyebrow | The feature name |
| Primary keyword | From `seo/keyword-map.csv` |
| CTA | Book a demo; add "Try the demo" automatically when `site.demo.enabled` is on |

## Sections

1. **Lede** (2 sentences): the problem, then what Happli does.
2. **How it works** in 3 steps, with the matching illustration from `src/components/mocks/`.
3. **What you can set**: bullet list from `/features/` copy. Only built, shipped things.
4. **For spray tan studios**: one concrete scenario (a Thursday with a cancellation).
5. **FAQs** (3 to 5, visible; the Faq component adds the FAQPage JSON-LD).
6. **Related**: links to two features, the niche page, `/pricing/`.
7. **CtaBand.**

## Checks before publishing

- Each claim appears in `src/pages/features.astro` or has a `TODO confirm:` comment.
- Breadcrumbs JSON-LD is set. The page is in the sitemap (automatic).
- Internal links in and out: from `/features/`, home and one blog post.
