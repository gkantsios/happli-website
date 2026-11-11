import { getCollection, type CollectionEntry } from 'astro:content';

export type PostCollection = 'blog' | 'compare' | 'guides' | 'for' | 'alternatives';

/**
 * Published entries, newest first. Drafts are visible in `astro dev` so you can
 * preview them, and are left out of every production build (pages, sitemap, RSS).
 */
export async function getPublished<C extends PostCollection>(collection: C): Promise<CollectionEntry<C>[]> {
  const entries = (await getCollection(collection, ({ data }) => import.meta.env.DEV || !data.draft)) as CollectionEntry<C>[];
  return entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Minutes to read a post at about 230 words a minute (link URLs not counted), never less than 1. */
export const readingMinutes = (body: string | undefined) =>
  Math.max(1, Math.round((body ?? '').replace(/\]\([^)]*\)/g, ']').trim().split(/\s+/).filter(Boolean).length / 230));

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
