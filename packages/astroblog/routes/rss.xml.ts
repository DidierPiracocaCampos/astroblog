// stub: replaced in Task 14
import type { APIRoute } from 'astro';
import config from 'virtual:astroblog/config';

export const GET: APIRoute = () =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${config.title}</title></channel></rss>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
