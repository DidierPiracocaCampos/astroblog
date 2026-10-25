import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// Silo permalinks + YMYL signals (spec 0.2): posts at /<categoria>/<slug>/, one post per listing page.
export default defineConfig({
  site: 'https://hipotecas.example',
  integrations: [
    astroblog({
      title: 'Hipotecas Claras',
      description: 'Fixture de silos y señales YMYL',
      permalinks: 'silo',
      postsPerPage: 1,
      author: { name: 'Ana Pérez', jobTitle: 'Economista', bio: 'Diez años en banca hipotecaria.', sameAs: ['https://www.linkedin.com/in/ana'] },
      reviewers: { luis: { name: 'Luis Gómez', jobTitle: 'Notario', url: 'https://luis.example' } },
      disclaimer: 'Este contenido es informativo y no constituye asesoramiento financiero.',
      seo: { articleType: 'Article' },
    }),
  ],
});
