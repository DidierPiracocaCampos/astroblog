// `/robots.txt`: allows everything and points to the absolute sitemap index (with `base`).
// Without `site` the Sitemap line is omitted: robots.txt only accepts an absolute sitemap URL.
import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/files';
import { absoluteUrl } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? absoluteUrl(site.href, import.meta.env.BASE_URL, 'sitemap-index.xml') : undefined;
  return new Response(robotsTxt(sitemap), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
