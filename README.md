# happli-website

The marketing site for Happli, at [gohappli.com](https://gohappli.com). It's built with [Astro](https://astro.build) as a static site and deployed to GitHub Pages.

## Run it locally

You need Node.js 22.12 or newer.

```sh
npm install
npm run dev       # http://localhost:4321, reloads as you edit
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run check     # type-check .astro and .ts files
```

## Where things live

| Path | What it is |
|---|---|
| `src/config/site.ts` | Site name, URLs, the **"Book a demo" link**, sign-in URL, contact email, header and footer links |
| `src/styles/tokens.css` | Colors, fonts, spacing and radii |
| `src/styles/global.css` | Base styles, buttons, section rhythm, long-form (`.prose`) styles |
| `src/layouts/` | `BaseLayout` (head, SEO, header, footer), `ProseLayout` (legal pages), `PostLayout` (blog and compare posts) |
| `src/components/sections/` | One component per page section (Hero, FeatureGrid, Faq, CtaBand, PricingPlans, …) |
| `src/pages/` | One file per route |
| `src/legal/` | Privacy, terms and security page bodies (HTML, ported word-for-word from the old site) |
| `src/content/blog/`, `src/content/compare/` | Markdown posts |
| `public/` | Files served as-is: logos, favicons, `robots.txt`, `CNAME`, the default social image, and redirects from the old `privacy.html` / `terms.html` / `security.html` URLs |
| `TODO.md` | Launch blockers, claims to confirm and placeholders to fill |

## Add a blog post or a comparison page

1. Create a Markdown file (`.md` or `.mdx`):
   - blog post: `src/content/blog/my-post.md` → published at `/blog/my-post/`
   - comparison ("Happli vs X" / alternatives): `src/content/compare/happli-vs-x.md` → published at `/compare/happli-vs-x/`
2. Start it with frontmatter:

```yaml
---
title: 'How deposits cut spray tan no-shows'   # required, up to 70 characters
description: 'One or two sentences for search results and social cards.'  # required, up to 170 characters
pubDate: 2026-10-15            # required
updatedDate: 2026-11-01        # optional
author: 'Grant Kantsios'       # required
tags: ['deposits', 'no-shows'] # optional, defaults to []
draft: true                    # optional, defaults to false
heroImage: './images/deposits.jpg'  # optional, path relative to the post file
heroImageAlt: 'A client paying a deposit on her phone'  # recommended when heroImage is set
competitor: 'Other Booking App'     # required for compare pages only
---
```

3. Write the post in Markdown below the frontmatter.

**Drafts:** `draft: true` posts show in `npm run dev` (with a "Draft preview" badge) so you can review them. They are left out of the production build, the sitemap and the RSS feed. Set `draft: false` to publish.

Each post gets its canonical URL, Open Graph and Twitter tags, `BlogPosting` and `BreadcrumbList` structured data, and an entry in the sitemap. Blog posts also go into `/rss.xml`.

After the first blog post is published, add Blog to the header in `src/config/site.ts`.

## SEO

- `@astrojs/sitemap` writes `sitemap-index.xml` on every build, and `public/robots.txt` points to it.
- Every page sets a unique title and meta description, a canonical URL (on `https://gohappli.com`, with a trailing slash), and Open Graph and Twitter tags. The default share image is `public/og-default.png` (regenerate it with `node scripts/generate-og.mjs`).
- The home page has `Organization` and `SoftwareApplication` JSON-LD. Other pages have `BreadcrumbList`.

## Deploy

`.github/workflows/deploy.yml` builds the site with `withastro/action` and publishes it with `actions/deploy-pages`. It runs on every push to `main`, and you can also start it by hand from the Actions tab (**Run workflow**).

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. `public/CNAME` keeps the custom domain `gohappli.com`.

The old URLs `/privacy.html`, `/terms.html` and `/security.html` redirect to `/privacy/`, `/terms/` and `/security/`.
