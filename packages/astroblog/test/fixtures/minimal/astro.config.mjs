import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

export default defineConfig({
  site: 'https://example.com',
  integrations: [astroblog({ title: 'Minimal', description: 'Minimal fixture' })],
});
