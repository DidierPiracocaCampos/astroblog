import { z } from 'astro/zod';
import type { ZodType } from 'astro/zod';
import { glob } from 'astro/loaders';

export interface BlogSchemaContext {
  image: () => ZodType;
}

export function blogSchema({ image }: BlogSchemaContext) {
  return z
    .object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      author: z.string().optional(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      noAds: z.boolean().default(false),
      // YMYL signals: `reviewer` is an id of the site's `reviewers` (checked by loadPosts).
      reviewer: z.string().optional(),
      reviewedDate: z.coerce.date().optional(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
      sources: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.cover !== undefined && !data.coverAlt) {
        ctx.addIssue({
          code: 'custom',
          path: ['coverAlt'],
          message: 'coverAlt is required when cover is set',
        });
      }
    });
}

export function blogCollection(opts: { base?: string } = {}) {
  return {
    loader: glob({ pattern: '**/*.{md,mdx}', base: opts.base ?? './src/content/blog' }),
    schema: ({ image }: BlogSchemaContext) => blogSchema({ image }),
  };
}

export function pagesCollection(opts: { base?: string } = {}) {
  return {
    loader: glob({ pattern: '**/*.{md,mdx}', base: opts.base ?? './src/content/pages' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      updatedDate: z.coerce.date().optional(),
    }),
  };
}
