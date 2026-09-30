// Single place for site-wide settings. Change the CTA link, contact email or nav here.

export type NavLink = { label: string; href: string };

export const site = {
  name: 'Happli',
  url: 'https://gohappli.com',
  tagline: 'The booking and front-desk partner for spray tan studios and beauty pros.',
  signInUrl: 'https://app.gohappli.com/login',
  contactEmail: 'hello@gohappli.com',
  defaultOgImage: '/og-default.png',
  locale: 'en_US',

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
      { label: 'Blog', href: '/blog/' },
      { label: 'Compare', href: '/compare/' },
    ] satisfies NavLink[],
    legal: [
      { label: 'Privacy', href: '/privacy/' },
      { label: 'Terms', href: '/terms/' },
      { label: 'Security', href: '/security/' },
    ] satisfies NavLink[],
  },
} as const;
