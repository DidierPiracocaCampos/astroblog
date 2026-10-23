import { defineCollection } from 'astro:content';
import { blogCollection, pagesCollection } from '@didierp/astroblog/content';

export const collections = {
  blog: defineCollection(blogCollection()),
  pages: defineCollection(pagesCollection()),
};
