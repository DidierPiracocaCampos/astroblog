import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// Non-empty `base` and a `site` without trailing slash; own public/_headers and public/ads.txt.
export default defineConfig({
  site: 'https://x.com',
  base: '/blog',
  integrations: [
    astroblog({
      title: 'Blog con base',
      description: 'Fixture con base no vacío',
      adsense: { client: 'ca-pub-999' },
    }),
  ],
});
