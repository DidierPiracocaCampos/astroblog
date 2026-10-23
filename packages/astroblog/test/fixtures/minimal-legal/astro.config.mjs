import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// `minimal` in English, without adsense/analytics/contact form: exercises the English legal templates.
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroblog({
      title: 'Minimal Legal',
      description: 'Minimal legal fixture',
      lang: 'en',
      author: { name: 'Jane Doe', email: 'jane@example.com' },
      social: { github: 'https://github.com/jane' },
    }),
  ],
});
