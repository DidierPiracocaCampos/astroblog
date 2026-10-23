import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';
import { getUI } from '../../i18n/index';

const ui = getUI('es');
let f: BuiltFixture;

beforeAll(async () => {
  f = await buildFixture('basic');
});

/** JSON-LD objects of a page. */
const jsonLd = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));

describe('basic fixture: blog routes', () => {
  it('excludes drafts', () => expect(f.exists('blog/borrador/index.html')).toBe(false));
  it('slugifies categories with accents', () => expect(f.exists('categoria/programacion-web/index.html')).toBe(true));
  it('shows original category label', async () => expect(await f.read('categoria/programacion-web/index.html')).toContain('Programación Web'));

  it('paginates', async () => {
    // 3 published posts, postsPerPage: 2 → home is page 1, /pagina/2 is the last page.
    expect(f.exists('pagina/2/index.html')).toBe(true);
    expect(f.exists('pagina/1/index.html')).toBe(false);
    expect(f.exists('pagina/3/index.html')).toBe(false);
    const home = await f.read('index.html');
    expect(home).toContain('href="/pagina/2/"');
    const page2 = await f.read('pagina/2/index.html');
    expect(page2).toContain('<link rel="canonical" href="https://example.com/pagina/2/"');
    expect(page2).toContain('href="/"');
  });

  it('home lists the newest published posts as cards, with category, date, reading time and read more', async () => {
    const home = await f.read('index.html');
    expect(home.match(/class="card /g)).toHaveLength(2);
    // newest first: sin-anuncios (2026-03-20), post-largo (2026-02-15)
    expect(home.indexOf('href="/blog/sin-anuncios/"')).toBeGreaterThan(-1);
    expect(home.indexOf('href="/blog/sin-anuncios/"')).toBeLessThan(home.indexOf('href="/blog/post-largo/"'));
    expect(home).not.toContain('href="/blog/hola-mundo/"');
    expect(home).not.toContain('/blog/borrador');
    expect(home).toContain('badge');
    expect(home).toContain('20 de marzo de 2026');
    expect(home).toContain('1 min de lectura');
    expect(home).toContain(ui.readMore);
  });

  it('renders covers with astro:assets and coverAlt', async () => {
    const page2 = await f.read('pagina/2/index.html');
    expect(page2).toMatch(/<img [^>]*src="\/_astro\/[^"]+\.webp"[^>]*>/);
    expect(page2).toContain('alt="Portada de hola mundo"');
  });

  it('post has BlogPosting, pagefind body and in-article ad', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toContain('"@type":"BlogPosting"'); expect(html).toContain('data-pagefind-body');
    expect(html).toContain('data-ad="inArticle"');
  });

  it('post JSON-LD has BlogPosting with default author and BreadcrumbList', async () => {
    const ld = jsonLd(await f.read('blog/post-largo/index.html'));
    const posting = ld.find((d) => d['@type'] === 'BlogPosting');
    expect(posting.headline).toBe('Un post largo');
    expect(posting.url).toBe('https://example.com/blog/post-largo/');
    expect(posting.datePublished).toBe('2026-02-15T00:00:00.000Z');
    expect(posting.dateModified).toBe('2026-03-01T00:00:00.000Z');
    expect(posting.author.name).toBe('Ana Pérez');
    const crumbs = ld.find((d) => d['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([ui.home, 'Programación Web', 'Un post largo']);
    expect(crumbs.itemListElement[1].item).toBe('https://example.com/categoria/programacion-web/');
  });

  it('post is an article page with the pagefind body on the <article>', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toMatch(/<article[^>]*data-pagefind-body/);
    expect(html).toContain('<meta property="og:type" content="article"');
    expect(html).toContain('<meta property="article:published_time" content="2026-02-15T00:00:00.000Z"');
    expect(html).toContain('<h1');
    expect(html).toContain(ui.publishedOn);
    expect(html).toContain(ui.updatedOn);
  });

  it('post with ≥ 3 h2 has a table of contents linking to the headings', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toContain(ui.toc);
    // Astro's heading ids keep accents.
    expect(html).toContain('<h2 id="primera-sección"');
    expect(html).toContain('href="#primera-sección"');
    expect(html).toContain('href="#tercera-sección"');
    expect(await f.read('blog/hola-mundo/index.html')).not.toContain(`>${ui.toc}<`);
  });

  it('post has share links (anchors only), author box and the afterPost ad', async () => {
    const html = await f.read('blog/post-largo/index.html');
    const url = encodeURIComponent('https://example.com/blog/post-largo/');
    expect(html).toContain(`https://x.com/intent/post?url=${url}`);
    expect(html).toContain(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
    expect(html).toContain(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
    expect(html).toContain('https://wa.me/?text=');
    expect(html).toContain(ui.copyLink);
    const share = html.slice(html.indexOf('data-share-links'), html.indexOf('</section>', html.indexOf('data-share-links')));
    expect(share).not.toContain('<button');
    expect(html).toContain('href="/autor/ana-perez/"');
    expect(html).toContain('data-ad-slot="222"');
  });

  it('post shows related posts by category/tags', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toContain(ui.related);
    expect(html).toContain('href="/blog/hola-mundo/"');
  });

  it('related post cards use <h3> under the related-posts <h2>', async () => {
    const html = await f.read('blog/post-largo/index.html');
    const related = html.slice(html.indexOf('id="related-title"'));
    expect(related).toMatch(/<h3 class="card-title"><a href="\/blog\/hola-mundo\/"/);
    expect(related).not.toContain('<h2 class="card-title"');
    expect(await f.read('index.html')).toContain('<h2 class="card-title">');
  });

  it('every internal page link ends with a slash (no redirect hop)', async () => {
    for (const page of ['blog/post-largo/index.html', 'index.html', 'pagina/2/index.html', 'categoria/programacion-web/index.html', 'autor/ana-perez/index.html']) {
      const html = await f.read(page);
      const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
      const internal = hrefs.filter((h) => h.startsWith('/') && !h.startsWith('//'));
      expect(internal.length, page).toBeGreaterThan(3);
      const pages = internal.map((h) => h.replace(/[?#].*$/, '')).filter((h) => !/\.[^/]*$/.test(h));
      for (const h of pages) expect(h, `${page}: ${h}`).toMatch(/\/$/);
    }
  });

  it('BreadcrumbList last item equals the canonical URL', async () => {
    for (const page of ['blog/post-largo/index.html', 'categoria/programacion-web/index.html', 'pagina/2/index.html', 'autor/ana-perez/index.html']) {
      const html = await f.read(page);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)![1];
      const crumbs = jsonLd(html).find((d) => d['@type'] === 'BreadcrumbList');
      expect(crumbs.itemListElement.at(-1).item, page).toBe(canonical);
    }
  });

  it('noAds post has no ad slots', async () => expect(await f.read('blog/sin-anuncios/index.html')).not.toContain('adsbygoogle"'));

  it('category page lists only its posts, titled with the label, with breadcrumbs', async () => {
    const html = await f.read('categoria/programacion-web/index.html');
    expect(html).toContain('<title>Programación Web | Blog Básico</title>');
    expect(html).toContain('href="/blog/post-largo/"');
    expect(html).toContain('href="/blog/hola-mundo/"');
    expect(html).not.toContain('href="/blog/sin-anuncios/"');
    expect(f.exists('categoria/programacion-web/2/index.html')).toBe(false);
    expect(f.exists('categoria/diseno/index.html')).toBe(true);
  });

  it('tag pages are slugified and titled with the original label', async () => {
    expect(f.exists('etiqueta/guia/index.html')).toBe(true);
    expect(await f.read('etiqueta/guia/index.html')).toContain('<title>guía | Blog Básico</title>');
    expect(f.exists('etiqueta/astro/index.html')).toBe(true);
  });

  it('author page lists the posts of the default author with the configured profile', async () => {
    const html = await f.read('autor/ana-perez/index.html');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('href="/blog/post-largo/"');
    expect(html).toContain('href="/blog/sin-anuncios/"');
  });

  it('emits only valid nesting on the post page (no block element inside <p>)', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).not.toMatch(/<p(?:\s[^>]*)?>(?:(?!<\/p>).)*<(div|ul|nav|section|figure)[\s>]/s);
  });
});

describe('minimal fixture (no blog collection)', () => {
  it('home shows the empty state and no taxonomy or pagination pages are built', async () => {
    const m = await buildFixture('minimal');
    expect(await m.read('index.html')).toContain(ui.emptyBlog);
    expect(m.exists('categoria')).toBe(false);
    expect(m.exists('etiqueta')).toBe(false);
    expect(m.exists('autor')).toBe(false);
    expect(m.exists('pagina')).toBe(false);
    expect(m.exists('blog')).toBe(false);
  });
});
