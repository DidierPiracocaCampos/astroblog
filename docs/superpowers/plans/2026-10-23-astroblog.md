# @didierp/astroblog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar `@didierp/astroblog`, una integración de Astro que genera un blog estático completo, listo para AdSense y Cloudflare Pages, estilizado con daisyUI y personalizable por variables CSS.

**Architecture:** Integración tipo Starlight: `astro:config:setup` valida la config con Zod, inyecta rutas `.astro` del paquete (`injectRoute` con `URL`), expone módulos virtuales (`virtual:astroblog/config|ui|components|styles`) y añade Tailwind/MDX/sitemap. La lógica pura (schema, rutas, SEO, generadores de archivos, consentimiento) vive en `lib/` con tests unitarios; las rutas y componentes `.astro` solo componen esa lógica. `astro:build:done` ejecuta Pagefind y escribe `_headers`.

**Tech Stack:** Astro 7.4, Vite 8, Tailwind CSS 4.3 (`@tailwindcss/vite`), daisyUI 5, `@tailwindcss/typography`, `@astrojs/mdx` 8, `@astrojs/sitemap` 3, `@astrojs/rss` 4, Pagefind 1.5, Zod 4 (vía `astro/zod`), Vitest 5, pnpm workspaces, Changesets.

**Spec:** `docs/superpowers/specs/2026-10-23-astroblog-design.md`

## Global Constraints

- Node ≥ 22.23 (`engines.node: ">=22.23.0"` en todos los `package.json`); pnpm ≥ 9.
- `astro` es `peerDependency` del paquete: `"astro": "^7.4.0"`.
- Importar Zod siempre desde `astro/zod`, nunca `zod` directamente.
- Salida siempre `output: 'static'`; ninguna ruta usa `prerender = false`.
- Compilador Rust de Astro 7: todo `.astro` con HTML válido y etiquetas cerradas (no `<div>` dentro de `<p>`).
- Nombre del paquete: `@didierp/astroblog`. Exports: `.`, `./content`, `./components`, `./styles`.
- Entradas de `injectRoute` con `new URL('./routes/x.astro', import.meta.url)` (no especificadores de paquete).
- Idiomas soportados: `'es' | 'en'`; por defecto `'es'`. Mensajes de error de config en el idioma configurado.
- Consent Mode v2 por defecto exacto: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` en `'denied'`, `wait_for_update: 500`.
- Orden de `<head>` (spec §6): meta → OG/Twitter/JSON-LD → script de tema → consent default → CMP → AdSense → GA4 → CSS.
- Sin `adsense` en config: ningún script de anuncios, sin `ads.txt`, `AdSlot` no renderiza.
- Textos visibles al usuario final salen de `virtual:astroblog/ui`, nunca literales en componentes.
- Commits con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`site` con o sin barra final y `base` no vacío** (p. ej. `site: 'https://x.com'`, `base: '/blog'`): canónicas, sitemap, RSS, enlaces internos y `robots.txt` deben producir URLs absolutas correctas sin `//`. Test en Task 5 (`absoluteUrl`) y fixture `base` en Task 14.
2. **Categorías/etiquetas con tildes, eñes, espacios o mayúsculas** (`"Programación Web"`): slug estable (`programacion-web`), sin colisiones silenciosas, y la página muestra el nombre original. Test en Task 4 (`slugify`, `groupByTaxonomy`).
3. **Blog sin posts o solo con borradores**: el build no falla; portada muestra estado vacío; no se generan páginas de categoría vacías; warning emitido. Fixture `empty` en Task 14.
4. **Usuario con `public/_headers` o `public/ads.txt` propios**: no se pierden; `_headers` se fusiona (reglas del usuario prevalecen); si existe `public/ads.txt` la ruta `ads.txt` no se inyecta. Test en Task 6 y Task 9.
5. **Override de componente con ruta inexistente o `customCss` inexistente**: error claro en `astro:config:setup` nombrando la clave y la ruta, no un error críptico de Vite. Test en Task 8.

---

## File Structure

```
package.json                     # raíz: scripts test/build/lint, devDeps compartidas
pnpm-workspace.yaml              # packages/*, examples/*, packages/astroblog/test/fixtures/*
tsconfig.base.json
.changeset/config.json
.github/workflows/ci.yml
packages/astroblog/
  package.json  tsconfig.json  vitest.config.ts  README.md
  index.ts                       # integración: hooks
  content.ts                     # blogCollection, pagesCollection, blogSchema
  virtual.d.ts                   # declaraciones de módulos virtuales
  components.ts                  # barrel export de componentes
  schema/config.ts               # Zod config usuario → ResolvedConfig
  schema/validate.ts             # validaciones cruzadas → errores/warnings
  i18n/es.ts  i18n/en.ts  i18n/index.ts
  lib/routes.ts                  # tabla de rutas por idioma/slugs/flags
  lib/posts.ts                   # filtrar/ordenar, readingTime, related, slugify, taxonomías
  lib/seo.ts                     # absoluteUrl, buildMeta, jsonLd*
  lib/files.ts                   # adsTxt, robotsTxt, buildHeaders, mergeHeaders
  lib/consent.ts                 # consentDefaultScript, cmpHead, reopenScript
  lib/consent-client.ts          # onConsent() en navegador
  lib/virtual.ts                 # buildComponentsModule, buildStylesheet, plugin Vite
  lib/rehype-ad.ts               # rehype: inserta slot inArticle tras 2º h2
  lib/build.ts                   # runPagefind, writeHeaders
  styles/global.css
  layouts/BaseLayout.astro  PostLayout.astro  PageLayout.astro
  components/Head.astro ConsentManager.astro ThemeToggle.astro Header.astro Footer.astro
    CookieSettingsLink.astro PostCard.astro Pagination.astro Breadcrumbs.astro
    PostHeader.astro TableOfContents.astro RelatedPosts.astro ShareLinks.astro
    AuthorBox.astro AdSlot.astro ConsentGate.astro Comments.astro Search.astro
  legal/es/*.astro  legal/en/*.astro   # privacy, cookies, terms, legal, about, contact
  routes/index.astro  page.astro  post.astro  category.astro  tag.astro  author.astro
    institutional.astro  search.astro  404.astro  rss.xml.ts  robots.txt.ts  ads.txt.ts
  test/unit/*.test.ts
  test/build/*.test.ts
  test/fixtures/{basic,minimal,empty,base,overrides}/
examples/demo/
```

