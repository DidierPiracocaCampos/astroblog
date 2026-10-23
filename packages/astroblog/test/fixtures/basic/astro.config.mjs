import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroblog({
      title: 'Blog Básico',
      description: 'Fixture básico de astroblog',
      author: { name: 'Ana Pérez' },
      owner: { name: 'Ana Pérez SL', country: 'ES', email: 'legal@example.com' },
      contact: { email: 'contacto@example.com', formEndpoint: 'https://formspree.io/f/test' },
      social: { github: 'https://github.com/example' },
      nav: [{ label: 'Diseño', href: '/categoria/diseno' }],
      adsense: { client: 'ca-pub-123', slots: { inArticle: '111', afterPost: '222' } },
      analytics: { ga4: 'G-TEST' },
      comments: { giscus: { repo: 'example/comments', repoId: 'R_1', category: 'Anuncios', categoryId: 'DIC_1' } },
      postsPerPage: 2,
    }),
  ],
});
