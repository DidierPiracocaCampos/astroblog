import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// Blog collection defined but only a draft: the build must not fail, the home shows the empty state
// and no category/tag/author pages are generated.
export default defineConfig({
  site: 'https://example.com',
  integrations: [astroblog({ title: 'Blog Vacío', description: 'Fixture sin posts publicados' })],
});