---

### Task 1: Monorepo y esqueleto del paquete

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc` (`22.23`)
- Create: `packages/astroblog/package.json`, `tsconfig.json`, `vitest.config.ts`, `index.ts`
- Create: `packages/astroblog/test/fixtures/minimal/{package.json,astro.config.mjs,src/pages/index.astro}`
- Test: `packages/astroblog/test/unit/integration.test.ts`, `packages/astroblog/test/build/smoke.test.ts`

**Interfaces:**
- Produces: `export default function astroblog(userConfig?: unknown): AstroIntegration` con `name: '@didierp/astroblog'`. Helper de tests `test/build/helpers.ts`: `buildFixture(name: string): Promise<{ dist: string; read(path: string): Promise<string>; exists(path: string): boolean }>` usando `build({ root, logLevel: 'error' })` de `astro`.

- [ ] **Step 1:** Crear raíz: `pnpm-workspace.yaml` con `packages/*`, `examples/*`, `packages/astroblog/test/fixtures/*`; `package.json` raíz privado con scripts `test: pnpm -r test`, `build:demo: pnpm --filter demo build`. `packages/astroblog/package.json`: `type: module`, `exports` (`.`→`./index.ts`, `./content`→`./content.ts`, `./components`→`./components.ts`, `./styles`→`./styles/global.css`), `files` incluye todos los dirs fuente, `peerDependencies.astro ^7.4.0`, deps listadas en Tech Stack. Vitest con dos proyectos: `unit` (`test/unit`) y `build` (`test/build`, `testTimeout: 180000`).
- [ ] **Step 2: Test unitario**
  ```ts
  it('returns an integration named @didierp/astroblog', () => {
    const i = astroblog({ title: 'T', description: 'D' });
    expect(i.name).toBe('@didierp/astroblog');
    expect(typeof i.hooks['astro:config:setup']).toBe('function');
  });
  ```
- [ ] **Step 3:** Test de build: fixture `minimal` (integración registrada, una página propia) compila y `dist/index.html` existe. Este test valida que Astro carga `index.ts` desde el workspace sin compilar (patrón Starlight). Si Node rechaza la carga de `.ts` en `node_modules`, añadir `tsc -p tsconfig.build.json` que emita `dist/index.js` y apuntar `exports["."]` ahí; documentarlo en el commit.
- [ ] **Step 4:** `pnpm install`; `pnpm --filter @didierp/astroblog test` → ambos fallan; implementar `index.ts` mínimo (hook vacío); repetir → PASS.
- [ ] **Step 5:** Commit `chore: scaffold monorepo and integration skeleton`.

---

### Task 2: Schema de configuración y validación

**Files:**
- Create: `packages/astroblog/schema/config.ts`, `schema/validate.ts`
- Test: `packages/astroblog/test/unit/config.test.ts`

**Interfaces:**
- Produces:
  - `UserConfigSchema` (Zod) y `type AstroblogUserConfig = z.input<typeof UserConfigSchema>`, `type ResolvedConfig = z.output<typeof UserConfigSchema>`.
  - `parseConfig(input: unknown): ResolvedConfig` — lanza `AstroblogConfigError` (extiende `Error`, `issues: { path: string; message: string }[]`).
  - `validateConfig(config: ResolvedConfig, ctx: { site?: string; hasPosts?: boolean }): { errors: string[]; warnings: string[] }`.
  - `type ConsentProvider = 'google' | 'cookiebot' | 'cookieyes' | 'custom'`; `type RouteKey` = claves de spec §4.
  - `COMPONENT_KEYS` (tupla readonly de los 13 componentes sustituibles de spec §5).

Campos y defaults exactamente como spec §3. `consent` es unión discriminada por `provider`: `google` (sin campos), `cookiebot`/`cookieyes` (`id: string` requerido), `custom` (`head: string`, `reopen: string` requeridos). `adsense.client` regex `/^ca-pub-\d+$/`. `components` es `Partial<Record<ComponentKey, string>>` (clave desconocida → error). `routes` es `Partial<Record<RouteKey, boolean>>`. `theme.default`: `'system' | 'light' | 'dark'`.

- [ ] **Step 1: Tests**
  ```ts
  it('applies defaults', () => {
    const c = parseConfig({ title: 'T', description: 'D' });
    expect(c).toMatchObject({ lang: 'es', search: true, postsPerPage: 10,
      consent: { provider: 'google' }, theme: { light: 'astroblog-light', dark: 'astroblog-dark', default: 'system' } });
  });
  it('rejects cookiebot without id', () => expect(() => parseConfig({ title:'T', description:'D', consent:{ provider:'cookiebot' } })).toThrow(AstroblogConfigError));
  it('rejects malformed adsense client', () => expect(() => parseConfig({ title:'T', description:'D', adsense:{ client:'pub-1' } })).toThrow(/ca-pub/));
  it('rejects unknown component key', () => expect(() => parseConfig({ title:'T', description:'D', components:{ Foo:'./x.astro' } })).toThrow(/Foo/));
  it('errors when adsense is set without site', () => {
    const c = parseConfig({ title:'T', description:'D', adsense:{ client:'ca-pub-123' } });
    expect(validateConfig(c, {}).errors[0]).toMatch(/site/);
  });
  it('warns when an AdSense-recommended route is disabled', () => {
    const c = parseConfig({ title:'T', description:'D', routes:{ privacy:false } });
    expect(validateConfig(c, { site:'https://x.com' }).warnings.join()).toMatch(/privacy|privacidad/);
  });
  it('warns when there are no posts', () => { /* hasPosts:false → warning */ });
  it('reports messages in english when lang is en', () => { /* lang:'en', adsense sin site → /site/ y texto en inglés */ });
  ```
- [ ] **Step 2:** Ejecutar `pnpm vitest run test/unit/config.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `config.ts` y `validate.ts`. Rutas recomendadas por AdSense: `about`, `contact`, `privacy`, `cookies`. Mensajes de `validate.ts` en tabla `{ es, en }` local al archivo.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: config schema and validation`.

---

### Task 3: i18n y tabla de rutas

**Files:**
- Create: `packages/astroblog/i18n/es.ts`, `i18n/en.ts`, `i18n/index.ts`, `lib/routes.ts`
- Test: `packages/astroblog/test/unit/i18n.test.ts`, `test/unit/routes.test.ts`

**Interfaces:**
- Consumes: `ResolvedConfig`, `RouteKey` (Task 2).
- Produces:
  - `type UIStrings` (claves: `readMore, readingTime /* "{n} min de lectura" */, categories, tags, author, search, searchPlaceholder, noResults, toc, related, share, previous, next, page, cookieSettings, consentRequired, manageCookies, themeToggle, notFoundTitle, notFoundBody, backHome, emptyBlog, publishedOn, updatedOn, advertisement, contactFormName, contactFormEmail, contactFormMessage, contactFormSend, home`), y textos de nav legal (`about, contact, privacy, cookies, terms, legal`).
  - `getUI(lang: 'es'|'en', overrides?: Partial<UIStrings>): UIStrings`; `t(template: string, vars: Record<string, string|number>): string` (reemplaza `{clave}`).
  - `resolveRoutes(config: ResolvedConfig): ResolvedRoute[]` con `ResolvedRoute = { key: RouteKey; pattern: string; entry: string /* nombre de archivo en routes/ */ }`.
  - `routePath(config: ResolvedConfig, key: RouteKey, param?: string): string` — ruta pública relativa a `base` (p. ej. `routePath(c,'category','web')` → `/categoria/web`).

Patrones exactos de spec §4. `home` produce dos entradas: `/` (`index.astro`) y `/{page}/[page]` (`page.astro`). Páginas institucionales y legales (`about, contact, privacy, cookies, terms, legal`) usan un único entry `institutional.astro` con patrón estático cada una. `adsTxt` solo si `config.adsense`. `config.slugs` sobrescribe segmentos (`category, tag, author, page, about, contact, privacy, cookies, terms, legal, search`).

- [ ] **Step 1: Tests**
  ```ts
  it('builds spanish routes', () => {
    const r = resolveRoutes(parseConfig({ title:'T', description:'D' }));
    expect(r.map(x => x.pattern)).toEqual(expect.arrayContaining(['/', '/pagina/[page]', '/blog/[...slug]',
      '/categoria/[cat]/[...page]', '/etiqueta/[tag]/[...page]', '/autor/[author]', '/acerca', '/contacto',
      '/privacidad', '/cookies', '/terminos', '/aviso-legal', '/buscar', '/404', '/rss.xml', '/robots.txt']));
    expect(r.find(x => x.key === 'adsTxt')).toBeUndefined();
  });
  it('uses english slugs', () => { /* lang:'en' → '/category/[cat]/[...page]', '/legal-notice', '/page/[page]' */ });
  it('omits disabled routes', () => { /* routes:{terms:false} → sin '/terminos' */ });
  it('applies slug overrides', () => { /* slugs:{category:'temas'} → '/temas/[cat]/[...page]' y routePath → '/temas/x' */ });
  it('includes ads.txt with adsense', () => { /* adsense presente → pattern '/ads.txt' */ });
  it('merges ui overrides and interpolates', () => {
    expect(getUI('es', { readMore: 'Seguir' }).readMore).toBe('Seguir');
    expect(t(getUI('es').readingTime, { n: 4 })).toBe('4 min de lectura');
  });
  it('en and es define the same keys', () => expect(Object.keys(getUI('en')).sort()).toEqual(Object.keys(getUI('es')).sort()));
  ```
- [ ] **Step 2:** Ejecutar → FAIL. **Step 3:** Implementar. **Step 4:** Ejecutar → PASS.
- [ ] **Step 5:** Commit `feat: i18n strings and route table`.

---

### Task 4: Utilidades de posts

**Files:**
- Create: `packages/astroblog/lib/posts.ts`
- Test: `packages/astroblog/test/unit/posts.test.ts`

**Interfaces:**
- Produces (genéricos sobre `PostLike = { id: string; body?: string; data: { title: string; pubDate: Date; category: string; tags: string[]; draft: boolean; author?: string } }`):
  - `slugify(s: string): string` — NFD, quita diacríticos, minúsculas, no alfanuméricos → `-`, recorta `-`.
  - `publishedPosts<T extends PostLike>(posts: T[], opts: { includeDrafts: boolean }): T[]` — ordena por `pubDate` desc.
  - `readingTime(body: string, wpm = 200): number` — mínimo 1.
  - `relatedPosts<T>(post: T, all: T[], limit = 3): T[]` — puntuación: misma categoría +2, cada tag compartido +1; excluye el propio y puntuación 0; empate → más reciente.
  - `groupByTaxonomy<T>(posts: T[], field: 'category'|'tags'|'author'): Map<string /*slug*/, { label: string; posts: T[] }>` — `label` = primera forma original vista.

- [ ] **Step 1: Tests**
  ```ts
  expect(slugify('Programación Web')).toBe('programacion-web');
  expect(slugify('  Ñandú & Co. ')).toBe('nandu-co');
  it('filters drafts and sorts desc', () => { /* 3 posts, 1 draft → 2, más nuevo primero; includeDrafts:true → 3 */ });
  expect(readingTime('palabra '.repeat(450))).toBe(3);
  expect(readingTime('')).toBe(1);
  it('ranks related by category and shared tags', () => { /* A(cat x, tags[a,b]); B(cat x, tags[a]) → 3; C(cat y, tags[a,b]) → 2; D(cat y, []) → 0 → [B, C] */ });
  it('groups taxonomy by slug keeping original label', () => {
    const g = groupByTaxonomy([p({ category:'Programación Web' }), p({ category:'programacion web' })], 'category');
    expect([...g.keys()]).toEqual(['programacion-web']);
    expect(g.get('programacion-web')!.label).toBe('Programación Web');
    expect(g.get('programacion-web')!.posts).toHaveLength(2);
  });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: post utilities`.

---

### Task 5: SEO (URLs, meta, JSON-LD)

**Files:**
- Create: `packages/astroblog/lib/seo.ts`
- Test: `packages/astroblog/test/unit/seo.test.ts`

**Interfaces:**
- Produces:
  - `absoluteUrl(site: string, base: string, path: string): string` — une sin `//` duplicados, conserva barra final de `path`.
  - `buildMeta(input: { title: string; siteTitle: string; description: string; url: string; image?: string; type: 'website'|'article'; lang: 'es'|'en'; publishedTime?: Date; modifiedTime?: Date }): { title: string; meta: { name?: string; property?: string; content: string }[] }` — `title` = `"{title} | {siteTitle}"` salvo que sean iguales; incluye `og:*`, `twitter:card` (`summary_large_image` si hay imagen, si no `summary`), `og:locale` (`es_ES`/`en_US`), `article:published_time` ISO.
  - `jsonLdWebsite(c: { name: string; url: string; description: string; publisher: { name: string; logo?: string } }): object` — `@graph` con `WebSite` + `Organization`.
  - `jsonLdPost(c: { title: string; description: string; url: string; image?: string; datePublished: Date; dateModified?: Date; author: { name: string; url?: string }; publisherName: string }): object` — `BlogPosting`.
  - `jsonLdBreadcrumbs(items: { name: string; url: string }[]): object` — `BreadcrumbList` con `position` desde 1.

