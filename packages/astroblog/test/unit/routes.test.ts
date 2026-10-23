import { describe, it, expect } from 'vitest';
import { parseConfig } from '../../schema/config';
import { resolveRoutes, routePath } from '../../lib/routes';

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
  it('applies slug overrides', () => {
    const c = parseConfig({ ...base, slugs: { category: 'temas', about: '/quienes-somos/' } });
    expect(resolveRoutes(c).map((x) => x.pattern)).toEqual(expect.arrayContaining(['/temas/[cat]/[...page]', '/quienes-somos']));
    expect(routePath(c, 'category', 'x')).toBe('/temas/x');
    expect(routePath(c, 'about')).toBe('/quienes-somos');
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
    expect(routePath(c, 'category', 'web')).toBe('/categoria/web');
    expect(routePath(c, 'category')).toBe('/categoria');
    expect(routePath(c, 'post', '2024/hola')).toBe('/blog/2024/hola');
    expect(routePath(c, 'legal')).toBe('/aviso-legal');
    expect(routePath(parseConfig({ ...base, lang: 'en' }), 'author', 'ana')).toBe('/author/ana');
  });
});
