import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEntry } from 'astro:content';
import { getPublished } from '../../lib/posts';
import { site } from '../../config/site';

export async function GET(context: APIContext) {
  const posts = (await getPublished('blog')).filter((post) => !post.data.draft);
  // Each item's author name as <dc:creator> (RSS's own <author> expects an email address).
  const authors = await Promise.all(posts.map(async (post) => (await getEntry(post.data.author))?.data.name ?? 'Happli team'));
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return rss({
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    title: `${site.name} blog`,
    description: 'Practical tips for salon, spa and beauty studio owners on getting found, booking, deposits and reminders.',
    site: context.site ?? site.url,
    items: posts.map((post, i) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
      customData: `<dc:creator>${escape(authors[i])}</dc:creator>`,
    })),
    customData: '<language>en-us</language>',
  });
}