- [ ] **Step 1: Tests**
  ```ts
  expect(absoluteUrl('https://x.com/', '/', '/blog/a/')).toBe('https://x.com/blog/a/');
  expect(absoluteUrl('https://x.com', '/sub', 'blog/a')).toBe('https://x.com/sub/blog/a');
  expect(absoluteUrl('https://x.com/', '/sub/', '/')).toBe('https://x.com/sub/');
  it('builds article meta', () => { /* type article + image → twitter:card summary_large_image, og:type article, article:published_time ISO */ });
  it('does not duplicate site title', () => expect(buildMeta({ title:'Mi Blog', siteTitle:'Mi Blog', ... }).title).toBe('Mi Blog'));
  it('builds BlogPosting', () => { /* @context https://schema.org, @type BlogPosting, dateModified cae a datePublished si falta */ });
  it('numbers breadcrumbs from 1', () => { /* 2 items → position 1,2 */ });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: seo helpers`.

---

### Task 6: Generadores de archivos estáticos

**Files:**
- Create: `packages/astroblog/lib/files.ts`
- Test: `packages/astroblog/test/unit/files.test.ts`

**Interfaces:**
- Produces:
  - `adsTxt(client: string): string` → `google.com, pub-XXXX, DIRECT, f08c47fec0942fa0\n` (quita `ca-` del client).
  - `robotsTxt(sitemapUrl: string): string` → `User-agent: *\nAllow: /\n\nSitemap: <url>\n`.
  - `DEFAULT_HEADERS: string` — contenido exacto de spec §9.
  - `mergeHeaders(ours: string, user: string | null): string` — parsea bloques (línea sin sangría = ruta, líneas sangradas = `Nombre: valor`); por ruta, cabeceras del usuario reemplazan las nuestras con el mismo nombre (case-insensitive); rutas solo del usuario se conservan; orden: rutas nuestras en su orden, luego las nuevas del usuario.

