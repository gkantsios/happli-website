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
  schema: (ctx) => postSchema(ctx).extend({ competitor: z.string() }),
});

export const collections = { blog, compare };
