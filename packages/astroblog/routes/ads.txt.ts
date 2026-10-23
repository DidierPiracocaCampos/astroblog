// `/ads.txt` for AdSense. Only injected when `adsense` is configured and the project has no
// public/ads.txt of its own (that one is copied verbatim by Astro instead).
import type { APIRoute } from 'astro';
import config from 'virtual:astroblog/config';
import { adsTxt } from '../lib/files';

export const GET: APIRoute = () =>
  new Response(config.adsense ? adsTxt(config.adsense.client) : '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