- [ ] **Step 1: Tests**
  ```ts
  expect(adsTxt('ca-pub-123')).toBe('google.com, pub-123, DIRECT, f08c47fec0942fa0\n');
  expect(robotsTxt('https://x.com/sitemap-index.xml')).toContain('Sitemap: https://x.com/sitemap-index.xml');
  it('returns defaults when user has none', () => expect(mergeHeaders(DEFAULT_HEADERS, null)).toBe(DEFAULT_HEADERS));
  it('user header wins for same path', () => {
    const out = mergeHeaders(DEFAULT_HEADERS, '/*\n  referrer-policy: no-referrer\n/api/*\n  X-A: 1\n');
    expect(out).toContain('referrer-policy: no-referrer');
    expect(out).not.toContain('strict-origin-when-cross-origin');
    expect(out).toContain('X-Content-Type-Options: nosniff');
    expect(out).toMatch(/\/api\/\*\n  X-A: 1/);
  });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: ads.txt, robots.txt and _headers generators`.

---

### Task 7: Consentimiento (snippets de head y adaptador de cliente)

**Files:**
- Create: `packages/astroblog/lib/consent.ts`, `lib/consent-client.ts`
- Test: `packages/astroblog/test/unit/consent.test.ts`

**Interfaces:**
- Consumes: `ResolvedConfig['consent']` (Task 2).
- Produces:
  - `consentDefaultScript(): string` — JS inline exacto de spec §6 paso 4.
  - `cmpHead(consent): string` — HTML: `google` → `''`; `cookiebot` → `<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="<id>" data-blockingmode="auto" type="text/javascript"></script>`; `cookieyes` → `<script id="cookieyes" type="text/javascript" src="https://cdn-cookieyes.com/client_data/<id>/script.js"></script>`; `custom` → `head` literal. `id` escapado para atributo HTML.
  - `reopenScript(consent): string` — expresiones exactas de spec §6 "Reabrir preferencias"; `google` envuelto: `window.googlefc=window.googlefc||{};googlefc.callbackQueue=googlefc.callbackQueue||[];googlefc.callbackQueue.push(googlefc.showRevocationMessage)`.
  - `adsenseScript(client: string): string` — `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<client>" crossorigin="anonymous"></script>`.
  - `ga4Scripts(id: string): string` — `gtag/js?id=` async + `gtag('js', new Date()); gtag('config', id)` (reusa el `gtag` definido en el default).
  - Cliente (`consent-client.ts`, se ejecuta en navegador): `onConsent(provider: ConsentProvider, category: 'marketing'|'statistics'|'preferences', cb: () => void): void` — `cookiebot`: evento `CookiebotOnAccept` + `Cookiebot.consent[category]`; `cookieyes`: evento `cookieyes_consent_update` con `detail.accepted` (mapea `marketing→advertisement`, `statistics→analytics`, `preferences→functional`); `google`: `__tcfapi('addEventListener', 2, ...)` con `tcData.eventStatus` en `useractioncomplete|tcloaded` y `tcData.gdprApplies === false || purpose.consents[1]`; `custom`: evento `astroblog:consent` en `window` con `detail.categories: string[]`.

