import { describe, it, expect } from 'vitest';
import { parseConfig } from '../../schema/config';
import { resolveRoutes, routePath, stripBase, withBase } from '../../lib/routes';

const base = { title: 'T', description: 'D' };
const patterns = (c: unknown) => resolveRoutes(parseConfig(c)).map((x) => x.pattern);

describe('routes', () => {
  it('builds spanish routes', () => {
    const r = resolveRoutes(parseConfig(base));
    expect(r.map((x) => x.pattern)).toEqual(expect.arrayContaining(['/', '/pagina/[page]', '/blog/[...slug]',
      '/categoria/[cat]/[...page]', '/etiqueta/[tag]/[...page]', '/autor/[author]', '/acerca', '/contacto',
      '/privacidad', '/cookies', '/terminos', '/aviso-legal', '/buscar', '/404', '/rss.xml', '/robots.txt']));
    expect(r.find((x) => x.key === 'adsTxt')).toBeUndefined();
    expect(r.filter((x) => x.key === 'home').map((x) => x.entry)).toEqual(['index.astro', 'page.astro']);
    expect(r.find((x) => x.key === 'terms')!.entry).toBe('institutional.astro');
  });
  it('uses english slugs', () => {
    expect(patterns({ ...base, lang: 'en' })).toEqual(expect.arrayContaining(
      ['/category/[cat]/[...page]', '/legal-notice', '/page/[page]', '/about', '/search']));
  });
  it('omits disabled routes', () => {
    const p = patterns({ ...base, routes: { terms: false } });
    expect(p).not.toContain('/terminos');
    expect(p).toContain('/privacidad');
  });
  it('omits the search page when search is off', () => {
    expect(patterns(base)).toContain('/buscar');
    expect(patterns({ ...base, search: false })).not.toContain('/buscar');
  });
  it('applies slug overrides', () => {
    const c = parseConfig({ ...base, slugs: { category: 'temas', about: '/quienes-somos/' } });
    expect(resolveRoutes(c).map((x) => x.pattern)).toEqual(expect.arrayContaining(['/temas/[cat]/[...page]', '/quienes-somos']));
    expect(routePath(c, 'category', 'x')).toBe('/temas/x/');
    expect(routePath(c, 'about')).toBe('/quienes-somos/');
  });
  it('includes ads.txt with adsense', () => {
    const adsense = { client: 'ca-pub-123' };
    const r = resolveRoutes(parseConfig({ ...base, adsense }));
    expect(r.find((x) => x.key === 'adsTxt')).toMatchObject({ pattern: '/ads.txt', entry: 'ads.txt.ts' });
    expect(patterns({ ...base, adsense, routes: { adsTxt: false } })).not.toContain('/ads.txt');
  });
  it('routePath handles keys with and without params', () => {
    const c = parseConfig(base);
    expect(routePath(c, 'home')).toBe('/');
    expect(routePath(c, 'category', 'web')).toBe('/categoria/web/');
    expect(routePath(c, 'category')).toBe('/categoria/');
    expect(routePath(c, 'post', '2024/hola')).toBe('/blog/2024/hola/');
    expect(routePath(c, 'post', 'v1.2-notas')).toBe('/blog/v1.2-notas/');
    expect(routePath(c, 'legal')).toBe('/aviso-legal/');
    expect(routePath(parseConfig({ ...base, lang: 'en' }), 'author', 'ana')).toBe('/author/ana/');
  });
  it('routePath ends page paths with a slash but not file-like or 404 paths', () => {
    const c = parseConfig(base);
    expect(routePath(c, 'search')).toBe('/buscar/');
    expect(routePath(c, 'rss')).toBe('/rss.xml');
    expect(routePath(c, 'robots')).toBe('/robots.txt');
    expect(routePath(c, 'adsTxt')).toBe('/ads.txt');
    expect(routePath(c, 'notFound')).toBe('/404');
  });
});

describe('withBase', () => {
  it('joins base and path without double slashes', () => {
    expect(withBase('/', '/privacidad')).toBe('/privacidad/');
    expect(withBase('/', '/')).toBe('/');
    expect(withBase('/blog', '/privacidad')).toBe('/blog/privacidad/');
    expect(withBase('/blog/', '/privacidad')).toBe('/blog/privacidad/');
    expect(withBase('/blog/', '/')).toBe('/blog/');
    expect(withBase('/blog', 'pagefind/')).toBe('/blog/pagefind/');
  });
  it('ends page paths with a slash, keeping files, query and hash', () => {
    expect(withBase('/', '/categoria/diseno')).toBe('/categoria/diseno/');
    expect(withBase('/', '/categoria/diseno/')).toBe('/categoria/diseno/');
    expect(withBase('/blog', '/logo.svg')).toBe('/blog/logo.svg');
    expect(withBase('/', '/rss.xml')).toBe('/rss.xml');
    expect(withBase('/', '/a.b/c')).toBe('/a.b/c/');
    expect(withBase('/', '/buscar?q=x')).toBe('/buscar/?q=x');
    expect(withBase('/', '/acerca#equipo')).toBe('/acerca/#equipo');
  });
  it('leaves external, protocol-relative, hash and mailto hrefs untouched', () => {
    expect(withBase('/blog', 'https://x.com/a')).toBe('https://x.com/a');
    expect(withBase('/blog', '//cdn.x.com/a')).toBe('//cdn.x.com/a');
    expect(withBase('/blog', '#top')).toBe('#top');
    expect(withBase('/blog', 'mailto:a@b.c')).toBe('mailto:a@b.c');
  });
});

describe('stripBase', () => {
  it('removes the base prefix from a pathname', () => {
    expect(stripBase('/', '/privacidad')).toBe('/privacidad');
    expect(stripBase('/blog', '/blog/privacidad')).toBe('/privacidad');
    expect(stripBase('/blog/', '/blog/')).toBe('/');
    expect(stripBase('/blog', '/blog')).toBe('/');
    expect(stripBase('/blog', '/blogger')).toBe('/blogger');
  });
});
