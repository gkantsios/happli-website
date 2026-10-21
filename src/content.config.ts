import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
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

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: postSchema,
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

export const collections = { blog, compare, guides, for: forStudios, alternatives };
