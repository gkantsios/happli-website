// Single place for site-wide settings. Change the CTA link, contact email or nav here.

export type NavLink = { label: string; href: string };

// Blog and compare sections. While a section is off, its pages still build and work by URL,
// but they're marked noindex, left out of the sitemap, and not linked from the footer.
// Turn one on once it has published posts.
const sections = { blog: false, compare: false };

export const site = {
  name: 'Happli',
  url: 'https://gohappli.com',
  tagline: 'The booking and front-desk partner for spray tan studios and beauty pros.',
  signInUrl: 'https://app.gohappli.com/login',
  contactEmail: 'hello@gohappli.com',
  defaultOgImage: '/og-default.png',
  locale: 'en_US',

  sections,

  // Homepage hero: 'zoom' = scroll-zoom hero (HeroZoom), 'static' = the simpler hero (HeroStatic).
  heroVariant: 'zoom' as 'zoom' | 'static',

  cta: {
    label: 'Book a demo',
    // Primary CTA for every "Book a demo" button on the site.
    href: 'https://tidycal.com/gkantsios/30-minute-meeting',
  },

  // Header links. Add { label: 'Blog', href: '/blog/' } once the first post is published.
  nav: [
    { label: 'Features', href: '/features/' },
    { label: 'Pricing', href: '/pricing/' },
  ] satisfies NavLink[],

  footer: {
    product: [
      { label: 'Features', href: '/features/' },
      { label: 'Pricing', href: '/pricing/' },
      ...(sections.blog ? [{ label: 'Blog', href: '/blog/' }] : []),
      ...(sections.compare ? [{ label: 'Compare', href: '/compare/' }] : []),
    ] satisfies NavLink[],
    legal: [
      { label: 'Privacy', href: '/privacy/' },
      { label: 'Terms', href: '/terms/' },
      { label: 'Security', href: '/security/' },
    ] satisfies NavLink[],
  },
} as const;
