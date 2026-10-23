import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// Component override, custom CSS, a disabled route and built-in daisyUI themes.
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroblog({
      title: 'Blog Override',
      description: 'Fixture con sustituciones',
      components: { Header: './src/components/Header.astro' },
      customCss: ['./src/styles/tema.css'],
      routes: { terms: false },
      theme: { light: 'cupcake', dark: 'dracula' },
    }),
  ],
});
