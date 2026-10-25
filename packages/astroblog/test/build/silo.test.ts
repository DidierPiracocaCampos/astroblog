import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';

let f: BuiltFixture;

beforeAll(async () => {
  f = await buildFixture('silo');
});

/** JSON-LD objects of a page. */
const jsonLd = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));

describe('silo fixture: permalinks', () => {
  it('publishes each category listing at /<cat>/ with pages under /pagina/', () => {
    expect(f.exists('requisitos/index.html')).toBe(true);
    expect(f.exists('requisitos/pagina/2/index.html')).toBe(true);
    expect(f.exists('requisitos/pagina/3/index.html')).toBe(false);
    expect(f.exists('gastos/index.html')).toBe(true);
  });
  it('publishes posts at /<cat>/<slug>/ whatever their folder', () => {
    expect(f.exists('requisitos/edad/index.html')).toBe(true);
    expect(f.exists('requisitos/nomina/index.html')).toBe(true);
    expect(f.exists('gastos/tasacion/index.html')).toBe(true);
  });
  it('publishes nothing under /blog/ or /categoria/', () => {
    expect(f.exists('blog')).toBe(false);
    expect(f.exists('categoria')).toBe(false);
  });
  it('links cards, breadcrumbs and pagination to silo URLs', async () => {
    const home = await f.read('index.html');
    expect(home).toContain('href="/requisitos/edad/"');
    expect(home).toContain('href="/requisitos/"');
    const listing = await f.read('requisitos/index.html');
    expect(listing).toContain('href="/requisitos/pagina/2/"');
    const post = await f.read('requisitos/edad/index.html');
    expect(post).toContain('<link rel="canonical" href="https://hipotecas.example/requisitos/edad/"');
    const crumbs = jsonLd(post).find((j) => j['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.map((i: { item: string }) => i.item)).toEqual([
      'https://hipotecas.example/', 'https://hipotecas.example/requisitos/', 'https://hipotecas.example/requisitos/edad/']);
  });
  it('uses silo URLs in the sitemap and the RSS feed', async () => {
    const sitemap = await f.read('sitemap-0.xml');
    expect(sitemap).toContain('<loc>https://hipotecas.example/requisitos/edad/</loc>');
    expect(sitemap).toContain('<loc>https://hipotecas.example/requisitos/</loc>');
    expect(sitemap).not.toContain('/blog/');
    const rss = await f.read('rss.xml');
    expect(rss).toContain('<link>https://hipotecas.example/gastos/tasacion/</link>');
    expect(rss).not.toContain('/blog/');
  });
});

describe('silo fixture: YMYL signals', () => {
  let html: string;
  beforeAll(async () => {
    html = await f.read('requisitos/edad/index.html');
  });

  it('emits FAQPage, reviewedBy and the configured article type', () => {
    const ld = jsonLd(html);
    const faq = ld.find((j) => j['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('La mayoría de bancos exige terminar de pagar antes de los 75 años.');
    expect(ld.find((j) => j['@type'] === 'WebPage')).toMatchObject({
      url: 'https://hipotecas.example/requisitos/edad/',
      reviewedBy: { '@type': 'Person', name: 'Luis Gómez', jobTitle: 'Notario', url: 'https://luis.example' },
      lastReviewed: '2026-04-02',
    });
    const article = ld.find((j) => j['@type'] === 'Article');
    expect(article.author).toMatchObject({ name: 'Ana Pérez', jobTitle: 'Economista', sameAs: ['https://www.linkedin.com/in/ana'] });
  });
  it('renders the header line, FAQ, sources, reviewer and disclaimer in order', () => {
    expect(html).toMatch(/Revisado por Luis Gómez · Notario/);
    expect(html).toMatch(/Actualizado el <time datetime="2026-04-01/);
    expect(html).toContain('<strong>75 años</strong>');
    expect(html).toContain('<a href="https://clientebancario.bde.es" class="link link-primary" rel="nofollow noopener" target="_blank">');
    const order = ['id="faq-title"', 'id="sources-title"', 'aria-label="Revisado por"', 'data-disclaimer', 'aria-label="Autor"']
      .map((s) => html.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain('no constituye asesoramiento financiero');
  });
  it('shows the author job title and bio', () => {
    expect(html).toContain('Diez años en banca hipotecaria.');
  });
  it('omits FAQ, sources and reviewer on posts without them, but keeps the disclaimer', async () => {
    const plain = await f.read('gastos/tasacion/index.html');
    expect(plain).not.toContain('faq-title');
    expect(plain).not.toContain('FAQPage');
    expect(plain).not.toContain('reviewedBy');
    expect(plain).toContain('data-disclaimer');
  });
});

describe('silo fixture: own pages with the exported layouts', () => {
  it('builds src/pages/calculadoras with the site header and footer', async () => {
    const html = await f.read('calculadoras/index.html');
    expect(html).toContain('data-calculadora');
    expect(html).toMatch(/<header[\s>]/);
    expect(html).toMatch(/<footer[\s>]/);
    expect(html).toContain('<title>Calculadoras | Hipotecas Claras</title>');
  });
  it('shows the author bio on the about page', async () =>
    expect(await f.read('acerca/index.html')).toContain('Diez años en banca hipotecaria.'));
});
