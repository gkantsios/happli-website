import { site } from '../config/site';

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
  };
}

// No offers or aggregateRating until pricing and real reviews exist.
export function softwareApplication() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    url: `${site.url}/`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Online booking, deposits, reminders, packages and checkout for spray tan studios and beauty pros.',
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
