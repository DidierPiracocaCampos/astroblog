import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroblog({
      title: 'Blog Básico',
      description: 'Fixture básico de astroblog',
      author: { name: 'Ana Pérez' },
      owner: { name: 'Ana Pérez SL', country: 'ES' },
      social: { github: 'https://github.com/example' },
      nav: [{ label: 'Diseño', href: '/categoria/diseno' }],
      adsense: { client: 'ca-pub-123', slots: { inArticle: '111', afterPost: '222' } },
      analytics: { ga4: 'G-TEST' },
      postsPerPage: 2,
    }),
  ],
});
