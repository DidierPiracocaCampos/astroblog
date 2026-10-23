import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';
import { getUI } from '../../i18n/index';

const ui = getUI('es');
let f: BuiltFixture;

beforeAll(async () => {
  f = await buildFixture('basic');
});

describe('basic fixture: system files', () => {
  it('emits system files', () => {
    for (const p of ['rss.xml', 'robots.txt', 'ads.txt', 'sitemap-index.xml', '404.html', '_headers', 'pagefind/pagefind.js']) {
      expect(f.exists(p), p).toBe(true);
    }
  });

  it('ads.txt content', async () => expect(await f.read('ads.txt')).toBe('google.com, pub-123, DIRECT, f08c47fec0942fa0\n'));

  it('robots.txt points to the absolute sitemap index', async () => {
    expect(await f.read('robots.txt')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap-index.xml\n');
  });

  it('rss.xml lists published posts with absolute trailing-slash links, newest first', async () => {
    const rss = await f.read('rss.xml');
    expect(rss).toContain('<title>Blog Básico</title>');
    expect(rss).toContain('<language>es</language>');
    const links = [...rss.matchAll(/<item>.*?<link>(.*?)<\/link>/gs)].map((m) => m[1]);
    expect(links).toEqual([
      'https://example.com/blog/sin-anuncios/',
      'https://example.com/blog/post-largo/',
      'https://example.com/blog/hola-mundo/',
    ]);
    expect(rss).not.toContain('borrador');
    expect(rss).toContain('<category>Programación Web</category>');
  });

  it('sitemap lists pages but not the 404 page', async () => {
    expect(await f.read('sitemap-index.xml')).toContain('https://example.com/sitemap-0.xml');
    const sitemap = await f.read('sitemap-0.xml');
    expect(sitemap).toContain('<loc>https://example.com/blog/hola-mundo/</loc>');
    expect(sitemap).not.toContain('404');
  });

  it('404 page shows the not-found texts, the latest 3 posts and a link home', async () => {
    const html = await f.read('404.html');
    expect(html).toContain(ui.notFoundTitle);
    expect(html).toContain(ui.notFoundBody);
    expect(html).toMatch(new RegExp(`<a [^>]*href="/"[^>]*>${ui.backHome}</a>`));
    expect(html.match(/class="card /g)).toHaveLength(3);
    for (const slug of ['sin-anuncios', 'post-largo', 'hola-mundo']) expect(html).toContain(`href="/blog/${slug}/"`);
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it('search page embeds Pagefind UI loaded relative to base, with a no-JS form', async () => {
    const html = await f.read('buscar/index.html');
    expect(html).toContain(`<h1`);
    expect(html).toContain(ui.search);
    expect(html).toContain('data-bundle="/pagefind/"');
    expect(html).toMatch(/<form [^>]*role="search"[^>]*action="\/buscar\/"/);
    expect(html).toContain('name="q"');
    expect(html).toContain(`placeholder="${ui.searchPlaceholder}"`);
  });
});

describe('minimal fixture (no adsense)', () => {
  it('no ads.txt nor adsense script without adsense', async () => {
    const m = await buildFixture('minimal');
    expect(m.exists('ads.txt')).toBe(false);
    for (const p of ['index.html', '404.html', 'buscar/index.html']) expect(await m.read(p)).not.toContain('adsbygoogle');
  });
});

describe('nosite fixture (no site)', () => {
  it('robots.txt has no Sitemap line and rss.xml is not generated', async () => {
    const n = await buildFixture('nosite');
    expect(await n.read('robots.txt')).toBe('User-agent: *\nAllow: /\n');
    expect(n.exists('rss.xml')).toBe(false);
  });

  it('search page is not generated when search is off', async () => {
    const n = await buildFixture('nosite');
    expect(n.exists('buscar/index.html')).toBe(false);
    expect(n.exists('404.html')).toBe(true);
  });
});