- [ ] **Step 1: Tests**
  ```ts
  it('default denies all four signals', () => {
    const s = consentDefaultScript();
    for (const k of ['ad_storage','ad_user_data','ad_personalization','analytics_storage']) expect(s).toMatch(new RegExp(`${k}:\\s*'denied'`));
    expect(s).toContain('wait_for_update: 500');
  });
  expect(cmpHead({ provider:'google' })).toBe('');
  expect(cmpHead({ provider:'cookiebot', id:'abc' })).toContain('data-cbid="abc"');
  expect(cmpHead({ provider:'cookiebot', id:'a"b' })).toContain('data-cbid="a&quot;b"');
  expect(reopenScript({ provider:'cookieyes', id:'x' })).toBe('revisitCkyConsent()');
  expect(reopenScript({ provider:'custom', head:'', reopen:'cmp.open()' })).toBe('cmp.open()');
  it('onConsent fires for cookiebot accept', () => { /* jsdom: window.Cookiebot={consent:{marketing:true}}; dispatch CookiebotOnAccept → cb llamado */ });
  it('onConsent fires for custom event', () => { /* dispatch astroblog:consent {categories:['marketing']} → cb */ });
  ```
  (Proyecto `unit` con `environment: 'jsdom'` solo para este archivo vía `// @vitest-environment jsdom`.)
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: consent snippets and client adapter`.

---

### Task 8: Módulos virtuales y hoja de estilos generada

**Files:**
- Create: `packages/astroblog/lib/virtual.ts`, `virtual.d.ts`, `styles/global.css`
- Test: `packages/astroblog/test/unit/virtual.test.ts`

**Interfaces:**
- Consumes: `ResolvedConfig`, `COMPONENT_KEYS` (Task 2), `getUI` (Task 3).
- Produces:
  - `resolveUserPath(root: URL, p: string, key: string): string` — ruta absoluta POSIX; lanza `Error` con mensaje que incluye `key` y `p` si no existe.
  - `buildComponentsModule(overrides: Partial<Record<ComponentKey,string>>, root: URL, pkgDir: URL): string` — una línea `export { default as <Key> } from "<abs>";` por clave de `COMPONENT_KEYS`.
  - `buildStylesheet(opts: { pkgDir: URL; themes: { light: string; dark: string }; customCss: string[] /* abs */ }): string` — orden: `@import "tailwindcss";`, `@source "<pkgDir>/components";` `@source "<pkgDir>/layouts";` `@source "<pkgDir>/routes";` `@source "<pkgDir>/legal";`, `@plugin "@tailwindcss/typography";`, `@plugin "daisyui" { themes: <lista>; }` (temas propios `astroblog-*` no se listan aquí; los incluidos sí, con `--default`/`--prefersdark`), `@import "<pkgDir>/styles/global.css";`, luego un `@import` por `customCss`.
  - `astroblogVitePlugin(modules: Record<string, string>): VitePlugin` — resuelve `virtual:astroblog/config` (`export default <JSON config serializable>`), `virtual:astroblog/ui`, `virtual:astroblog/components`, `virtual:astroblog/routes` (`export default` resultado de `resolveRoutes` + `routePath` serializado como tabla) y `virtual:astroblog/styles` (alias al archivo real `styles.css` en codegen dir).
  - `virtual.d.ts`: declaraciones de esos módulos, inyectadas en Task 9 con `injectTypes`.
  - `styles/global.css`: dos bloques `@plugin "daisyui/theme"` (`astroblog-light` con `default: true`, `astroblog-dark` con `prefersdark: true`; paleta neutra con primario azul `oklch(55% 0.2 255)`), estilos de `.prose` mapeados a `--color-base-content`, utilidades `.ad-slot { min-height: var(--ad-min-height, 280px) }`.

- [ ] **Step 1: Tests**
  ```ts
  it('defaults every component to the package', () => {
    const m = buildComponentsModule({}, root, pkg);
    expect(m.split('\n').filter(Boolean)).toHaveLength(13);
    expect(m).toContain('export { default as Header } from "');
  });
  it('uses user override path', () => { /* fixture tmp con Header.astro → path absoluto del usuario */ });
  it('throws a clear error for a missing override', () => expect(() => buildComponentsModule({ Header: './nope.astro' }, root, pkg)).toThrow(/Header.*nope\.astro/));
  it('puts customCss after global.css', () => {
    const css = buildStylesheet({ pkgDir: pkg, themes: { light:'astroblog-light', dark:'astroblog-dark' }, customCss: ['/p/tema.css'] });
    expect(css.indexOf('global.css')).toBeLessThan(css.indexOf('/p/tema.css'));
    expect(css.startsWith('@import "tailwindcss";')).toBe(true);
  });
  it('lists built-in daisyUI themes', () => {
    const css = buildStylesheet({ pkgDir: pkg, themes: { light:'cupcake', dark:'dracula' }, customCss: [] });
    expect(css).toMatch(/themes:\s*cupcake --default,\s*dracula --prefersdark;/);
  });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: virtual modules and generated stylesheet`.

---

### Task 9: Hooks de la integración y hook de build

**Files:**
- Modify: `packages/astroblog/index.ts`
- Create: `packages/astroblog/lib/build.ts`, `lib/rehype-ad.ts`
- Test: `packages/astroblog/test/unit/rehype-ad.test.ts`, `test/unit/build.test.ts`

**Interfaces:**
- Consumes: Tasks 2–8.
- Produces:
  - `astro:config:setup`: `parseConfig` (re-lanza `AstroblogConfigError` como mensaje legible); `validateConfig` con `site` de la config de Astro → errores lanzan, warnings van a `logger.warn`; `updateConfig({ vite: { plugins: [tailwindcss(), astroblogVitePlugin(...)], ssr: { noExternal: ['@didierp/astroblog'] } }, integrations: [mdx(), sitemap()] /* solo si no están ya */, markdown: { rehypePlugins: [[rehypeAd, {...}]] } })`; escribe `styles.css` en `createCodegenDir()`; `injectRoute` por cada `resolveRoutes(config)` con `new URL(\`./routes/${entry}\`, import.meta.url)`; si existe `public/ads.txt` omite la ruta `adsTxt`; `addWatchFile` para cada `customCss`.
  - `astro:routes:resolved`: si una ruta del proyecto (`origin: 'project'`) tiene el mismo `pattern` que una inyectada, `logger.warn` sugiriendo `routes.<clave>: false`.
  - `astro:config:done`: `injectTypes({ filename: 'virtual.d.ts', content })`.
  - `astro:build:done`: `writeHeaders(dir, publicDir)` y, si `search`, `runPagefind(dir)`.
  - `rehypeAd(opts: { slot?: string; client?: string; dev: boolean }): Transformer` — inserta tras el 2º `h2` de primer nivel un nodo `<div class="ad-slot not-prose" data-ad="inArticle">` con `<ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client data-ad-slot>` + `<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`; en `dev` inserta placeholder `<div class="ad-slot ... ">Anuncio</div>`; no hace nada si falta `slot`/`client`, si hay < 2 `h2` o si `file.data.astro.frontmatter.noAds === true`.
  - `writeHeaders(dir: URL, publicDir: URL): Promise<void>` — lee `public/_headers` si existe, escribe `mergeHeaders(DEFAULT_HEADERS, user)` en `dist/_headers`.
  - `runPagefind(dir: URL): Promise<{ pages: number }>` — `pagefind.createIndex()`, `index.addDirectory({ path })`, `index.writeFiles({ outputPath: <dir>/pagefind })`, `pagefind.close()`.

- [ ] **Step 1: Tests**
  ```ts
  it('inserts ad after the second h2', async () => { /* md "## a\np\n## b\np\n## c" → ins aparece entre "b" y "c" */ });
  it('skips when noAds frontmatter', ...); it('skips with fewer than two h2', ...);
  it('renders placeholder in dev', ...);
  it('writeHeaders merges user _headers', async () => { /* tmp dirs → dist/_headers contiene regla del usuario y nosniff */ });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS (el test de build `minimal` de Task 1 sigue pasando).
- [ ] **Step 5:** Commit `feat: integration hooks, rehype ad slot and build step`.

---

### Task 10: Colecciones de contenido

**Files:**
- Create: `packages/astroblog/content.ts`
- Test: `packages/astroblog/test/unit/content.test.ts`

**Interfaces:**
- Produces:
  - `blogSchema(ctx: { image: () => ZodType }): ZodObject` — campos de spec §3; `coverAlt` requerido si hay `cover` (`.superRefine`); `tags` default `[]`; `draft` default `false`; `noAds` default `false`.
  - `blogCollection(opts?: { base?: string }): { loader; schema }` — `glob({ pattern: '**/*.{md,mdx}', base: opts.base ?? './src/content/blog' })`. Devuelve objeto plano (equivalente a `defineCollection`) para no importar `astro:content`.
  - `pagesCollection(opts?: { base?: string })` — `base` por defecto `./src/content/pages`, schema `{ title: string; description?: string; updatedDate?: date }`.
  - Warnings de longitud (`title` > 70, `description` fuera de 50–160) no fallan el schema: se emiten desde las rutas con `console.warn` una vez por post en build (Task 12).

- [ ] **Step 1: Tests**
  ```ts
  const s = blogSchema({ image: () => z.string() });
  it('requires title, description, pubDate, category', () => expect(s.safeParse({}).success).toBe(false));
  it('requires coverAlt when cover is set', () => expect(s.safeParse({ ...valid, cover:'a.jpg' }).success).toBe(false));
  it('applies defaults', () => expect(s.parse(valid)).toMatchObject({ tags: [], draft: false, noAds: false }));
  it('coerces dates', () => expect(s.parse({ ...valid, pubDate:'2026-01-02' }).pubDate).toBeInstanceOf(Date));
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: blog and pages content collections`.

---

### Task 11: Layout base, Head, tema y componentes de chrome

**Files:**
- Create: `layouts/BaseLayout.astro`, `layouts/PageLayout.astro`, `components/{Head,ConsentManager,ThemeToggle,Header,Footer,CookieSettingsLink,Breadcrumbs,Search}.astro`, `components.ts`
- Create: fixture `test/fixtures/basic/` (config con adsense `ca-pub-123`, GA4, 4 posts en 2 categorías con tildes, un borrador, un post con `noAds`, un post con ≥3 `h2`)
- Test: `test/build/head.test.ts`

**Interfaces:**
- Consumes: `virtual:astroblog/*`, `lib/seo.ts`, `lib/consent.ts`.
- Produces:
  - `BaseLayout` props: `{ title: string; description: string; image?: string; type?: 'website'|'article'; publishedTime?: Date; modifiedTime?: Date; breadcrumbs?: { name: string; href: string }[]; jsonLd?: object[] }`; slots `default`, `aside`.
  - `Head` emite el orden de Global Constraints; script de tema inline: lee `localStorage['astroblog-theme']`, si no, `theme.default`/`prefers-color-scheme`, aplica `data-theme` con el nombre real del tema.
  - `ThemeToggle`: daisyUI `swap` con `theme-controller`; escribe `localStorage['astroblog-theme']` (`light|dark`).
  - `Header` props `{ currentPath: string }`: `navbar` daisyUI con logo/título, `nav`, botón de búsqueda (si `search`) y `ThemeToggle`; menú `dropdown` en móvil.
  - `Footer`: enlaces a rutas legales activas (vía `routePath`), `CookieSettingsLink`, copyright `© {año} {owner.name}`, social.
  - `CookieSettingsLink`: `<button class="link">` con `onclick` = `reopenScript(consent)`.
  - `Search` (solo si `search`): `<dialog class="modal">` con `@pagefind/default-ui` cargado desde `/pagefind/pagefind-ui.js` al abrir; atajo `/` y `Ctrl+K`.
  - `components.ts`: re-exporta todos los componentes de `components/`.

Usar el skill `daisyui` al escribir el marcado.

- [ ] **Step 1: Test de build** (`basic`):
  ```ts
  it('emits head in the required order', async () => {
    const html = await f.read('index.html');
    const idx = (s: string) => html.indexOf(s);
    expect(idx('<link rel="canonical"')).toBeGreaterThan(-1);
    expect(idx("gtag('consent', 'default'")).toBeLessThan(idx('adsbygoogle.js?client=ca-pub-123'));
    expect(idx('adsbygoogle.js')).toBeLessThan(idx('googletagmanager.com/gtag/js?id='));
    expect(html).toContain('"@type":"WebSite"');
  });
  it('footer has cookie settings and legal links', ...); // texto ui.cookieSettings + href '/privacidad'
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (con una ruta `index.astro` provisional que use `BaseLayout`). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: base layout, head ordering and site chrome`.

---

### Task 12: Rutas del blog (portada, post, taxonomías, autor)

**Files:**
- Create: `routes/{index,page,post,category,tag,author}.astro`, `layouts/PostLayout.astro`, `components/{PostCard,Pagination,PostHeader,TableOfContents,RelatedPosts,ShareLinks,AuthorBox,AdSlot}.astro`
- Test: `test/build/blog.test.ts`

**Interfaces:**
- Consumes: `lib/posts.ts`, `lib/seo.ts`, `virtual:astroblog/*`, `getCollection('blog')`, `render()`, `paginate` de `getStaticPaths`.
- Produces:
  - `index.astro` = página 1; `page.astro` = páginas 2..n con `paginate(posts, { pageSize: postsPerPage })`, omitiendo la 1 (que redirige canónicamente a `/`). Estado vacío con `ui.emptyBlog` si no hay posts.
  - `post.astro`: `getStaticPaths` desde `publishedPosts(..., { includeDrafts: import.meta.env.DEV })`; usa `PostLayout` con `data-pagefind-body` en el `<article>`; JSON-LD `BlogPosting` + `BreadcrumbList`; TOC de `headings` (depth 2–3, solo si ≥ 3); `RelatedPosts` (`relatedPosts`, 3); `ShareLinks` (X, Facebook, LinkedIn, WhatsApp, copiar enlace; solo `<a>`); `AuthorBox`; `AdSlot slot={adsense.slots.afterPost}` salvo `noAds`; warnings de longitud de title/description una vez por post.
  - `category.astro`/`tag.astro`: `groupByTaxonomy` + `paginate`; título = `label` original; sin páginas para grupos vacíos.
  - `author.astro`: posts del autor (por `slugify(author)`); usa `config.author` como ficha si coincide.
  - `AdSlot` props `{ slot?: string; format?: 'auto'|'fluid'|'rectangle'; layout?: string; minHeight?: number }`; no renderiza sin `adsense` o sin `slot`; en dev placeholder con `ui.advertisement`.
  - `PostCard` props `{ post: CollectionEntry<'blog'> }`: `card` daisyUI con imagen (`<Image>` de `astro:assets`, `alt=coverAlt`), categoría (`badge`), fecha, tiempo de lectura, `ui.readMore`.

- [ ] **Step 1: Tests de build** (`basic`):
  ```ts
  it('excludes drafts', () => expect(f.exists('blog/borrador/index.html')).toBe(false));
  it('slugifies categories with accents', () => expect(f.exists('categoria/programacion-web/index.html')).toBe(true));
  it('shows original category label', async () => expect(await f.read('categoria/programacion-web/index.html')).toContain('Programación Web'));
  it('paginates', () => { /* postsPerPage:2 en fixture → existe pagina/2/index.html, no pagina/1 */ });
  it('post has BlogPosting, pagefind body and in-article ad', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toContain('"@type":"BlogPosting"'); expect(html).toContain('data-pagefind-body');
    expect(html).toContain('data-ad="inArticle"');
  });
  it('noAds post has no ad slots', async () => expect(await f.read('blog/sin-anuncios/index.html')).not.toContain('adsbygoogle"'));
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (reemplaza la ruta provisional de Task 11). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: blog routes and post layout`.

---

### Task 13: Páginas institucionales y legales

**Files:**
- Create: `routes/institutional.astro`, `legal/es/{about,contact,privacy,cookies,terms,legal}.astro`, `legal/en/{...}.astro`
- Test: `test/build/legal.test.ts`

**Interfaces:**
- Consumes: `getEntry('pages', key)` (colección opcional; si no está definida o no hay entrada, usa plantilla), config resuelta, `CookieSettingsLink`.
- Produces:
  - `institutional.astro`: recibe la clave de la ruta (vía `Astro.url.pathname` → tabla de `virtual:astroblog/routes`); renderiza el `.md` del usuario si existe, si no `legal/<lang>/<key>.astro` dentro de `PageLayout`.
  - Plantillas reciben `{ config, updated: Date }` y muestran condicionalmente: sección de publicidad de Google con enlace `https://policies.google.com/technologies/ads` y a `https://adssettings.google.com` (si `adsense`); sección GA4 (si `analytics.ga4`); Giscus (si `comments`); nombre del proveedor CMP; derechos del usuario y contacto (`owner.email ?? author.email`).
  - `cookies`: tabla de categorías (necesarias, preferencias, estadísticas si GA4, marketing si AdSense) + `CookieSettingsLink`.
  - `contact`: email (`mailto:`) y, si `contact.formEndpoint`, `<form method="POST" action=endpoint>` con campos `name`, `email`, `message` (daisyUI `fieldset`/`input`/`textarea`) y honeypot `_gotcha`.
  - `about`: `config.author` (avatar, nombre, bio = `description`) y social.

