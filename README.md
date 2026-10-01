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
| `src/config/site.ts` | Site name, URLs, the **"Book a demo" link**, sign-in URL, contact email, header and footer links, which homepage hero to use, and whether /blog and /compare are switched on |
| `src/config/hero.ts` | The zoom hero's studio photo and where its monitor screen is (the one place to swap the photo) |
| `src/styles/tokens.css` | Colors, fonts, spacing and radii |
| `src/styles/global.css` | Base styles, buttons, section rhythm, long-form (`.prose`) styles |
| `src/layouts/` | `BaseLayout` (head, SEO, header, footer), `ProseLayout` (legal pages), `PostLayout` (blog and compare posts) |
| `src/components/sections/` | One component per page section (HeroZoom, HeroStatic, Walkthrough, FeatureCards, FeatureRows, Faq, CtaBand, PricingPlans, …) |
| `src/components/mocks/` | Product illustrations shared by the walkthrough, the home feature cards and the /features rows (NeedsList, CheckoutSheet, PhoneBooking, ReminderPreview) |
| `src/components/StickyCta.astro` | The phone-only "Book a demo" bar (below 700px): it shows whenever none of the page's own "Book a demo" buttons is visible: a button counts as gone once its bottom edge passes under the sticky header, or once the zoom hero's copy fades below 40% opacity. On pages without one it shows from the first screen, footer included. The header's button is hidden on phones (it's in the menu), so exactly one shows at every scroll position. The hero's phone demo keeps its buttons and sheet above the bar |
| `src/pages/` | One file per route |
| `src/legal/` | Privacy, terms and security page bodies (HTML, ported word-for-word from the old site) |
| `src/content/blog/`, `src/content/compare/` | Markdown posts |
| `public/` | Files served as-is: logos, favicons (`favicon.ico` is made by `node scripts/generate-favicon.mjs`), `robots.txt`, the default social image, `_redirects` (Cloudflare edge redirects) and fallback redirect pages for the old `privacy.html` / `terms.html` / `security.html` URLs |
| `wrangler.jsonc` | Cloudflare Worker config: a static-assets-only Worker named `happli-website` that serves `dist/` |
| `TODO.md` | Launch blockers, claims to confirm and placeholders to fill |

## Homepage hero

The homepage has two heroes. Pick one with `heroVariant` in `src/config/site.ts`:

- `'zoom'` (default): `HeroZoom.astro`, the scroll-zoom hero from the design mockup. As you scroll, the studio photo zooms into the monitor on the front desk, the app screen lands full size, and three panels slide in. Visitors who prefer reduced motion get the final frame laid out statically, and visitors without JavaScript get a one-screen hero.
- `'static'`: `HeroStatic.astro`, a simpler hero with the calendar illustration below the copy.

### The app screen in the zoom hero

The screen that lands in the monitor is `AppScreen.astro`: the owner app's Calendar day view for a sample studio (Golden Glow, Thursday, Aug 27), laid out at 1280×784 and scaled to fit. Its sample data lives in the component's frontmatter, and the header stats, utilization and summary are computed from it; the build fails if they drift from the agreed numbers.

Once the zoom has landed (and before the panels slide in), the screen can be used: open an appointment and check out, open the gap to start a new booking, review and approve the gap offer draft, and switch days in the week strip. Nothing is sent or booked. Until then the screen is `inert`, so Tab and clicks pass it by, and scrolling on closes anything that's open. Nothing inside it scrolls or listens to wheel or touch events, so the page always scrolls normally.

On phones the app is laid out 640px wide with its rail hidden, and the landed screen grows taller so it fills the screen down to two buttons ("Open an appointment", "See what needs you"). Those buttons and the "Needs you" pill open the panels as a bottom sheet at normal page size. With reduced motion, the screen is usable right away.

### Swapping the hero photo

The photo and the monitor's position in it are set in one place, `src/config/hero.ts`:

1. Put the new photo in `src/assets/` and point the import in `src/config/hero.ts` at it.
2. Set `monitor` to the monitor screen's box in the new photo, in the photo's own pixels: `x0` left edge, `y0` top edge, `x1` right edge, `y1` bottom edge.

Astro serves the photo as WebP at several widths (up to the photo's own width) with a JPEG fallback.

What the photo needs:

- **Shape and size:** landscape **16:9**, at least **1920×1080**, ideally **2560×1440**. On phones the photo is drawn about 1550 CSS px wide and then zoomed 3–4×, so extra pixels keep it sharp. A high-quality JPEG is fine.
- **Monitor:** shot **straight on** (not at an angle), because the app is drawn over the screen as a flat rectangle. Screen shape about **16:10** (1.6–1.65), about **15–25% of the photo's width**.
- **Position:** the monitor **near the horizontal center** (phones in portrait only see roughly the middle quarter of the photo's width) and about **40–60% of the way down**.
- **Top third:** calm, with **no signage or text**. The headline sits over it behind a light gradient.
- The screen itself can be blank; it gets covered.

## Motion below the hero

Every section below the zoom hero has one small moment as it scrolls into view. `public/motion/reveal.js` drives them, with the styles in `public/motion/motion.css`. `BaseLayout` loads the script as a plain deferred file, and the script loads the CSS once the page has loaded; neither is bundled into the page, which keeps them off the hero's first paint (measured: a module script or inline code pushed it back by about 150ms in Lighthouse).

| Attribute | What it does |
|---|---|
| `data-reveal` | The element fades in and rises 12px once 18% of it is on screen |
| `data-reveal-stagger` | The same for each child, 80ms apart (the last starts by 400ms) |
| `data-play` | Plays a mock's one-shot sequence: children marked `.m-step` animate with their own `--d` delay (and optional `--m` keyframes, `--t` duration); `data-type` types text out, `data-count` counts a figure up. `data-play="manual"` is started by its own component (the walkthrough's day view) |
| `data-draw` | Draws a line between `[data-draw-at]` markers as you scroll (How it works); it's complete by the time the section is centered |

Rules: everything runs once and never loops; only `opacity` and `transform` animate, so nothing shifts; single effects are 900ms or less and sequences 2.5s or less (the scroll-drawn line is the exception). The hidden start states only apply under `html.motion`, which the script adds when the visitor hasn't asked for reduced motion. So with reduced motion the page is static and shows every end state (the How it works line drawn in full), and without JavaScript all content is visible (the How it works line needs JavaScript and is simply left out). Anything already on screen when the script starts (a reload partway down the page) stays in its end state. The walkthrough autoplays one pass through its four steps and stops on the last.

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

Each post gets Open Graph and Twitter tags and `BlogPosting` and `BreadcrumbList` structured data. Once its section is switched on (below), it also gets a canonical URL and an entry in the sitemap. Published blog posts go into `/rss.xml`.

**Switching a section on.** /blog and /compare are off in `src/config/site.ts` (`sections`) until they have published posts. While a section is off, its pages still build and work by URL, but they're marked noindex, left out of the sitemap and the footer, and (for the blog) the RSS link is left out of the page head. After the first post is published, set `sections.blog` (or `sections.compare`) to `true`, and add Blog to the header `nav` if you want it there.

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
