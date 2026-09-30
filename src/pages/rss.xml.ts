import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublished } from '../lib/posts';
import { site } from '../config/site';

export async function GET(context: APIContext) {
  const posts = (await getPublished('blog')).filter((post) => !post.data.draft);
  return rss({
    title: `${site.name} blog`,
    description: 'Practical guides for spray tan studios and beauty pros.',
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