- [ ] **Step 1: Tests de build** (`basic` y `minimal-legal` = `minimal` + `lang:'en'`, sin adsense):
  ```ts
  it('privacy mentions Google ads policy when adsense is on', async () => expect(await f.read('privacidad/index.html')).toContain('policies.google.com/technologies/ads'));
  it('privacy omits ads section without adsense', async () => expect(await en.read('privacy/index.html')).not.toContain('policies.google.com/technologies/ads'));
  it('user markdown overrides template', async () => { /* basic tiene src/content/pages/acerca.md con "Texto propio" */ });
  it('contact renders form when endpoint set', ...);
  it('cookies page includes settings button', ...);
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: institutional and legal pages`.

---

### Task 14: Endpoints de sistema, búsqueda, 404 y fixtures de casos límite

**Files:**
- Create: `routes/{search,404}.astro`, `routes/{rss.xml,robots.txt,ads.txt}.ts`
- Create: fixtures `empty` (sin posts), `base` (`site:'https://x.com'`, `base:'/blog'`, `public/_headers` propio, `public/ads.txt` propio), `overrides` (`components.Header` propio, `customCss`, `routes.terms:false`, `theme: { light:'cupcake', dark:'dracula' }`)
- Test: `test/build/system.test.ts`, `test/build/edge.test.ts`

