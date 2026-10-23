import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// No `site`: no absolute URLs can be built, so canonical/og:url/JSON-LD are omitted.
export default defineConfig({
  integrations: [astroblog({ title: 'Sin site', description: 'Fixture without site', search: false })],
});
