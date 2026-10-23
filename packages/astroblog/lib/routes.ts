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

function enabled(config: ResolvedConfig, key: RouteKey): boolean {
  if (config.routes?.[key] === false) return false;
  if (key === 'adsTxt') return Boolean(config.adsense);
  return true;
}

function routesFor(config: ResolvedConfig, key: RouteKey): ResolvedRoute[] {
  switch (key) {
    case 'home':
      return [
        { key, pattern: '/', entry: 'index.astro' },
        { key, pattern: `/${slug(config, 'page')}/[page]`, entry: 'page.astro' },
      ];
    case 'post': return [{ key, pattern: '/blog/[...slug]', entry: 'post.astro' }];
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

/**
 * Public path relative to `base` (no base prefix). With `param`, param-based routes
 * (post, category, tag, author) resolve to the concrete page; without it they resolve
 * to the section root (e.g. '/categoria'). `home` is always '/'. Ignores `routes.<key> === false`.
 */
export function routePath(config: ResolvedConfig, key: RouteKey, param?: string): string {
  const withParam = (prefix: string) => (param ? `${prefix}/${param}` : prefix);
  switch (key) {
    case 'home': return '/';
    case 'post': return withParam('/blog');
    case 'category': return withParam(`/${slug(config, 'category')}`);
    case 'tag': return withParam(`/${slug(config, 'tag')}`);
    case 'author': return withParam(`/${slug(config, 'author')}`);
    case 'search': return `/${slug(config, 'search')}`;
    case 'notFound': return '/404';
    case 'rss': return '/rss.xml';
    case 'robots': return '/robots.txt';
    case 'adsTxt': return '/ads.txt';
    default: return `/${slug(config, key)}`;
  }
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/**
 * Prefixes a base-relative path with Astro's `base` (`import.meta.env.BASE_URL`),
 * never producing `//`. External URLs, protocol-relative URLs, `mailto:` and `#hash` are returned as is.
 */
export function withBase(base: string, path: string): string {
  if (EXTERNAL.test(path)) return path;
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

/** Inverse of `withBase` for a pathname (e.g. `Astro.url.pathname`): returns the base-relative path. */
export function stripBase(base: string, pathname: string): string {
  const b = base.replace(/\/+$/, '');
  if (!b) return pathname;
  if (pathname === b || pathname === `${b}/`) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}

/**
 * Base-relative path of a taxonomy page (`/categoria/programacion-web`) from the section paths of
 * `virtual:astroblog/routes`; undefined when that route is disabled or the label has no slug.
 */
export function taxonomyPath(
  paths: Partial<Record<RouteKey, string>>,
  key: 'category' | 'tag' | 'author',
  label: string,
): string | undefined {
  const section = paths[key];
  const s = slugify(label);
  return section && s ? `${section}/${s}` : undefined;
}

/** Base-relative paths of pages 1..lastPage: page 1 is `first`, page n is `${prefix}/n`. */
export function paginationPaths(first: string, prefix: string, lastPage: number): string[] {
  const p = prefix.replace(/\/+$/, '');
  return Array.from({ length: Math.max(1, lastPage) }, (_, i) => (i === 0 ? first : `${p}/${i + 1}`));
}

/** Base-relative prefix of the home listing pages 2..n (`/pagina` → `/pagina/2`). */
export function homePagesPrefix(config: ResolvedConfig): string {
  return `/${slug(config, 'page')}`;
}
