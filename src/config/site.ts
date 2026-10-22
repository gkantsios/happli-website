// Single place for site-wide settings. Change the CTA link, contact email or nav here.

export type NavLink = { label: string; href: string };

// Content sections. While a section is off, its pages still build and work by URL, but they're
// marked noindex, left out of the sitemap, and not linked from the footer. Turn one on once it has
// published posts. guides, for (studio types) and alternatives are templates with drafts only.
const sections = { blog: false, compare: true, guides: false, for: false, alternatives: false };

export const site = {
  name: 'Happli',
  url: 'https://gohappli.com',
  positioning: 'Booking software for spray tan and beauty studios, with AI built in.',
  tagline: 'Booking software for spray tan and beauty studios, with AI built in.',
  helpUrl: 'https://support.gohappli.com/',
  appUrl: 'https://app.gohappli.com',
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
    href: 'https://tidycal.com/gkantsios/happli-demo',
  },

  // "Try the demo" button. It renders in the header, the home hero and the final CTA band only when
  // enabled is true. Turn it on once app.gohappli.com/demo is live.
  demo: {
    enabled: false,
    label: 'Try the demo',
    href: 'https://app.gohappli.com/demo',
  },

  // Header links. Add { label: 'Blog', href: '/blog/' } once the first post is published.
  nav: [
    { label: 'Features', href: '/features/' },
    { label: 'Pricing', href: '/pricing/' },
    { label: 'Compare', href: '/compare/' },
    { label: 'Help', href: '/help/' },
  ] satisfies NavLink[],

  footer: {
    product: [
      { label: 'Features', href: '/features/' },
      { label: 'Pricing', href: '/pricing/' },
      { label: 'Roadmap', href: '/roadmap/' },
      { label: 'Happli on your phone', href: '/phone/' },
      { label: 'Spray tan studio software', href: '/spray-tan-studio-software/' },
      ...(sections.blog ? [{ label: 'Blog', href: '/blog/' }] : []),
      ...(sections.compare ? [{ label: 'Compare', href: '/compare/' }] : []),
    ] satisfies NavLink[],
    legal: [
      { label: 'Privacy', href: '/privacy/' },
      { label: 'Terms', href: '/terms/' },
      { label: 'Security', href: '/security/' },
      { label: 'Data Processing Addendum', href: '/dpa/' },
      { label: 'Acceptable Use', href: '/acceptable-use/' },
      { label: 'Refunds and Cancellation', href: '/refunds/' },
      { label: 'SMS Terms', href: '/sms-terms/' },
      { label: 'Cookies', href: '/cookies/' },
    ] satisfies NavLink[],
  },
} as const;
