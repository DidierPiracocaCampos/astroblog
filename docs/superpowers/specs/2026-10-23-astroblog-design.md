# @didierp/astroblog — Diseño

Fecha: 2026-10-23
Estado: borrador para revisión

## 1. Objetivo

Librería npm (`@didierp/astroblog`) que, instalada como integración de Astro, convierte un proyecto vacío en un blog completo, estático y preparado para ser aprobado por Google AdSense. El usuario solo escribe configuración y posts en Markdown/MDX. Estilos con daisyUI, totalmente personalizables mediante variables CSS.

### Criterios de éxito

- Un proyecto nuevo con `astro.config.mjs` + `content.config.ts` + posts `.md` produce un blog completo con `astro build`.
- El sitio generado incluye todo lo que AdSense revisa: páginas legales, Acerca de, Contacto, navegación clara, `ads.txt`, sitemap, consentimiento certificado.
- Despliegue estático en Cloudflare Pages sin adaptador ni servidor.
- El usuario puede cambiar colores/tipografía/radios redefiniendo variables de daisyUI en su propio CSS.
- El usuario puede sustituir cualquier componente principal o desactivar cualquier ruta inyectada.
- Lighthouse del demo: SEO 100, Rendimiento ≥ 95.

### Decisiones tomadas

| Tema | Decisión |
|---|---|
| Forma de distribución | Paquete npm / integración de Astro (patrón tipo Starlight) |
| Consentimiento | CMP de terceros certificada vía adaptador; **Google Privacidad y mensajes** por defecto (gratis, TCF v2.2); presets `cookiebot`, `cookieyes`, `custom` |
| Despliegue | Cloudflare Pages, `output: 'static'` |
| Idioma | Textos UI en `es` y `en`, un idioma por sitio, textos sobrescribibles. Sin i18n multi-idioma de contenido (posible a futuro) |
| Tema | Temas propios `astroblog-light`/`astroblog-dark` + cualquier tema incluido de daisyUI + `customCss` del usuario |
| Búsqueda | Pagefind, activado por defecto |
| Repositorio | Monorepo pnpm: `packages/astroblog` + `examples/demo` |

### Fuera de alcance (v1)

- Contenido multi-idioma (`/es/`, `/en/`, `hreflang`).
- SSR / adaptadores de servidor.
- Newsletter, series de posts.
- Banner de consentimiento propio (se delega en CMP certificada).
- Asesoría legal: las plantillas legales son un punto de partida, no un sustituto de revisión profesional.

## 2. Estructura del repositorio

```
astroblog/
├─ package.json                 # scripts raíz (test, build, lint)
├─ pnpm-workspace.yaml          # packages/*, examples/*
├─ .changeset/
├─ .github/workflows/ci.yml
├─ packages/astroblog/
│  ├─ package.json              # name: @didierp/astroblog, exports
│  ├─ index.ts                  # export default astroblog(userConfig)
│  ├─ schema.ts                 # Zod: config de usuario → config resuelta
│  ├─ content.ts                # blogCollection(), pagesCollection()
│  ├─ virtual.d.ts              # tipos de módulos virtuales
│  ├─ i18n/es.ts, i18n/en.ts, i18n/index.ts
│  ├─ styles/global.css
│  ├─ components/               # ver §5
│  ├─ layouts/                  # BaseLayout, PostLayout, PageLayout, LegalLayout
│  ├─ routes/                   # páginas inyectadas (ver §4)
│  ├─ legal/                    # plantillas legales es/en
│  ├─ lib/                      # posts, paginación, readingTime, related, jsonld, headers, adsTxt, robots
│  └─ test/
└─ examples/demo/
   ├─ astro.config.mjs
   ├─ src/content.config.ts
   ├─ src/content/blog/*.md
   ├─ src/styles/tema.css       # ejemplo de personalización
   └─ package.json
```

Exports del paquete:

- `@didierp/astroblog` → integración (default) y tipos.
- `@didierp/astroblog/content` → `blogCollection`, `pagesCollection`.
- `@didierp/astroblog/components` → todos los componentes (para reutilizar en overrides).
- `@didierp/astroblog/styles` → `global.css`.

## 3. API de configuración

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import astroblog from '@didierp/astroblog';

