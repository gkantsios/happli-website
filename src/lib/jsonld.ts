import { site } from '../config/site';
import { plan } from '../config/pricing';

const abs = (path: string) => new URL(path, site.url).href;

export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: `${site.url}/`,
    logo: abs('/logo.png'),
    email: site.contactEmail,
    description: site.positioning,
  };
}

export function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: `${site.url}/`,
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}

// Offers are the one plan at its launch prices, monthly and billed yearly (src/config/pricing.ts).
// No aggregateRating until there are real reviews.
export function softwareApplication() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    url: `${site.url}/`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: `${site.positioning} Online booking, deposits, reminders, packages and checkout for spray tan studios and beauty pros.`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: String(plan.launch.yearly),
      highPrice: String(plan.launch.monthly),
      offerCount: '2',
      offers: (['monthly', 'yearly'] as const).map((b) => ({
        '@type': 'Offer',
        name: b === 'monthly' ? `${plan.name}, billed monthly` : `${plan.name}, billed yearly`,
        price: String(plan.launch[b]),
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: String(plan.launch[b]),
          priceCurrency: 'USD',
          billingDuration: 1,
          unitCode: 'MON',
        },
        url: `${site.url}/pricing/`,
      })),
    },
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export type Crumb = { name: string; href: string };

export function breadcrumbs(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.href),
    })),
  };
}

export function blogPosting(post: {
  title: string;
  description: string;
  url: string;
  pubDate: Date;
  updatedDate?: Date;
  author: string;
  image: string;
  tags: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    mainEntityOfPage: post.url,
    url: post.url,
    datePublished: post.pubDate.toISOString(),
    dateModified: (post.updatedDate ?? post.pubDate).toISOString(),
    author: { '@type': 'Person', name: post.author },
    publisher: { '@id': `${site.url}/#organization` },
    image: abs(post.image),
    keywords: post.tags.join(', ') || undefined,
  };
}
