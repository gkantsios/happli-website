import { defineCollection, reference, type SchemaContext } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const postSchema = ({ image }: SchemaContext) =>
  z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    heroImage: image().optional(),
    heroImageAlt: z.string().optional(),
  });

// Blog authors, in one place (src/content/authors.json). A Person gets Person schema on the posts they write;
// "happli-team" (an Organization) is the default author. oneLiner shows in the byline, bio (falls back to
// oneLiner) in the About the author box. sameAs: profile links (e.g. LinkedIn) for the Person schema.
const authors = defineCollection({
  loader: file('./src/content/authors.json'),
  schema: ({ image }) =>
    z.object({
      type: z.enum(['Person', 'Organization']),
      name: z.string(),
      title: z.string(),
      jobTitle: z.string().optional(),
      oneLiner: z.string().optional(),
      bio: z.string().optional(),
      photo: image(),
      sameAs: z.array(z.url()).default([]),
    }),
});

// Blog posts: the shared fields, with a shorter description (it is the meta description), an author from the
// authors collection ("happli-team" by default), and an optional share image path (public/...) that falls back
// to /og-default.png. Optional per post: a reviewer, key takeaways (tldr), an FAQ that also outputs FAQPage
// schema (faq), and pinned related posts (related, blog slugs).
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: (ctx) =>
    postSchema(ctx).extend({
      description: z.string().max(155),
      author: reference('authors').default({ collection: 'authors', id: 'happli-team' }),
      reviewer: reference('authors').optional(),
      ogImage: z.string().startsWith('/').optional(),
      tldr: z.array(z.string().max(200)).min(1).max(6).optional(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(1).optional(),
      related: z.array(z.string()).max(3).optional(),
    }),
});

const compare = defineCollection({
  loader: glob({ base: './src/content/compare', pattern: '**/*.{md,mdx}' }),
  schema: (ctx) => postSchema(ctx).extend({ competitor: z.string(),
    // Claims to verify; kept here so they never render. Search the repo for "todo:".
    todo: z.array(z.string()).default([]),
  }),
});

// Guides (long-form how-tos), studio-type pages (/for/) and "X alternatives" pages (/alternatives/).
// Templates only for now: each has one draft example and its section is switched off in site.ts.
const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.{md,mdx}' }),
  schema: postSchema,
});

const forStudios = defineCollection({
  loader: glob({ base: './src/content/for', pattern: '**/*.{md,mdx}' }),
  schema: (ctx) => postSchema(ctx).extend({ studioType: z.string() }),
});

const alternatives = defineCollection({
  loader: glob({ base: './src/content/alternatives', pattern: '**/*.{md,mdx}' }),
  schema: (ctx) => postSchema(ctx).extend({ competitor: z.string(), todo: z.array(z.string()).default([]) }),
});

export const collections = { authors, blog, compare, guides, for: forStudios, alternatives };
