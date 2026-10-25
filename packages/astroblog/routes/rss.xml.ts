// `/rss.xml`: published posts, newest first, with absolute links (`site` + `base` + post path).
// Only injected when `site` is set (index.ts): @astrojs/rss needs it to build absolute links.
import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import config from 'virtual:astroblog/config';
import { loadPosts } from '../lib/blog';
import { postPath } from '../lib/routes';
import { absoluteUrl } from '../lib/seo';

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('[astroblog] rss.xml requires `site` in the Astro config.');
  const base = import.meta.env.BASE_URL;
  const url = (path: string) => absoluteUrl(site.href, base, path);
  const posts = await loadPosts();
  return rss({
    title: config.title,
    description: config.description,
    site: url('/'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: url(postPath(config, post)),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>${config.lang}</language>`,
  });
};
