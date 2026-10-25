// @ts-check
import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

// Demo de @didierp/astroblog. Las opciones comentadas muestran el resto de la API;
// descoméntalas para probarlas (ver packages/astroblog/README.md).
export default defineConfig({
  // Obligatorio para canónicas, sitemap, RSS, JSON-LD y para usar `adsense`.
  site: 'https://astroblog-demo.pages.dev',
  integrations: [
    astroblog({
      title: 'Cuaderno Web',
      description: 'Notas prácticas sobre desarrollo web, diseño de interfaces y rendimiento, escritas en español.',
      lang: 'es', // 'es' | 'en'
      logo: '/logo.svg', // ruta pública (carpeta public/)
      author: {
        name: 'Laura Gómez',
        email: 'laura@astroblog-demo.pages.dev',
        url: 'https://astroblog-demo.pages.dev/acerca/',
        // avatar: '/avatar.jpg',
      },
      owner: { name: 'Laura Gómez', country: 'España', email: 'legal@astroblog-demo.pages.dev' },
      social: {
        github: 'https://github.com/DidierPiracocaCampos/astroblog',
        // x: 'https://x.com/usuario',
        // linkedin: 'https://www.linkedin.com/in/usuario',
      },
      nav: [
        { label: 'Blog', href: '/' },
        { label: 'Acerca', href: '/acerca' },
        { label: 'Contacto', href: '/contacto' },
      ],

      // Anuncios: requiere `site`. Sin este bloque no se carga ningún script ni se genera ads.txt.
      // adsense: {
      //   client: 'ca-pub-0000000000000000',
      //   autoAds: true,
      //   slots: { inArticle: '1111111111', afterPost: '2222222222', sidebar: '3333333333' },
      // },

      // Por defecto: Privacidad y mensajes de Google, que llega con el script de AdSense. Sin `adsense`
      // no se carga ninguna CMP: si activas analytics o comments, activa también adsense o elige otra CMP.
      consent: { provider: 'google' },
      // consent: { provider: 'cookiebot', id: '00000000-0000-0000-0000-000000000000' },
      // consent: { provider: 'cookieyes', id: 'xxxxxxxxxxxxxxxxxxxxxxxx' },
      // consent: { provider: 'custom', head: '<script src="https://cmp.example.com/cmp.js"></script>', reopen: 'window.miCmp.open()' },

      // analytics: { ga4: 'G-XXXXXXXXXX' },
      // comments: { giscus: { repo: 'usuario/repo', repoId: 'R_xxx', category: 'Comentarios', categoryId: 'DIC_xxx' } },

      theme: { light: 'astroblog-light', dark: 'astroblog-dark', default: 'system' },
      // theme: { light: 'corporate', dark: 'business', default: 'light' }, // temas incluidos de daisyUI
      customCss: ['./src/styles/tema.css'],
      // components: { Header: './src/components/MiHeader.astro' },
      // routes: { terms: false },
      // slugs: { category: 'temas', tag: 'etiquetas' },
      // Silos: posts en /<categoria>/<slug>/ y cada categoría en /<categoria>/ (en vez de /blog/ y /categoria/).
      // permalinks: 'silo',
      // Señales YMYL: revisores (campo `reviewer` del post), aviso al final de cada post y tipo de JSON-LD.
      // reviewers: { luis: { name: 'Luis Gómez', jobTitle: 'Notario', url: 'https://example.com/luis' } },
      // disclaimer: 'Este contenido es informativo y no constituye asesoramiento profesional.',
      // seo: { articleType: 'Article' },
      search: true,
      contact: { email: 'contacto@astroblog-demo.pages.dev' /* , formEndpoint: 'https://formspree.io/f/xxxx' */ },
      postsPerPage: 4,
      ui: { readMore: 'Seguir leyendo' },
    }),
  ],
});
