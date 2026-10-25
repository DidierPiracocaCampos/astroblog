import type { Lang, ResolvedConfig, RouteKey } from '../schema/config';
import { ROUTE_KEYS } from '../schema/config';
import { slugify } from './posts';

export interface ResolvedRoute {
  key: RouteKey;
  pattern: string;
  /** File name inside routes/ */
  entry: string;
}

type SlugKey =
  | 'category' | 'tag' | 'author' | 'page' | 'about' | 'contact' | 'privacy'
  | 'cookies' | 'terms' | 'legal' | 'search';

const DEFAULT_SLUGS: Record<Lang, Record<SlugKey, string>> = {
  es: {
    category: 'categoria', tag: 'etiqueta', author: 'autor', page: 'pagina',
    about: 'acerca', contact: 'contacto', privacy: 'privacidad', cookies: 'cookies',
    terms: 'terminos', legal: 'aviso-legal', search: 'buscar',
  },
  en: {
    category: 'category', tag: 'tag', author: 'author', page: 'page',
    about: 'about', contact: 'contact', privacy: 'privacy', cookies: 'cookies',
    terms: 'terms', legal: 'legal-notice', search: 'search',
  },
};

function slug(config: ResolvedConfig, key: SlugKey): string {
  const clean = config.slugs?.[key]?.replace(/^\/+|\/+$/g, '');
  return clean || DEFAULT_SLUGS[config.lang][key];
}

const silo = (config: ResolvedConfig) => config.permalinks === 'silo';

function enabled(config: ResolvedConfig, key: RouteKey): boolean {
  // Silo mode serves posts and category listings from one `/[...path]` route (keyed `post`).
  if (silo(config) && key === 'post') return true;
  if (silo(config) && key === 'category') return false;
  if (config.routes?.[key] === false) return false;
  if (key === 'adsTxt') return Boolean(config.adsense);
  if (key === 'search') return config.search;
  return true;
}

function routesFor(config: ResolvedConfig, key: RouteKey): ResolvedRoute[] {
  switch (key) {
    case 'home':
      return [
        { key, pattern: '/', entry: 'index.astro' },
        { key, pattern: `/${slug(config, 'page')}/[page]`, entry: 'page.astro' },
      ];
    case 'post':
      return silo(config)
        ? [{ key, pattern: '/[...path]', entry: 'silo.astro' }]
        : [{ key, pattern: '/blog/[...slug]', entry: 'post.astro' }];
    case 'category': return [{ key, pattern: `/${slug(config, 'category')}/[cat]/[...page]`, entry: 'category.astro' }];
    case 'tag': return [{ key, pattern: `/${slug(config, 'tag')}/[tag]/[...page]`, entry: 'tag.astro' }];
    case 'author': return [{ key, pattern: `/${slug(config, 'author')}/[author]`, entry: 'author.astro' }];
    case 'search': return [{ key, pattern: `/${slug(config, 'search')}`, entry: 'search.astro' }];
    case 'notFound': return [{ key, pattern: '/404', entry: '404.astro' }];
    case 'rss': return [{ key, pattern: '/rss.xml', entry: 'rss.xml.ts' }];
    case 'robots': return [{ key, pattern: '/robots.txt', entry: 'robots.txt.ts' }];
    case 'adsTxt': return [{ key, pattern: '/ads.txt', entry: 'ads.txt.ts' }];
    default: // about, contact, privacy, cookies, terms, legal
      return [{ key, pattern: `/${slug(config, key)}`, entry: 'institutional.astro' }];
  }
}