**Interfaces:**
- Consumes: `lib/files.ts`, `lib/seo.ts`, `@astrojs/rss`, Task 9 build hook.
- Produces: `rss.xml.ts` (`rss({ title, description, site, items })` con `link` vía `routePath`), `robots.txt.ts` (`robotsTxt(absoluteUrl(site, base, 'sitemap-index.xml'))`), `ads.txt.ts` (`adsTxt(client)`), `search.astro` (fallback: input + Pagefind UI embebido), `404.astro` (`ui.notFoundTitle`, últimos 3 posts, enlace a inicio).

- [ ] **Step 1: Tests**
  ```ts
  // basic
  it('emits system files', () => { for (const p of ['rss.xml','robots.txt','ads.txt','sitemap-index.xml','404.html','_headers','pagefind/pagefind.js']) expect(f.exists(p)).toBe(true); });
  it('ads.txt content', async () => expect(await f.read('ads.txt')).toBe('google.com, pub-123, DIRECT, f08c47fec0942fa0\n'));
  // minimal (sin adsense)
  it('no ads.txt nor adsense script without adsense', ...);
  // empty
  it('builds with no posts and shows empty state', ...); it('creates no category pages', ...);
  // base
  it('canonical and sitemap respect base', async () => { expect(await b.read('index.html')).toContain('href="https://x.com/blog/"'); expect(await b.read('robots.txt')).toContain('https://x.com/blog/sitemap-index.xml'); });
  it('keeps user ads.txt and merges user _headers', ...);
  // overrides
  it('uses overridden Header', ...); it('omits disabled terms route', ...);
  it('includes custom css and built-in themes', ...); // CSS emitido contiene la variable del customCss y "cupcake"
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: system endpoints, search, 404 and edge-case fixtures`.

