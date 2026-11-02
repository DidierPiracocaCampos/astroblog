# astroblog

[![npm](https://img.shields.io/npm/v/@didierp/astroblog)](https://www.npmjs.com/package/@didierp/astroblog)
[![CI](https://github.com/DidierPiracocaCampos/astroblog/actions/workflows/ci.yml/badge.svg)](https://github.com/DidierPiracocaCampos/astroblog/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue)](LICENSE)
[![Astro ≥ 7.4](https://img.shields.io/badge/astro-%E2%89%A5%207.4-ff5d01)](https://astro.build)

[`@didierp/astroblog`](packages/astroblog) es una integración de [Astro](https://astro.build) que convierte un proyecto vacío en un **blog estático completo**, preparado para la revisión de **Google AdSense** y para desplegarse en **Cloudflare Pages** sin servidor ni adaptador.

*[English summary below](#english).*

## Qué incluye

- Portada paginada, posts en Markdown/MDX, categorías, etiquetas, autores, búsqueda con Pagefind y página 404.
- Páginas Acerca de, Contacto, Privacidad, Cookies, Términos y Aviso legal generadas en español o inglés.
- SEO: canónicas, Open Graph, JSON-LD (`BlogPosting`, `BreadcrumbList`, `FAQPage`…), sitemap, RSS y `robots.txt`.
- AdSense con `ads.txt`, Consent Mode v2 y CMP certificada (Google, Cookiebot, CookieYes o la tuya).
- Señales YMYL opcionales: revisores expertos, fuentes, FAQ y avisos; URLs en silo por categoría.
- Tailwind CSS 4 + daisyUI 5, tema claro/oscuro y componentes sustituibles.

## Inicio rápido

```sh
pnpm add @didierp/astroblog astro
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

export default defineConfig({
  site: 'https://miblog.com',
  integrations: [astroblog({ title: 'Mi Blog', description: 'Notas sobre desarrollo web.' })],
});
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { blogCollection, pagesCollection } from '@didierp/astroblog/content';

export const collections = {
  blog: defineCollection(blogCollection()),
  pages: defineCollection(pagesCollection()),
};
```

Escribe tus posts en `src/content/blog/` y ejecuta `astro build`. No hace falta crear nada en `src/pages/`.

**Documentación completa** (todas las opciones, frontmatter, temas, consentimiento, checklist de AdSense y despliegue): [packages/astroblog/README.md](packages/astroblog/README.md).

## Estructura del repositorio

| Ruta | Contenido |
|---|---|
| [`packages/astroblog`](packages/astroblog) | El paquete publicado en npm. |
| [`examples/demo`](examples/demo) | Blog de ejemplo que usa el paquete del workspace. |
| [`docs/`](docs) | Especificaciones y planes de diseño de cada versión. |

## Desarrollo

Requisitos: Node ≥ 22.23.4 y pnpm 11 (`corepack enable` usa la versión de `packageManager`).

```sh
pnpm install             # dependencias de todo el workspace
pnpm test                # tests unitarios y de build del paquete
pnpm build:demo          # build del demo (examples/demo/dist)
pnpm --filter demo dev   # servidor de desarrollo del demo
```

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un PR. Para reportar una vulnerabilidad, sigue [SECURITY.md](SECURITY.md).

## English

`@didierp/astroblog` is an Astro integration that turns an empty project into a complete static blog: paginated home, posts, categories, tags, authors, Pagefind search, legal pages (privacy, cookies, terms) in Spanish or English, SEO metadata and JSON-LD, sitemap and RSS, and AdSense with Consent Mode v2 and a certified CMP. Output is fully static and ready for Cloudflare Pages.

Install it with `pnpm add @didierp/astroblog astro`, add it to `integrations` and set `lang: 'en'` for English UI, URLs and legal templates. The quick start above applies as is. The full documentation is currently in Spanish: [packages/astroblog/README.md](packages/astroblog/README.md). Issues and pull requests in English are welcome.

## Licencia

[MIT](LICENSE) © 2026 Didier Estiben Piracoca Campos.

Las plantillas legales que genera el paquete son orientativas y **no constituyen asesoría legal**. Ver el [aviso](packages/astroblog/README.md#aviso-legal-sobre-las-plantillas).
