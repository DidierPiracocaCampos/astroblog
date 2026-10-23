// stub: replaced in Task 14
/// <reference types="astro/client" />
import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/files';
import { absoluteUrl } from '../lib/seo';

export const GET: APIRoute = () =>
  new Response(robotsTxt(absoluteUrl(import.meta.env.SITE ?? '', import.meta.env.BASE_URL, 'sitemap-index.xml')), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