---

### Task 15: ConsentGate, comentarios Giscus y GA4

**Files:**
- Create: `components/ConsentGate.astro`, `components/Comments.astro`
- Modify: `layouts/PostLayout.astro` (incluir `Comments` si `config.comments`)
- Test: `test/build/consent.test.ts`

**Interfaces:**
- Consumes: `onConsent` (Task 7), `reopenScript`.
- Produces:
  - `ConsentGate` props `{ category: 'marketing'|'statistics'|'preferences' }`: renderiza el slot dentro de `<template data-consent-gate>` y un placeholder (`alert` daisyUI, `ui.consentRequired`, botón `ui.manageCookies` que ejecuta `reopenScript`); script de cliente clona el template al recibir `onConsent`.
  - `Comments`: `ConsentGate category="preferences"` envolviendo el `<script src="https://giscus.app/client.js" data-repo ... data-theme="preferred_color_scheme" data-lang=<lang> async>`.

- [ ] **Step 1: Tests de build** (`basic` con `comments.giscus` configurado):
  ```ts
  it('giscus is inside a consent template', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toMatch(/<template data-consent-gate[^>]*>[\s\S]*giscus\.app\/client\.js[\s\S]*<\/template>/);
  });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: consent gate and giscus comments`.

---

### Task 16: Demo, documentación, CI y publicación

**Files:**
- Create: `examples/demo/` (`package.json` con `"@didierp/astroblog": "workspace:*"`, `astro.config.mjs` con todas las opciones comentadas, 6 posts reales de ejemplo en español, `src/styles/tema.css`, `src/content/pages/acerca.md`)
- Create: `packages/astroblog/README.md`, `.changeset/config.json`, `.github/workflows/ci.yml`, `lighthouserc.json`
- Test: `examples/demo` build + `astro check`

**Interfaces:**
- Consumes: todo el paquete.

- [ ] **Step 1:** Crear demo; `pnpm --filter demo build` → éxito sin warnings de config; `pnpm --filter demo exec astro check` → 0 errores.
- [ ] **Step 2:** README con secciones: Instalación, Configuración (tabla de todas las opciones de spec §3 con tipo/default), Contenido (frontmatter), Personalizar el tema (ejemplo de spec §7), Sustituir componentes (lista de claves y props), Consentimiento (paso a paso de Privacidad y mensajes en AdSense; Cookiebot; CookieYes; custom con evento `astroblog:consent`), Checklist AdSense, Despliegue en Cloudflare Pages (build `pnpm --filter demo build`, salida `examples/demo/dist`, `NODE_VERSION=22.23`), Aviso legal sobre plantillas.
- [ ] **Step 3:** CI (`ubuntu-latest`, Node 22.23, pnpm): `pnpm install --frozen-lockfile`, `pnpm -r test`, `pnpm build:demo`, `astro check`, Lighthouse CI sobre `examples/demo/dist` con aserciones `categories:seo >= 1`, `categories:performance >= 0.95`. Job `release` en `main` con `changesets/action` → `pnpm changeset publish` (secreto `NPM_TOKEN`).
- [ ] **Step 4:** `pnpm changeset` inicial (`minor`, "Primera versión"). Ejecutar `pnpm -r test` y `pnpm build:demo` → todo PASS.
- [ ] **Step 5:** Commit `docs: demo, README, CI and release setup`.
