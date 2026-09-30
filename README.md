# happli-website

The marketing site for Happli, at [gohappli.com](https://gohappli.com). It's built with [Astro](https://astro.build) as a static site and deployed to Cloudflare Workers as static assets.

## Run it locally

You need Node.js 22.12 or newer (`.node-version` pins 22, which Cloudflare's build also uses).

```sh
npm install
npm run dev       # http://localhost:4321, reloads as you edit
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run check     # type-check .astro and .ts files

# Serve dist/ the way Cloudflare will (routing, redirects, 404 page):
npm run build && npx wrangler dev
# Check the deploy without uploading anything:
npm run build && npx wrangler deploy --dry-run
```

## Where things live

| Path | What it is |
|---|---|
| `src/config/site.ts` | Site name, URLs, the **"Book a demo" link**, sign-in URL, contact email, header and footer links |
| `src/styles/tokens.css` | Colors, fonts, spacing and radii |
| `src/styles/global.css` | Base styles, buttons, section rhythm, long-form (`.prose`) styles |
| `src/layouts/` | `BaseLayout` (head, SEO, header, footer), `ProseLayout` (legal pages), `PostLayout` (blog and compare posts) |
| `src/components/sections/` | One component per page section (HeroZoom, HeroStatic, Walkthrough, FeatureGrid, Faq, CtaBand, PricingPlans, …) |
| `src/pages/` | One file per route |
| `src/legal/` | Privacy, terms and security page bodies (HTML, ported word-for-word from the old site) |
| `src/content/blog/`, `src/content/compare/` | Markdown posts |
| `public/` | Files served as-is: logos, favicons, `robots.txt`, the default social image, `_redirects` (Cloudflare edge redirects) and fallback redirect pages for the old `privacy.html` / `terms.html` / `security.html` URLs |
| `wrangler.jsonc` | Cloudflare Worker config: a static-assets-only Worker named `happli-website` that serves `dist/` |
| `TODO.md` | Launch blockers, claims to confirm and placeholders to fill |

## Homepage hero

The homepage has two heroes. Pick one with `heroVariant` in `src/config/site.ts`:

- `'zoom'` (default): `HeroZoom.astro`, the scroll-zoom hero from the design mockup. As you scroll, the studio photo zooms into the monitor on the front desk, the calendar lands full size, and three panels slide in. Visitors who prefer reduced motion get the final frame laid out statically, and visitors without JavaScript get a one-screen hero.
- `'static'`: `HeroStatic.astro`, a simpler hero with the calendar illustration below the copy.

The zoom hero's photo is `src/assets/hero-studio.jpg`. Astro serves it as WebP in four widths with a JPEG fallback. To swap in a new photo, replace that file and update `MONITOR` at the top of `HeroZoom.astro` to the monitor screen's pixel box in the new photo (left, top, right, bottom).



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

The site runs on **Cloudflare Workers** as a static-assets-only Worker (no Worker script). `wrangler.jsonc` names the Worker `happli-website` (it must match the Cloudflare project name), serves `./dist`, and uses `dist/404.html` for unknown paths.

Cloudflare Workers Builds is connected to this GitHub repo and deploys on every push to the production branch (`main`). Build settings in the Cloudflare dashboard (**Workers & Pages → happli-website → Settings → Build**):

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command (non-production branches, if preview builds are on) | leave the default, `npx wrangler preview` |
| Root directory | `/` (the repo root; leave blank) |
| Node version | 22, from `.node-version` (no `NODE_VERSION` variable needed) |

Workers Builds installs dependencies with `npm` (from `package-lock.json`) and uses the Wrangler version in `package.json`.

One-time launch step: point gohappli.com at the Worker. In Cloudflare, open the `happli-website` Worker and go to **Settings → Domains & Routes → Add → Custom Domain**, then add `gohappli.com` (and `www.gohappli.com` if wanted). The gohappli.com zone must be on Cloudflare, and Cloudflare won't create a Custom Domain on a hostname that already has a CNAME record, so delete the old GitHub Pages DNS records for those hostnames first. Cloudflare then creates the DNS records and certificate.

**URLs and redirects.** Pages live at trailing-slash URLs (`/features/`), and Cloudflare redirects `/features` to `/features/`. `public/_redirects` sends the old `/privacy.html`, `/terms.html` and `/security.html` URLs (and `/privacy`, `/terms`, `/security`) straight to `/privacy/`, `/terms/` and `/security/` with a 301. The `public/*.html` redirect pages stay as a fallback for any host that doesn't read `_redirects`.
