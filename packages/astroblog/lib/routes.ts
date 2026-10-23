import type { Lang, ResolvedConfig, RouteKey } from '../schema/config';
import { ROUTE_KEYS } from '../schema/config';

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