export function resolveRoutes(config: ResolvedConfig): ResolvedRoute[] {
  return ROUTE_KEYS.filter((k) => enabled(config, k)).flatMap((k) => routesFor(config, k));
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/**
 * Page paths end with '/', matching the `directory` build output, canonicals and the sitemap, so
 * links never take a redirect hop. File-like paths (a '.' in the last segment: `rss.xml`, `logo.svg`),
 * external URLs, `#hash` and `mailto:` are kept as is; a query or hash suffix is preserved.
 */
export function pageSlash(path: string): string {
  if (EXTERNAL.test(path)) return path;
  const [, p, rest] = path.match(/^([^?#]*)(.*)$/s)!;
  if (!p || p.endsWith('/') || p.slice(p.lastIndexOf('/') + 1).includes('.')) return path;
  return `${p}/${rest}`;
}

/**
 * Public path relative to `base` (no base prefix), ending with '/' for pages (see `pageSlash`).
 * With `param`, param-based routes (post, category, tag, author) resolve to the concrete page;
 * without it they resolve to the section root (e.g. '/categoria/'). `home` is always '/';
 * `notFound` stays '/404' (built as 404.html). Ignores `routes.<key> === false`.
 */
export function routePath(config: ResolvedConfig, key: RouteKey, param?: string): string {
  // Param routes are always pages (an id like 'v1.2-notas' is not a file): always end with '/'.
  const withParam = (prefix: string) => (param ? `${prefix}/${param.replace(/^\/+|\/+$/g, '')}/` : `${prefix}/`);
  switch (key) {
    case 'home': return '/';
    case 'post': return withParam(silo(config) ? '' : '/blog');
    case 'category': return withParam(silo(config) ? '' : `/${slug(config, 'category')}`);
    case 'tag': return withParam(`/${slug(config, 'tag')}`);
    case 'author': return withParam(`/${slug(config, 'author')}`);
    case 'notFound': return '/404';
    case 'rss': return '/rss.xml';
    case 'robots': return '/robots.txt';
    case 'adsTxt': return '/ads.txt';
    default: return pageSlash(`/${slug(config, key)}`); // search and institutional pages
  }
}

/**
 * Prefixes a base-relative path with Astro's `base` (`import.meta.env.BASE_URL`), never producing
 * `//`, and ends page paths with '/' (`pageSlash`). External URLs, protocol-relative URLs, `mailto:`
 * and `#hash` are returned as is.
 */
export function withBase(base: string, path: string): string {
  if (EXTERNAL.test(path)) return path;
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return pageSlash(`${b}/${p}`);
}

/** Inverse of `withBase` for a pathname (e.g. `Astro.url.pathname`): returns the base-relative path. */
export function stripBase(base: string, pathname: string): string {
  const b = base.replace(/\/+$/, '');
  if (!b) return pathname;
  if (pathname === b || pathname === `${b}/`) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}

/**
 * Base-relative path of a taxonomy page (`/categoria/programacion-web/`) from the section paths of
 * `virtual:astroblog/routes`; undefined when that route is disabled or the label has no slug.
 */
export function taxonomyPath(
  paths: Partial<Record<RouteKey, string>>,
  key: 'category' | 'tag' | 'author',
  label: string,
): string | undefined {
  const section = paths[key]?.replace(/\/+$/, ''); // '' for the root section of silo mode
  const s = slugify(label);
  return section !== undefined && s ? `${section}/${s}/` : undefined;
}

/** Last segment of a post id: its slug in silo mode (`requisitos/edad` → `edad`). */
export function postSlug(id: string): string {
  return id.replace(/\/+$/, '').split('/').pop()!;
}

/**
 * Base-relative path of a post page: `/blog/<id>/`, or `/<category slug>/<post slug>/` in silo mode
 * (the file's folder does not count; `category` decides the silo).
 */
export function postPath(config: ResolvedConfig, post: { id: string; data: { category: string } }): string {
  if (!silo(config)) return routePath(config, 'post', post.id);
  return `/${slugify(post.data.category)}/${postSlug(post.id)}/`;
}

/**
 * Prefix of a taxonomy listing's pages 2..n: `path` itself (`/categoria/x/2/`), or `path` + the
 * page slug for a silo (`/x/pagina/2/`), whose `/x/<slug>/` paths belong to posts.
 */
export function taxonomyPagesPrefix(config: ResolvedConfig, path: string): string {
  return silo(config) ? `${path.replace(/\/+$/, '')}/${slug(config, 'page')}` : path;
}

/** Top-level slugs a silo category cannot take: astroblog's own sections and pages, and `404`. */
export function reservedSlugs(config: ResolvedConfig): string[] {
  const keys = Object.keys(DEFAULT_SLUGS[config.lang]) as SlugKey[];
  return [...keys.filter((k) => k !== 'category').map((k) => slug(config, k)), '404'];
}

/** Base-relative paths of pages 1..lastPage: page 1 is `first`, page n is `${prefix}/n/`. */
export function paginationPaths(first: string, prefix: string, lastPage: number): string[] {
  const p = prefix.replace(/\/+$/, '');
  return Array.from({ length: Math.max(1, lastPage) }, (_, i) => (i === 0 ? pageSlash(first) : `${p}/${i + 1}/`));
}

/** Base-relative prefix of the home listing pages 2..n (`/pagina` → `/pagina/2/`). */
export function homePagesPrefix(config: ResolvedConfig): string {
  return `/${slug(config, 'page')}`;
}