export default defineConfig({
  site: 'https://miblog.com',
  integrations: [astroblog({
    title: 'Mi Blog',
    description: 'Descripción del sitio',
    lang: 'es',                                        // 'es' | 'en'
    logo: './src/assets/logo.svg',                     // opcional
    author: { name: 'Didier', email: 'contacto@miblog.com', url: '...', avatar: '...' },
    owner: { name: 'Didier P.', country: 'Colombia', email: 'legal@miblog.com' },
    social: { github: '...', x: '...', linkedin: '...' },
    nav: [{ label: 'Blog', href: '/' }, { label: 'Acerca', href: '/acerca' }],

    adsense: {
      client: 'ca-pub-XXXX',
      autoAds: true,
      slots: { inArticle: '111', afterPost: '222', sidebar: '333' }, // opcional
    },
    consent: { provider: 'google' },                   // 'google' | 'cookiebot' | 'cookieyes' | 'custom'
    //        { provider: 'cookiebot', id: 'xxxx-xxxx' }
    //        { provider: 'custom', head: '<script ...>', reopen: 'window.miCmp.open()' }
    analytics: { ga4: 'G-XXXX' },                      // opcional
    comments: { giscus: { repo, repoId, category, categoryId } }, // opcional

    theme: { light: 'astroblog-light', dark: 'astroblog-dark', default: 'system' },
    customCss: ['./src/styles/tema.css'],
    components: { Header: './src/components/Header.astro' },
    routes: { terms: false },                          // desactivar rutas
    slugs: { category: 'categoria', tag: 'etiqueta' }, // sobrescribir segmentos de URL
    search: true,                                      // Pagefind
    contact: { email: 'contacto@miblog.com', formEndpoint: 'https://formspree.io/f/xxx' },
    postsPerPage: 10,
    ui: { readMore: 'Seguir leyendo' },                // sobrescribir textos UI
  })],
});
```

```ts
// src/content.config.ts
import { blogCollection, pagesCollection } from '@didierp/astroblog/content';
export const collections = { blog: blogCollection(), pages: pagesCollection() };
```

### Valores por defecto

- `lang: 'es'`, `consent.provider: 'google'`, `search: true`, `postsPerPage: 10`, `theme.default: 'system'`.
- Todas las rutas activas.
- Sin `adsense`: no se carga script de anuncios ni se genera `ads.txt`.

### Validación

- Zod valida la config al iniciar (`astro:config:setup`). Errores con ruta del campo y mensaje en el idioma configurado.
- Error si: `adsense` presente sin `site` en la config de Astro; `consent.provider` es `cookiebot`/`cookieyes` sin `id`; `custom` sin `head`; `client` sin formato `ca-pub-\d+`.
- Advertencias (no bloquean): sin posts publicados; `routes` desactiva una página recomendada por AdSense (acerca, contacto, privacidad, cookies); `adsense` presente con `routes.privacy: false`.

### Schema de la colección `blog`

| Campo | Tipo | Obligatorio |
|---|---|---|
| `title` | string (≤ 70 recomendado, warning) | sí |
| `description` | string (50–160 recomendado, warning) | sí |
| `pubDate` | date | sí |
| `updatedDate` | date | no |
| `cover` | image | no |
| `coverAlt` | string | sí si hay `cover` |
| `author` | string (default: `author.name`) | no |
| `category` | string | sí |
| `tags` | string[] | no (default `[]`) |
| `draft` | boolean | no (default `false`; excluido en build de producción) |
| `noAds` | boolean | no (desactiva slots manuales en ese post) |

Loader: `glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' })`.

Colección `pages` (opcional): `src/content/pages/{acerca,contacto,privacidad,cookies,terminos,aviso-legal}.md` reemplaza la plantilla correspondiente.

## 4. Rutas inyectadas

Inyectadas con `injectRoute` en `astro:config:setup`; cada una se omite si `routes.<clave> === false`. Los segmentos se traducen según `lang` y se pueden sobrescribir con `slugs`.

| Clave | Ruta (es) | Ruta (en) |
|---|---|---|
| `home` | `/`, `/pagina/[n]` | `/`, `/page/[n]` |
| `post` | `/blog/[...slug]` | `/blog/[...slug]` |
| `category` | `/categoria/[cat]/[...page]` | `/category/[cat]/[...page]` |
| `tag` | `/etiqueta/[tag]/[...page]` | `/tag/[tag]/[...page]` |
| `author` | `/autor/[author]` | `/author/[author]` |
| `about` | `/acerca` | `/about` |
| `contact` | `/contacto` | `/contact` |
| `privacy` | `/privacidad` | `/privacy` |
| `cookies` | `/cookies` | `/cookies` |
| `terms` | `/terminos` | `/terms` |
| `legal` | `/aviso-legal` | `/legal-notice` |
| `search` | `/buscar` | `/search` |
| `notFound` | `/404` | `/404` |
| `rss` | `/rss.xml` | `/rss.xml` |
| `robots` | `/robots.txt` | `/robots.txt` |
| `adsTxt` | `/ads.txt` (solo con `adsense`) | igual |

