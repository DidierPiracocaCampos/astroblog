import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';
import { getUI } from '../../i18n/index';

const ui = getUI('es');

describe('empty fixture (only a draft)', () => {
  let e: BuiltFixture;
  beforeAll(async () => {
    e = await buildFixture('empty');
  });

  it('builds with no posts and shows empty state', async () => {
    const home = await e.read('index.html');
    expect(home).toContain(ui.emptyBlog);
    expect(home).not.toContain('class="card ');
    expect(e.exists('blog')).toBe(false);
    expect(e.exists('pagina')).toBe(false);
  });

  it('creates no category pages', () => {
    for (const dir of ['categoria', 'etiqueta', 'autor']) expect(e.exists(dir), dir).toBe(false);
  });

  it('still emits the system files: rss without items, 404 without posts', async () => {
    const rss = await e.read('rss.xml');
    expect(rss).toContain('<channel>');
    expect(rss).not.toContain('<item>');
    const notFound = await e.read('404.html');
    expect(notFound).toContain(ui.notFoundTitle);
    expect(notFound).not.toContain('class="card ');
  });
});

describe('base fixture (site https://x.com, base /blog)', () => {
  let b: BuiltFixture;
  beforeAll(async () => {
    b = await buildFixture('base');
  });

  it('canonical and sitemap respect base', async () => {
    expect(await b.read('index.html')).toContain('href="https://x.com/blog/"');
    expect(await b.read('robots.txt')).toContain('https://x.com/blog/sitemap-index.xml');
  });

  it('sitemap, rss and internal links carry base without "//"', async () => {
    expect(await b.read('sitemap-index.xml')).toContain('<loc>https://x.com/blog/sitemap-0.xml</loc>');
    const sitemap = await b.read('sitemap-0.xml');
    expect(sitemap).toContain('<loc>https://x.com/blog/blog/primero/</loc>');
    expect(sitemap).not.toMatch(/https:\/\/x\.com\/\//);
    const rss = await b.read('rss.xml');
    expect(rss).toContain('<link>https://x.com/blog/blog/primero/</link>');
    expect(rss).toContain('<link>https://x.com/blog/</link>');
    expect(rss).not.toMatch(/https:\/\/x\.com\/\//);
    const notFound = await b.read('404.html');
    expect(notFound).toContain('href="/blog/blog/primero/"');
    expect(notFound).toMatch(new RegExp(`<a [^>]*href="/blog/"[^>]*>${ui.backHome}</a>`));
    const search = await b.read('buscar/index.html');
    expect(search).toContain('data-bundle="/blog/pagefind/"');
    expect(search).toMatch(/action="\/blog\/buscar\/"/);
  });

  it('keeps user ads.txt and merges user _headers', async () => {
    expect(await b.read('ads.txt')).toBe('google.com, pub-777, DIRECT, f08c47fec0942fa0\n# own ads.txt\n');
    const headers = await b.read('_headers');
    expect(headers).toContain('/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n');
    expect(headers).toContain('  X-Frame-Options: DENY\n');
    expect(headers).toContain('  Referrer-Policy: no-referrer\n');
    expect(headers).not.toContain('strict-origin-when-cross-origin');
    expect(headers).toContain('  X-Content-Type-Options: nosniff\n');
  });
});

describe('overrides fixture', () => {
  let o: BuiltFixture;
  beforeAll(async () => {
    o = await buildFixture('overrides');
  });

  it('uses overridden Header', async () => {
    const home = await o.read('index.html');
    expect(home).toContain('<header data-custom-header="/">Cabecera propia</header>');
    expect(home).not.toContain('class="navbar');
    expect(await o.read('blog/hola/index.html')).toContain('data-custom-header="/blog/hola/"');
  });

  it('omits disabled terms route', async () => {
    expect(o.exists('terminos/index.html')).toBe(false);
    expect(o.exists('privacidad/index.html')).toBe(true);
    expect(await o.read('index.html')).not.toContain('href="/terminos/"');
  });

  it('includes custom css and built-in themes', () => {
    const dir = join(o.dist, '_astro');
    const css = readdirSync(dir).filter((n) => n.endsWith('.css')).map((n) => readFileSync(join(dir, n), 'utf8')).join('\n');
    expect(css).toContain('--astroblog-fixture-marker');
    expect(css).toContain('cupcake');
    expect(css).toContain('dracula');
    expect(css).not.toContain('astroblog-light');
  });
});
