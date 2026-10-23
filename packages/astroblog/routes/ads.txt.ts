// stub: replaced in Task 14
import type { APIRoute } from 'astro';
import config from 'virtual:astroblog/config';
import { adsTxt } from '../lib/files';

// Only injected when `adsense` is configured and the project has no public/ads.txt.
export const GET: APIRoute = () =>
  new Response(config.adsense ? adsTxt(config.adsense.client) : '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
