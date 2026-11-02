# @didierp/astroblog

Integración de [Astro](https://astro.build) que convierte un proyecto vacío en un **blog estático completo**, preparado para la revisión de **Google AdSense** y para desplegarse en **Cloudflare Pages** sin servidor ni adaptador.

Tú escribes la configuración y los posts en Markdown/MDX; la integración pone el resto:

- Portada paginada, posts, categorías, etiquetas, autores, búsqueda (Pagefind) y página 404.
- Páginas institucionales y legales (Acerca de, Contacto, Privacidad, Cookies, Términos, Aviso legal) en español o inglés.
- SEO: canónicas, Open Graph, Twitter cards, JSON-LD (`WebSite`, `BlogPosting`, `BreadcrumbList`), `sitemap-index.xml`, `rss.xml` y `robots.txt`.
- AdSense: script, `ads.txt`, anuncio dentro del artículo y tras el post, con Consent Mode v2 y una CMP certificada (Google Privacidad y mensajes por defecto; Cookiebot, CookieYes o la tuya).
- Estilos con Tailwind CSS 4 + daisyUI 5, temas claro/oscuro y personalización con variables CSS.
- `_headers` para Cloudflare Pages (caché de recursos y cabeceras de seguridad).

Requisitos: **Astro ≥ 7.4**, **Node ≥ 22.23.4**. Salida siempre estática (`output: 'static'`).

> Hay un sitio de ejemplo completo en [`examples/demo`](https://github.com/DidierPiracocaCampos/astroblog/tree/main/examples/demo) del repositorio.

## Índice

- [Instalación](#instalación)
- [Configuración](#configuración)
- [Rutas generadas](#rutas-generadas)
- [Contenido (frontmatter)](#contenido-frontmatter)
- [Personalizar el tema](#personalizar-el-tema)
- [Sustituir componentes](#sustituir-componentes)
- [Consentimiento](#consentimiento)
- [Checklist AdSense](#checklist-adsense)
- [Despliegue en Cloudflare Pages](#despliegue-en-cloudflare-pages)
- [Aviso legal sobre las plantillas](#aviso-legal-sobre-las-plantillas)
- [Desarrollo](#desarrollo)
- [Licencia](#licencia)

## Instalación

```sh
pnpm add @didierp/astroblog astro
# o: npm install @didierp/astroblog astro
```

`astro` es dependencia *peer* (`^7.4.0`). La integración añade por su cuenta `@astrojs/mdx`, `@astrojs/sitemap` (si no los tienes ya en `integrations`), `@tailwindcss/vite`, `@astrojs/rss` y Pagefind; no hace falta instalarlos ni configurarlos.

**1. `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

export default defineConfig({
  site: 'https://miblog.com',
  integrations: [
    astroblog({
      title: 'Mi Blog',
      description: 'Notas sobre desarrollo web.',
      author: { name: 'Ana Pérez' },
      owner: { name: 'Ana Pérez', country: 'España', email: 'legal@miblog.com' },
      contact: { email: 'contacto@miblog.com' },
    }),
  ],
});
```

**2. `src/content.config.ts`** — las colecciones deben llamarse `blog` y `pages`:

```ts
import { defineCollection } from 'astro:content';
import { blogCollection, pagesCollection } from '@didierp/astroblog/content';

export const collections = {
  blog: defineCollection(blogCollection()),
  pages: defineCollection(pagesCollection()),
};
```

`blogCollection()` lee `src/content/blog/**/*.{md,mdx}` y `pagesCollection()` lee `src/content/pages/**/*.{md,mdx}`; ambas aceptan `{ base: './otra/carpeta' }`.

**3. Escribe un post** en `src/content/blog/hola-mundo.md` (ver [frontmatter](#contenido-frontmatter)) y ejecuta `astro build`. No necesitas crear nada en `src/pages/`.

Sin `site` el blog se genera igualmente, pero **sin** canónicas, `og:url`, JSON-LD de `WebSite`, `rss.xml` ni línea `Sitemap:` en `robots.txt` (todo eso exige URLs absolutas). `site` es **obligatorio** si usas `adsense`.

## Configuración

Todas las opciones se validan al iniciar Astro (`astro:config:setup`). Los errores indican la ruta del campo y se escriben en el idioma de `lang`.

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `title` | `string` | — (obligatorio) | Nombre del sitio: cabecera, `<title>`, JSON-LD, RSS. |
| `description` | `string` | — (obligatorio) | Descripción del sitio (portada, RSS, JSON-LD). |
| `lang` | `'es' \| 'en'` | `'es'` | Idioma de los textos UI, las plantillas legales, los segmentos de URL y los mensajes de error. |
| `logo` | `string` | — | Ruta **pública** del logo (p. ej. `'/logo.svg'` en `public/`), mostrado junto al título y usado en el JSON-LD. |
| `author` | `{ name: string; email?: string; url?: string; avatar?: string; bio?: string; jobTitle?: string; sameAs?: string[] }` | — | Autor por defecto de los posts. `avatar` es una ruta pública. `jobTitle` y `bio` se muestran en la ficha del autor y en `/acerca/`; `jobTitle` y `sameAs` (perfiles externos) van al JSON-LD del post. Si ni la config ni el post definen autor, el JSON-LD atribuye el post (autor y *publisher*) a una `Organization` con el `title` del sitio. |
| `reviewers` | `Record<string, { name: string; jobTitle?: string; url?: string; bio?: string; avatar?: string }>` | — | Revisores expertos (YMYL), referenciados por su clave desde el campo `reviewer` del post. Si tienen `url`, el nombre enlaza a ella. |
| `disclaimer` | `string` | — | Aviso que se muestra al final de cada post (p. ej. «no constituye asesoramiento financiero»). |
| `seo.articleType` | `'BlogPosting' \| 'Article'` | `'BlogPosting'` | Tipo schema.org del JSON-LD de los posts. |
| `permalinks` | `'blog' \| 'silo'` | `'blog'` | `silo` publica los posts en `/<categoria>/<slug>/` y cada categoría en `/<categoria>/`. Ver [Silos](#silos). |
| `owner` | `{ name: string; country?: string; email?: string }` | — | Titular del sitio para las páginas legales, el copyright y el *publisher* del JSON-LD de los posts con autor. |
| `social` | `Record<string, string>` | — | Enlaces sociales del pie: la clave es el texto del enlace y el valor la URL (`{ github: 'https://…' }`). |
| `nav` | `{ label: string; href: string }[]` | `[]` | Menú principal. `href` relativo a la raíz del sitio (se le añade `base` y la barra final). |
| `adsense` | objeto (ver abajo) | — | Sin él no se carga ningún script de anuncios, no se genera `ads.txt` y `AdSlot` no pinta nada. Requiere `site`. |
| `adsense.client` | `string` (`ca-pub-` + dígitos) | — (obligatorio) | ID de editor de AdSense. |
| `adsense.autoAds` | `boolean` | `true` | Aceptado por compatibilidad: el script de AdSense se carga siempre que haya `adsense`; los anuncios automáticos se activan o desactivan en el panel de AdSense. |
| `adsense.slots.inArticle` | `string` | — | Bloque insertado automáticamente tras el **segundo `h2`** de cada post (nunca en `src/content/pages/`). |
| `adsense.slots.afterPost` | `string` | — | Bloque al final de cada post. |
| `adsense.slots.sidebar` | `string` | — | Aceptado pero no se coloca automáticamente; úsalo con `<AdSlot>` en un componente propio. |
| `consent` | `{ provider: 'google' }` \| `{ provider: 'cookiebot', id }` \| `{ provider: 'cookieyes', id }` \| `{ provider: 'custom', head, reopen }` | `{ provider: 'google' }` | CMP certificada. Ver [Consentimiento](#consentimiento). |
| `analytics.ga4` | `string` | — | ID de medición de Google Analytics 4 (`G-XXXX`). Se carga bajo Consent Mode v2. |
| `comments.giscus` | `{ repo, repoId, category, categoryId }` (todos `string`) | — | Comentarios con [Giscus](https://giscus.app), cargados solo tras el consentimiento de la categoría *preferencias*. |
| `theme.light` | `string` | `'astroblog-light'` | Tema claro: el propio o cualquier tema incluido en daisyUI (`'corporate'`, `'nord'`…). |
| `theme.dark` | `string` | `'astroblog-dark'` | Tema oscuro: el propio o cualquier tema incluido en daisyUI (`'business'`, `'dim'`…). |
| `theme.default` | `'system' \| 'light' \| 'dark'` | `'system'` | Tema inicial si el visitante no ha elegido; `system` respeta `prefers-color-scheme`. |
| `customCss` | `string[]` | `[]` | Hojas CSS propias (rutas relativas a la raíz del proyecto), importadas al final. Error claro si no existen. |
| `components` | `Partial<Record<Componente, string>>` | — | Sustituye componentes por los tuyos (ruta relativa a la raíz). Ver [Sustituir componentes](#sustituir-componentes). |
| `routes` | `Partial<Record<Ruta, boolean>>` | todas activas | `false` desactiva una ruta inyectada. Ver [Rutas generadas](#rutas-generadas). |
| `slugs` | `Partial<Record<'category' \| 'tag' \| 'author' \| 'page' \| 'about' \| 'contact' \| 'privacy' \| 'cookies' \| 'terms' \| 'legal' \| 'search', string>>` | según `lang` | Sobrescribe segmentos de URL, p. ej. `{ category: 'temas' }` → `/temas/<categoria>/`. |
| `search` | `boolean` | `true` | Búsqueda con Pagefind (botón en la cabecera, página de búsqueda e índice generado tras el build). |
| `contact` | `{ email?: string; formEndpoint?: string }` | — | Correo de contacto y, opcionalmente, un endpoint de formulario (Formspree, Getform…) que recibe un `POST`. |
| `postsPerPage` | `number` (entero > 0) | `10` | Posts por página en la portada, categorías y etiquetas. |
| `ui` | `Partial<Record<ClaveUI, string>>` | — | Sobrescribe textos de la interfaz (claves abajo). Las claves desconocidas se ignoran. |

### Validación

**Errores** (detienen el build):

- `adsense` sin `site` en la config de Astro.
- `adsense.client` sin el formato `ca-pub-<dígitos>`.
- `consent.provider` `cookiebot`/`cookieyes` sin `id`; `custom` sin `head` o sin `reopen`.
- Claves desconocidas en `components` o `routes`, tipos incorrectos o campos obligatorios ausentes.
- Un `components.<Clave>` o un `customCss` que apunta a un archivo inexistente (el mensaje nombra la clave y la ruta).

**Avisos** (no bloquean):

- No hay posts publicados (la portada muestra un estado vacío).
- `routes` desactiva una página que AdSense espera (`about`, `contact`, `privacy`, `cookies`), o `adsense` está activo con `routes.privacy: false`.
- `consent.provider: 'google'` (el valor por defecto) sin `adsense`, con `analytics.ga4` o `comments.giscus`: no se carga ninguna CMP (ver [Consentimiento](#consentimiento)).
- Un post con título de más de 70 caracteres o descripción fuera de 50–160.
- Una página tuya en `src/pages/` coincide con una ruta inyectada (desactiva la nuestra con `routes.<clave>: false`).
- El procesador Markdown activo no admite plugins (el anuncio `inArticle` no se insertará).

### Textos de la interfaz (`ui`)

Claves disponibles (valores por defecto en español):

| Clave | `es` | Clave | `es` |
|---|---|---|---|
| `readMore` | Leer más | `notFoundTitle` | Página no encontrada |
| `readingTime` | `{n} min de lectura` | `notFoundBody` | La página que buscas no existe o ha sido movida. |
| `categories` | Categorías | `backHome` | Volver al inicio |
| `tags` | Etiquetas | `emptyBlog` | Todavía no hay artículos publicados. |
| `author` | Autor | `publishedOn` | Publicado el |
| `reviewedBy` | Revisado por | `faqTitle` | Preguntas frecuentes |
| `sourcesTitle` | Fuentes | `disclaimerTitle` | Aviso |
| `search` | Buscar | `updatedOn` | Actualizado el |
| `searchPlaceholder` | Buscar en el blog… | `advertisement` | Publicidad |
| `noResults` | No se encontraron resultados | `contactFormName` | Nombre |
| `toc` | Contenido | `contactFormEmail` | Correo electrónico |
| `related` | Artículos relacionados | `contactFormMessage` | Mensaje |
| `share` | Compartir | `contactFormSend` | Enviar |
| `copyLink` | Copiar enlace | `home` | Inicio |
| `linkCopied` | Enlace copiado | `about` | Acerca de |
| `previous` | Anterior | `contact` | Contacto |
| `next` | Siguiente | `privacy` | Política de privacidad |
| `page` | Página | `cookies` | Política de cookies |
| `cookieSettings` | Configuración de cookies | `terms` | Términos y condiciones |
| `consentRequired` | Este contenido requiere tu consentimiento de cookies. | `legal` | Aviso legal |
| `manageCookies` | Gestionar cookies | `menu` | Menú |
| `themeToggle` | Cambiar tema | `close` | Cerrar |
| | | `breadcrumbs` | Ruta de navegación |
| | | `copyright` | `© {year} {name}` |

`{n}`, `{year}` y `{name}` se sustituyen en tiempo de build.

## Rutas generadas

Todas las páginas usan **barra final** (`/acerca/`, `/blog/mi-post/`), igual que las canónicas y el sitemap. Cada ruta se puede desactivar con `routes.<clave>: false`.

| Clave | `lang: 'es'` | `lang: 'en'` | Notas |
|---|---|---|---|
| `home` | `/`, `/pagina/<n>/` | `/`, `/page/<n>/` | Portada paginada. |
| `post` | `/blog/<id>/` | `/blog/<id>/` | `<id>` = ruta del archivo sin extensión. |
| `category` | `/categoria/<cat>/` (+ `/<n>/`) | `/category/<cat>/` | Slug sin tildes ni mayúsculas: «Programación Web» → `programacion-web`. |
| `tag` | `/etiqueta/<tag>/` (+ `/<n>/`) | `/tag/<tag>/` | |
| `author` | `/autor/<autor>/` | `/author/<author>/` | |
| `about` | `/acerca/` | `/about/` | |
| `contact` | `/contacto/` | `/contact/` | |
| `privacy` | `/privacidad/` | `/privacy/` | |
| `cookies` | `/cookies/` | `/cookies/` | |
| `terms` | `/terminos/` | `/terms/` | |
| `legal` | `/aviso-legal/` | `/legal-notice/` | |
| `search` | `/buscar/` | `/search/` | Solo con `search: true`. |
| `notFound` | `/404` | `/404` | Generada como `404.html`. |
| `rss` | `/rss.xml` | `/rss.xml` | Solo con `site`. |
| `robots` | `/robots.txt` | `/robots.txt` | `Sitemap:` solo con `site`. |
| `adsTxt` | `/ads.txt` | `/ads.txt` | Solo con `adsense`, y solo si no tienes ya un `public/ads.txt` (el tuyo prevalece). |

Además se generan `sitemap-index.xml` (`@astrojs/sitemap`), `pagefind/` (si `search`) y `_headers`.

### Silos

Con `permalinks: 'silo'` la URL la decide la `category` del post, no la carpeta del archivo (`src/content/blog/requisitos/edad.md` y `src/content/blog/edad.md` con `category: Requisitos` acaban ambos en `/requisitos/edad/`):

| Página | URL |
|---|---|
| Listado de la categoría | `/<categoria>/` |
| Página *n* (n ≥ 2) del listado | `/<categoria>/pagina/<n>/` (`/page/<n>/` en inglés, o el valor de `slugs.page`) |
| Post | `/<categoria>/<slug>/` (`<slug>` = nombre del archivo) |

Nada se publica en `/blog/` ni en `/categoria/`; tarjetas, migas, canónicas, RSS y sitemap usan estas URLs. `routes.post` y `routes.category` se ignoran (con un aviso). Las páginas de `src/pages/` tienen prioridad sobre las del silo.

El build falla con un mensaje claro si una categoría produce un slug reservado (`acerca`, `contacto`, `privacidad`, `cookies`, `terminos`, `aviso-legal`, `buscar`, `etiqueta`, `autor`, `pagina`, `404` o lo que pongas en `slugs`) o ninguno (`"???"`), si dos posts producen la misma URL o si el slug de un post es `pagina`.

## Contenido (frontmatter)

### Posts (`src/content/blog/*.md` o `.mdx`)

```md
---
title: Guía práctica de Core Web Vitals
description: Qué miden LCP, INP y CLS y cómo mejorarlos en un blog estático.
pubDate: 2026-09-18
updatedDate: 2026-10-02
category: Rendimiento
tags: [core web vitals, lighthouse]
cover: ../../assets/portada.png
coverAlt: Degradado de colores que representa la velocidad
---
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `title` | `string` | sí | Recomendado ≤ 70 caracteres (aviso). |
| `description` | `string` | sí | Recomendado 50–160 caracteres (aviso). |
| `pubDate` | fecha | sí | |
| `updatedDate` | fecha | no | |
| `cover` | imagen (ruta relativa al post) | no | Optimizada con `astro:assets`. |
| `coverAlt` | `string` | sí si hay `cover` | |
| `author` | `string` | no | Por defecto `author.name` de la config. |
| `category` | `string` | sí | |
| `tags` | `string[]` | no | Por defecto `[]`. |
| `draft` | `boolean` | no | Por defecto `false`. Los borradores solo se ven en `astro dev`. |
| `noAds` | `boolean` | no | Por defecto `false`. Quita los anuncios `inArticle` y `afterPost` de ese post. |
| `reviewer` | `string` | no | Clave de `reviewers` en la config (error de build si no existe). Muestra «Revisado por…» en la cabecera y una ficha tras el contenido, y emite `reviewedBy` en el JSON-LD. |
| `reviewedDate` | fecha | no | Fecha de la revisión (`lastReviewed` en el JSON-LD). |
| `faq` | `{ q: string; a: string }[]` | no | Preguntas frecuentes tras el contenido (desplegables accesibles sin JavaScript) y JSON-LD `FAQPage`. `a` admite Markdown en línea: `**negrita**`, `*cursiva*`, `` `código` `` y `[enlaces](https://…)`; el HTML se escapa. |
| `sources` | `{ title: string; url: string }[]` | no | Fuentes consultadas, enlazadas con `rel="nofollow noopener"` en una pestaña nueva. |

```yaml
reviewer: luis
reviewedDate: 2026-10-20
faq:
  - q: ¿Hasta qué edad se puede firmar una hipoteca?
    a: La mayoría de bancos exige terminar de pagar antes de los **75 años**.
sources:
  - title: Portal del Cliente Bancario
    url: https://clientebancario.bde.es
```

Tras el contenido se muestran, en este orden: FAQ, fuentes, revisor y `disclaimer`; después, la ficha del autor, los enlaces para compartir, los relacionados y los comentarios.

Si el título o la descripción contienen `:`, ponlos entre comillas (es YAML). El índice de contenidos aparece cuando el post tiene al menos 3 encabezados `h2`/`h3`.

### Páginas (`src/content/pages/*.md`)

Un archivo cuyo nombre coincide con el **segmento de la ruta** sustituye la plantilla correspondiente: con `lang: 'es'`, `acerca.md`, `contacto.md`, `privacidad.md`, `cookies.md`, `terminos.md` y `aviso-legal.md`; con `lang: 'en'`, `about.md`, `contact.md`, `privacy.md`, `cookies.md`, `terms.md` y `legal-notice.md` (o el valor que pongas en `slugs`).

| Campo | Tipo | Obligatorio |
|---|---|---|
| `title` | `string` | sí |
| `description` | `string` | no |
| `updatedDate` | fecha | no (se muestra como «Actualizado el…») |

En estas páginas nunca se inserta el anuncio dentro del artículo.

### Anuncio dentro del artículo

Astro 7 procesa Markdown/MDX con **Sätteri** por defecto; la integración registra su plugin en Sätteri o, si configuraste `markdown.processor` con unified, como plugin rehype. El bloque `slots.inArticle` se coloca justo después del segundo `h2` de nivel superior; si el post tiene menos de dos `h2`, no se inserta.

## Personalizar el tema

Los temas activos se generan según `theme.light` y `theme.dark`:

- `astroblog-light` / `astroblog-dark` (por defecto): temas propios, emitidos solo cuando están seleccionados.
- Cualquier tema incluido en daisyUI: `theme: { light: 'corporate', dark: 'business' }`.

`customCss` se importa al final de la hoja generada, dentro del mismo contexto de Tailwind: tus variables tienen prioridad y puedes usar `@plugin "daisyui/theme"` o clases de Tailwind.

```js
// astro.config.mjs
astroblog({ /* … */ customCss: ['./src/styles/tema.css'] })
```

```css
/* src/styles/tema.css */
[data-theme="astroblog-light"] {
  --color-primary: oklch(60% 0.2 250);
  --radius-box: 0.5rem;
}
```

El selector usa el nombre del tema activo (`[data-theme="corporate"]` si usas ese). Variables útiles de daisyUI: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-base-100`…`--color-base-content`, `--radius-box`, `--radius-field`, `--radius-selector`. El contenido de los posts usa `prose` (`@tailwindcss/typography`) enlazado a esas variables.

El selector de tema (`ThemeToggle`) alterna claro/oscuro, guarda la elección en `localStorage` (`astroblog-theme`) y un script en `<head>` la aplica antes de pintar, sin parpadeo.

## Sustituir componentes

```js
astroblog({
  components: { Header: './src/components/MiHeader.astro' },
})
```

La ruta es relativa a la raíz del proyecto. Tu componente recibe **exactamente las mismas props** que el original:

| Clave | Props |
|---|---|
| `Header` | `currentPath: string` (pathname actual, incluido `base`) |
| `Footer` | — |
| `ThemeToggle` | `class?: string` |
| `Search` | — (diálogo de búsqueda; se abre con cualquier elemento `[data-astroblog-search-open]`, con `/` o con Ctrl/Cmd+K) |
| `PostCard` | `post: CollectionEntry<'blog'>`, `headingLevel?: 2 \| 3` |
| `PostHeader` | `post: CollectionEntry<'blog'>` |
| `TableOfContents` | `headings: MarkdownHeading[]` (solo `h2`/`h3`) |
| `RelatedPosts` | `posts: CollectionEntry<'blog'>[]` |
| `ShareLinks` | `url: string`, `title: string` |
| `AuthorBox` | `name: string`, `href?: string`, `url?: string`, `avatar?: string` |
| `Breadcrumbs` | `items: { name: string; href: string }[]` (`href` relativo a `base`) |
| `Pagination` | `currentPage: number`, `urls: string[]` |
| `Comments` | — |
| `Faq` | `items: { q: string; a: string }[]` |
| `Sources` | `items: { title: string; url: string }[]` |
| `ReviewedBy` | `reviewer: { name: string; jobTitle?: string; url?: string; bio?: string; avatar?: string }`, `date?: Date` |

`AuthorBox` recibe además `jobTitle?: string` y `bio?: string`.

Desde tus componentes puedes importar la configuración resuelta y los textos (los tipos se inyectan automáticamente):

```astro
---
import config from 'virtual:astroblog/config';
import ui from 'virtual:astroblog/ui';
import routes from 'virtual:astroblog/routes'; // routes.paths.about === '/acerca/'
import { ThemeToggle } from '@didierp/astroblog/components';

export interface Props { currentPath: string }

// `routes.paths` son relativas a `base`: antepón import.meta.env.BASE_URL para que los enlaces
// funcionen también con `base: '/blog'`.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const href = (path: string) => `${base}${path}`;
---
<header class="navbar">
  <a href={href('/')}>{config.title}</a>
  {routes.paths.about && <a href={href(routes.paths.about)}>{ui.about}</a>}
  <ThemeToggle />
</header>
```

`@didierp/astroblog/components` exporta todos los componentes originales (para envolverlos o reutilizarlos) y los de sistema, que no se pueden sustituir: `Head`, `ConsentManager`, `ConsentGate` (prop `category: 'marketing' | 'statistics' | 'preferences'`), `CookieSettingsLink` (prop `class?`) y `AdSlot` (props `slot?`, `format?: 'auto' | 'fluid' | 'rectangle'`, `layout?`, `minHeight?` en px; no pinta nada sin `adsense` o sin `slot`, y en `astro dev` muestra un marcador «Publicidad»).

Para reemplazar una página entera, crea tu página en `src/pages/` y desactiva la inyectada con `routes.<clave>: false` (si no lo haces, verás un aviso de colisión).

### Páginas propias con layouts

`@didierp/astroblog/layouts` exporta `BaseLayout` (cabecera, pie, búsqueda, `<head>` con SEO y JSON-LD) y `PageLayout` (lo mismo con un artículo `prose` y el título como `<h1>`), para crear páginas con el aspecto del sitio: una portada a medida, una metodología o una calculadora.

| Prop | Tipo | Notas |
|---|---|---|
| `title` | `string` | Obligatoria. `<title>` y `og:title`. |
| `description` | `string` | Obligatoria. |
| `image` | `string` | Imagen OG (ruta pública o URL absoluta). |
| `type` | `'website' \| 'article'` | Por defecto `website`. |
| `breadcrumbs` | `{ name: string; href: string }[]` | Migas y JSON-LD `BreadcrumbList`; `href` relativo a `base`. |
| `jsonLd` | `object[]` | JSON-LD adicional. |
| `noindex` | `boolean` | Añade `noindex`. |
| `noAds` | `boolean` | El layout no inserta anuncios propios: la página coloca sus `AdSlot` donde quiera. |
| `updatedDate` | `Date` | Solo `PageLayout`: «Actualizado el…» bajo el título. |

Portada propia: desactiva la inyectada y crea `src/pages/index.astro`:

```astro
---
// astro.config.mjs: astroblog({ ..., routes: { home: false } })
import { BaseLayout } from '@didierp/astroblog/layouts';
---
<BaseLayout title="Hipotecas Claras" description="Guías de hipotecas revisadas por expertos.">
  <h1>Elige tu guía</h1>
</BaseLayout>
```

## Consentimiento

En todas las páginas, antes de cualquier script de terceros, se emite el **Consent Mode v2** por defecto:

```js
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'denied', wait_for_update: 500,
});
```

Orden del `<head>`: meta → Open Graph/Twitter/JSON-LD → script de tema → consentimiento por defecto → CMP → AdSense → GA4 → CSS. GA4 se carga en modo Consent Mode v2: antes del consentimiento puede enviar pings sin cookies; tras aceptar, la CMP actualiza el estado.

El enlace **«Configuración de cookies»** (`CookieSettingsLink`, en el pie y en la política de cookies) reabre las preferencias de la CMP. `ConsentGate` bloquea contenido de terceros (Giscus usa la categoría `preferences`) hasta que hay consentimiento.

### Google Privacidad y mensajes (por defecto, gratuito, TCF v2.2)

```js
consent: { provider: 'google' } // o simplemente omite `consent`
```

No se añade ningún script: el mensaje lo sirve el propio tag de AdSense.

> **Sin `adsense` no hay CMP.** La plataforma de Google solo llega con el script de AdSense. Si usas `provider: 'google'` sin `adsense`, no se carga ninguna CMP: GA4 se queda con el consentimiento denegado, `ConsentGate` (Giscus) no se desbloquea, se ocultan «Configuración de cookies» y el botón «Gestionar cookies», y las políticas de privacidad y cookies indican que no hay plataforma de gestión del consentimiento. Si además tienes `analytics.ga4` o `comments.giscus`, el build muestra un aviso: configura `adsense` o usa `cookiebot`, `cookieyes` o `custom`.

1. Entra en [AdSense](https://adsense.google.com) → **Privacidad y mensajes**.
2. En **Mensajes del RGPD (Europa)**, pulsa **Crear mensaje**, elige tu sitio y el idioma.
3. Activa las opciones **Consentir**, **No consentir** y **Gestionar opciones** (requerido por TCF v2.2). Añade el enlace a tu política de privacidad (`https://tusitio.com/privacidad/`).
4. Revisa el estilo y pulsa **Publicar**.
5. Opcional: crea también los mensajes de **Regulaciones de estados de EE. UU.** y otros que te pida el panel.
6. Publica el sitio y comprueba en una ventana de incógnito (desde la UE o con VPN) que aparece el mensaje y que «Configuración de cookies» lo vuelve a abrir (`googlefc.showRevocationMessage`).

### Cookiebot

```js
consent: { provider: 'cookiebot', id: 'TU-DOMAIN-GROUP-ID' }
```

1. Crea una cuenta en [Cookiebot](https://www.cookiebot.com), añade tu dominio y copia el **Domain Group ID**.
2. Ponlo en `id`. Se inserta `https://consent.cookiebot.com/uc.js` con `data-cbid` y `data-blockingmode="auto"`.
3. En el panel de Cookiebot activa **Google Consent Mode** y el **marco IAB TCF v2.2** (necesario para AdSense en el EEE).
4. «Configuración de cookies» llama a `Cookiebot.renew()`.

### CookieYes

```js
consent: { provider: 'cookieyes', id: 'TU-ID-DE-CLIENTE' }
```

1. Crea una cuenta en [CookieYes](https://www.cookieyes.com) y añade tu sitio.
2. Copia el identificador de la URL del script (`https://cdn-cookieyes.com/client_data/<id>/script.js`) y ponlo en `id`.
3. En el panel activa **Google Consent Mode (GCM)** y, si muestras anuncios en el EEE, **IAB TCF v2.2**.
4. «Configuración de cookies» llama a `revisitCkyConsent()`.

Categorías: `marketing` → `advertisement`, `statistics` → `analytics`, `preferences` → `functional`.

### CMP propia (`custom`)

```js
consent: {
  provider: 'custom',
  head: '<script src="https://cmp.ejemplo.com/cmp.js"></script>', // HTML insertado tal cual en <head>
  reopen: "window.miCmp.open()",                                  // JS de «Configuración de cookies»
}
```

`reopen` se coloca en el atributo `onclick` del botón (Astro escapa el valor, así que puedes usar cualquier tipo de comillas). Tu CMP debe actualizar Consent Mode (`gtag('consent', 'update', …)`) y, para desbloquear `ConsentGate`, comunicar las categorías concedidas (`marketing`, `statistics`, `preferences`) de una de estas formas (o ambas):

```js
// Al cargar, si ya había consentimiento:
window.__astroblogConsent = ['preferences', 'statistics'];

// Cada vez que el usuario acepta:
window.dispatchEvent(new CustomEvent('astroblog:consent', {
  detail: { categories: ['marketing', 'statistics', 'preferences'] },
}));
```

## Checklist AdSense

Antes de solicitar la revisión:

- [ ] `site` apunta a tu dominio definitivo (el que darás de alta en AdSense) y `adsense.client` es tu `ca-pub-…`.
- [ ] Hay contenido original suficiente: varios posts publicados (sin `draft`), con texto propio y útil.
- [ ] Páginas **Acerca de**, **Contacto**, **Privacidad** y **Cookies** activas (no las desactives con `routes`) y revisadas; idealmente sustituidas o completadas con `src/content/pages/`.
- [ ] `owner` y `contact.email` rellenos: aparecen en las páginas legales y de contacto.
- [ ] Navegación clara: `nav` con enlaces a las secciones principales; el pie enlaza las páginas legales.
- [ ] `https://tusitio.com/ads.txt` responde con `google.com, pub-…, DIRECT, f08c47fec0942fa0`.
- [ ] `sitemap-index.xml` y `robots.txt` accesibles; sitemap enviado en Google Search Console.
- [ ] Mensaje de consentimiento publicado en **Privacidad y mensajes** (o CMP certificada configurada) y el enlace «Configuración de cookies» funciona.
- [ ] Sitio servido por HTTPS, sin páginas rotas (la 404 propia está activa).
- [ ] Lighthouse: SEO 100 y buen rendimiento en móvil.

## Despliegue en Cloudflare Pages

El build es 100 % estático: no hace falta adaptador.

1. En Cloudflare → **Workers y Pages** → **Crear** → **Pages** → conecta tu repositorio.
2. Configuración de build (para el demo de este monorepo):
   - **Comando de build:** `pnpm --filter demo build`
   - **Directorio de salida:** `examples/demo/dist`
   - **Variable de entorno:** `NODE_VERSION=22`
3. En un proyecto propio de un solo paquete: comando `pnpm build` (o `npm run build`) y salida `dist`.

Tras el build, la integración escribe `dist/_headers`:

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/pagefind/*
  Cache-Control: public, max-age=3600
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Si tienes un `public/_headers`, se **fusiona**: por ruta, tus cabeceras sustituyen a las nuestras con el mismo nombre y tus rutas adicionales se conservan. Igualmente, un `public/ads.txt` propio prevalece sobre el generado.

La búsqueda (Pagefind) se indexa en `astro:build:done`, así que en `astro dev` el índice `pagefind/` no existe y el buscador no funciona: pruébalo con `astro build && astro preview`.

## Aviso legal sobre las plantillas

Las páginas de Privacidad, Cookies, Términos y Aviso legal se generan a partir de **plantillas orientativas** que se rellenan con tu configuración (`owner`, `site`, correos, servicios activos como AdSense, GA4 o Giscus, y la CMP elegida). La fecha de «última actualización» es la fecha del build.

**No constituyen asesoría legal.** Cada sitio, país y actividad tiene obligaciones distintas (RGPD, LSSI-CE, leyes locales). Revisa los textos con un profesional y, si hace falta, sustitúyelos por los tuyos con `src/content/pages/<segmento>.md`. Este aviso figura solo en la documentación, no en el sitio generado.

## Desarrollo

Desarrollo en el monorepo: `pnpm install`, `pnpm test` (unitarios y builds de fixtures), `pnpm build:demo`. Cada cambio publicable lleva un changeset (`pnpm changeset`); la publicación en npm se hace desde `main` con GitHub Actions. Ver [CONTRIBUTING.md](https://github.com/DidierPiracocaCampos/astroblog/blob/main/CONTRIBUTING.md).

## Licencia

[MIT](https://github.com/DidierPiracocaCampos/astroblog/blob/main/LICENSE) © 2026 Didier Estiben Piracoca Campos.