- `@astrojs/sitemap`, `@astrojs/mdx` y `@astrojs/rss` se añaden/usan automáticamente.
- Si el usuario crea una página propia en `src/pages/` con la misma ruta, debe desactivar la inyectada con `routes` (se documenta; se emite warning si se detecta colisión).

## 5. Componentes y sustitución

Componentes sustituibles (clave en `components`):

`Header`, `Footer`, `ThemeToggle`, `Search`, `PostCard`, `PostHeader`, `TableOfContents`, `RelatedPosts`, `ShareLinks`, `AuthorBox`, `Breadcrumbs`, `Pagination`, `Comments`.

Componentes de sistema (no sustituibles, pero exportados): `Head`/`SEO`, `ConsentManager`, `ConsentGate`, `AdSlot`, `CookieSettingsLink`.

Mecanismo:

- La integración registra un plugin Vite que expone `virtual:astroblog/components`, re-exportando cada componente desde la ruta por defecto o la del usuario (resuelta relativa a la raíz del proyecto).
- También expone `virtual:astroblog/config` (config resuelta, serializable) y `virtual:astroblog/ui` (textos i18n fusionados con `ui`).
- Rutas y layouts importan exclusivamente desde estos módulos virtuales.
- Cada componente sustituible exporta su interfaz `Props`; los overrides reciben exactamente esas props.

## 6. Head, consentimiento y anuncios

### Orden del `<head>` en `BaseLayout`

1. `charset`, `viewport`, `<title>`, `description`, `canonical`.
2. Open Graph, Twitter cards, JSON-LD (`WebSite`/`Organization` en todas; `BlogPosting` + `BreadcrumbList` en posts).
3. Script inline anti-parpadeo de tema (lee `localStorage`, aplica `data-theme`).
4. Consent Mode v2 por defecto:
   ```js
   window.dataLayer = window.dataLayer || [];
   function gtag(){dataLayer.push(arguments);}
   gtag('consent', 'default', {
     ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
     analytics_storage: 'denied', wait_for_update: 500,
   });
   ```
5. Script de la CMP según proveedor:
   - `google`: sin script adicional (el mensaje de Privacidad y mensajes se sirve con el tag de AdSense; se configura en el panel de AdSense).
   - `cookiebot`: `https://consent.cookiebot.com/uc.js` con `data-cbid`.
   - `cookieyes`: `https://cdn-cookieyes.com/client_data/<id>/script.js`.
   - `custom`: HTML de `consent.head` tal cual.
6. AdSense: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<client>` (async, crossorigin).
7. GA4 si está configurado.
8. CSS global.

### Reabrir preferencias

`CookieSettingsLink` (en el footer y en la política de cookies) ejecuta:

- `google`: `googlefc.callbackQueue.push(googlefc.showRevocationMessage)`
- `cookiebot`: `Cookiebot.renew()`
- `cookieyes`: `revisitCkyConsent()`
- `custom`: `consent.reopen`

### ConsentGate

Envuelve contenido de terceros (Giscus, embeds). Muestra un placeholder daisyUI con botón "Gestionar cookies" hasta que el consentimiento de la categoría requerida esté concedido. Detección: escucha de eventos del proveedor (`CookiebotOnAccept`, `cookieyes_consent_update`, TCF `__tcfapi('addEventListener')` para Google) a través de un adaptador común `onConsent(category, cb)` en `lib/consent.ts`.

### AdSlot

- Props: `slot`, `format` (`auto` | `fluid` | `rectangle`), `layout?`, `minHeight?`.
- Renderiza `<ins class="adsbygoogle">` + `(adsbygoogle = window.adsbygoogle || []).push({})`.
- Reserva altura mínima para evitar CLS.
- En `astro dev` muestra un placeholder "Anuncio" en vez del anuncio real.
- No renderiza nada si `adsense` no está configurado o el post tiene `noAds: true`.
- `PostLayout` inserta automáticamente `slots.inArticle` (tras el segundo `h2` del contenido, vía plugin rehype) y `slots.afterPost`.

## 7. Tema y estilos

- `styles/global.css`:
  ```css
  @import "tailwindcss";
  @source "../";                      /* escanea componentes del paquete */
  @plugin "@tailwindcss/typography";
  @plugin "daisyui" { themes: <generado según config>; }
  @plugin "daisyui/theme" { name: "astroblog-light"; default: true; ... }
  @plugin "daisyui/theme" { name: "astroblog-dark"; prefersdark: true; ... }
  ```
- La lista de temas activos se genera según `theme.light`/`theme.dark` (temas incluidos de daisyUI o los propios).
- La hoja final se genera en el build: la integración escribe `styles.css` en su directorio de codegen (`createCodegenDir()`) con `@import` de `global.css` + temas activos + `@import` de cada `customCss` al final, y `BaseLayout` la importa vía `virtual:astroblog/styles`. Así los `customCss` comparten el contexto de Tailwind (pueden usar `@plugin "daisyui/theme"`) y sus variables tienen prioridad.
- El usuario personaliza con:
  ```css
  /* src/styles/tema.css */
  [data-theme="astroblog-light"] {
    --color-primary: oklch(60% 0.2 250);
    --radius-box: 0.5rem;
  }
  ```
- `ThemeToggle` alterna light/dark, persiste en `localStorage`, respeta `prefers-color-scheme` cuando `default: 'system'`.
- La integración añade `@tailwindcss/vite` a la config de Vite.
- Contenido de posts con clase `prose` (typography) adaptada a variables daisyUI.

## 8. Páginas legales

- Plantillas `.astro` por idioma en `legal/`, interpoladas con: `owner`, `site`, `title`, emails, presencia de AdSense/GA4/Giscus, proveedor de CMP, fecha de última actualización (fecha de build o `legal.updated`).
- La política de privacidad menciona, si aplica: uso de cookies de Google para anuncios, enlace a `https://policies.google.com/technologies/ads`, cómo desactivar la publicidad personalizada, GA4, derechos del usuario (RGPD / leyes locales), contacto.
- La política de cookies incluye `CookieSettingsLink` y la tabla de categorías de cookies según servicios activos.
- Aviso visible en la documentación (no en el sitio): plantillas orientativas, no asesoría legal.
- Sustituibles por `src/content/pages/<clave>.md`.

