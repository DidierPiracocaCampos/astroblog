import { defineCollection } from 'astro:content';
import { blogCollection } from '@didierp/astroblog/content';

export const collections = {
  blog: defineCollection(blogCollection()),
};