## 9. Build y Cloudflare Pages

Hook `astro:build:done`:

1. Si `search`: ejecuta Pagefind (API Node `pagefind`) sobre el directorio de salida; indexa solo el elemento `[data-pagefind-body]` del post.
2. Genera `_headers` en el directorio de salida:
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
   Si el usuario ya tiene `public/_headers`, se fusiona (las reglas del usuario prevalecen) en lugar de sobrescribir.

Configuración de Cloudflare Pages para el demo: build `pnpm --filter demo build`, directorio `examples/demo/dist`, Node ≥ 22.23.

## 10. Pruebas

- **Unitarias (Vitest)** en `packages/astroblog/test`:
  - `schema`: defaults, errores y warnings descritos en §3.
  - `lib`: readingTime, related posts (por categoría y tags compartidos), JSON-LD, `_headers` (incluida la fusión), `ads.txt`, `robots.txt`.
  - `i18n`: fusión de textos con `ui`.
  - Resolución del módulo virtual de componentes (default vs override).
  - Plugin rehype de inserción de `inArticle`.
- **Integración**: build de `examples/demo` (y de fixtures con distintas configs) y aserciones sobre `dist/`:
  - existencia de todas las rutas esperadas, `ads.txt`, `rss.xml`, `sitemap-index.xml`, `pagefind/`, `_headers`;
  - orden del `<head>`: consent default → CMP → AdSense;
  - JSON-LD parseable y con tipos esperados;
  - ruta desactivada ausente; componente sustituido presente en el HTML;
  - sin `adsense` → sin `ads.txt` ni script de anuncios.
- **E2E (Playwright, opcional en CI)** sobre `astro preview`: búsqueda, cambio de tema, enlace "Configurar cookies" invoca la API del proveedor (mock), 404.
- **Calidad**: TypeScript estricto, `astro check` en el demo, Lighthouse CI (SEO 100, Rendimiento ≥ 95).

## 11. Publicación y documentación

- Changesets para versionado y changelog.
- GitHub Actions: tests + build en cada PR; publicación a npm desde `main` vía changesets.
- README del paquete: instalación, referencia completa de config, personalizar tema, sustituir componentes, configurar cada CMP (incluido el paso a paso de Privacidad y mensajes en AdSense), checklist de aprobación AdSense, despliegue en Cloudflare Pages.

## 12. Versiones objetivo

Astro 7 (verificado 2026-10-23: 7.4.x; Vite 8, compilador Rust estricto con HTML inválido), Tailwind CSS 4, daisyUI 5, Pagefind 1, Zod 4 (vía `astro/zod`), Node ≥ 22.23 (requisito de Astro 7), pnpm.
