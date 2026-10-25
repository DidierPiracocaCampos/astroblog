import { describe, it, expect } from 'vitest';
import {
  absoluteUrl,
  buildMeta,
  jsonLdWebsite,
  jsonLdPost,
  jsonLdBreadcrumbs,
  absoluteImage,
  jsonLdFaq,
  jsonLdReviewedPage,
} from '../../lib/seo';

describe('absoluteUrl', () => {
  it('joins documented cases', () => {
    expect(absoluteUrl('https://x.com/', '/', '/blog/a/')).toBe('https://x.com/blog/a/');
    expect(absoluteUrl('https://x.com', '/sub', 'blog/a')).toBe('https://x.com/sub/blog/a');
    expect(absoluteUrl('https://x.com/', '/sub/', '/')).toBe('https://x.com/sub/');
  });
  it.each([
    ['https://x.com', '/blog'],
    ['https://x.com', '/blog/'],
    ['https://x.com/', '/blog'],
    ['https://x.com/', '/blog/'],
  ])('site %s base %s never yields //', (site, base) => {
    expect(absoluteUrl(site, base, '')).toBe('https://x.com/blog/');
    expect(absoluteUrl(site, base, '/')).toBe('https://x.com/blog/');
    expect(absoluteUrl(site, base, '/posts/a/')).toBe('https://x.com/blog/posts/a/');
    expect(absoluteUrl(site, base, 'posts/a')).toBe('https://x.com/blog/posts/a');
    expect(absoluteUrl(site, base, '/rss.xml')).toBe('https://x.com/blog/rss.xml');
    expect(absoluteUrl(site, base, '//posts//a/').replace('https://', '')).not.toContain('//');
  });
  it('handles empty/root base', () => {
    expect(absoluteUrl('https://x.com', '', '')).toBe('https://x.com/');
    expect(absoluteUrl('https://x.com', '/', '')).toBe('https://x.com/');
    expect(absoluteUrl('https://x.com', '', 'a')).toBe('https://x.com/a');
  });
});

const input = {
  title: 'Post',
  siteTitle: 'Mi Blog',
  description: 'desc',
  url: 'https://x.com/p/',
  lang: 'es' as const,
};
const find = (m: { name?: string; property?: string; content: string }[], k: string) =>
  m.find((t) => t.name === k || t.property === k)?.content;

describe('buildMeta', () => {
  it('builds article meta', () => {
    const d = new Date('2026-03-04T05:06:07.000Z');
    const r = buildMeta({ ...input, type: 'article', image: 'https://x.com/i.png', publishedTime: d });
    expect(r.title).toBe('Post | Mi Blog');
    expect(find(r.meta, 'twitter:card')).toBe('summary_large_image');
    expect(find(r.meta, 'og:type')).toBe('article');
    expect(find(r.meta, 'og:image')).toBe('https://x.com/i.png');
    expect(find(r.meta, 'og:locale')).toBe('es_ES');
    expect(find(r.meta, 'article:published_time')).toBe('2026-03-04T05:06:07.000Z');
    expect(find(r.meta, 'og:url')).toBe('https://x.com/p/');
  });
  it('uses summary card without image and en locale', () => {
    const r = buildMeta({ ...input, type: 'website', lang: 'en' });
    expect(find(r.meta, 'twitter:card')).toBe('summary');
    expect(find(r.meta, 'og:locale')).toBe('en_US');
    expect(find(r.meta, 'article:published_time')).toBeUndefined();
  });
  it('does not duplicate site title', () =>
    expect(buildMeta({ ...input, title: 'Mi Blog', type: 'website' }).title).toBe('Mi Blog'));
});

describe('json-ld', () => {
  it('builds WebSite graph', () => {
    const r = jsonLdWebsite({
      name: 'B',
      url: 'https://x.com/',
      description: 'd',
      publisher: { name: 'P', logo: 'https://x.com/l.png' },
    }) as any;
    expect(r['@context']).toBe('https://schema.org');
    expect(r['@graph'].map((n: any) => n['@type'])).toEqual(['WebSite', 'Organization']);
    expect(r['@graph'][1].logo).toBe('https://x.com/l.png');
  });
  it('builds BlogPosting', () => {
    const pub = new Date('2026-01-01T00:00:00.000Z');
    const r = jsonLdPost({
      title: 'T',
      description: 'd',
      url: 'https://x.com/p/',
      datePublished: pub,
      author: { name: 'A' },
      publisherName: 'P',
    }) as any;
    expect(r['@context']).toBe('https://schema.org');
    expect(r['@type']).toBe('BlogPosting');
    expect(r.dateModified).toBe(pub.toISOString());
    expect(r.author).toEqual({ '@type': 'Person', name: 'A' });
    expect(r.image).toBeUndefined();
    const mod = new Date('2026-02-01T00:00:00.000Z');
    const r2 = jsonLdPost({
      title: 'T',
      description: 'd',
      url: 'u',
      datePublished: pub,
      dateModified: mod,
      image: 'i',
      author: { name: 'A', url: 'au' },
      publisherName: 'P',
    }) as any;
    expect(r2.dateModified).toBe(mod.toISOString());
    expect(r2.image).toBe('i');
    expect(r2.author.url).toBe('au');
  });
  it('numbers breadcrumbs from 1', () => {
    const r = jsonLdBreadcrumbs([
      { name: 'Home', url: 'https://x.com/' },
      { name: 'Post', url: 'https://x.com/p/' },
    ]) as any;
    expect(r['@context']).toBe('https://schema.org');
    expect(r['@type']).toBe('BreadcrumbList');
    expect(r.itemListElement.map((i: any) => i.position)).toEqual([1, 2]);
    expect(r.itemListElement[1].item).toBe('https://x.com/p/');
  });
});

describe('absoluteImage', () => {
  it('makes relative images absolute against site and base', () => {
    expect(absoluteImage('https://x.com/', '/blog', '/og.png')).toBe('https://x.com/blog/og.png');
  });
  it('keeps already absolute images', () => {
    expect(absoluteImage(undefined, '/', 'https://cdn.x.com/a.png')).toBe('https://cdn.x.com/a.png');
  });
  it('omits relative images when site is unset', () => {
    expect(absoluteImage(undefined, '/', '/og.png')).toBeUndefined();
    expect(absoluteImage('https://x.com', '/', undefined)).toBeUndefined();
  });
});

describe('json-ld YMYL (0.2)', () => {
  const post = { title: 'T', description: 'd', url: 'https://x.com/p/', datePublished: new Date('2026-01-01'), publisherName: 'P' };
  it('uses the configured article type and author credentials', () => {
    const r = jsonLdPost({
      ...post,
      type: 'Article',
      author: { name: 'A', jobTitle: 'Economista', sameAs: ['https://linkedin.com/in/a'] },
    }) as any;
    expect(r['@type']).toBe('Article');
    expect(r.author).toEqual({ '@type': 'Person', name: 'A', jobTitle: 'Economista', sameAs: ['https://linkedin.com/in/a'] });
    expect((jsonLdPost({ ...post, author: { name: 'A', sameAs: [] } }) as any).author).toEqual({ '@type': 'Person', name: 'A' });
  });
  it('builds FAQPage with plain-text answers', () => {
    expect(jsonLdFaq([{ q: '¿Edad?', a: 'Hasta **75** años, ver [BdE](https://bde.es).' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: '¿Edad?', acceptedAnswer: { '@type': 'Answer', text: 'Hasta 75 años, ver BdE.' } }],
    });
  });
  it('builds a reviewed WebPage', () => {
    expect(jsonLdReviewedPage({
      url: 'https://x.com/p/',
      reviewer: { name: 'Luis', jobTitle: 'Notario', url: 'https://luis.es' },
      lastReviewed: new Date('2026-03-01T00:00:00.000Z'),
    })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: 'https://x.com/p/',
      reviewedBy: { '@type': 'Person', name: 'Luis', jobTitle: 'Notario', url: 'https://luis.es' },
      lastReviewed: '2026-03-01',
    });
    expect(jsonLdReviewedPage({ url: 'u', reviewer: { name: 'L' } })).toEqual({
      '@context': 'https://schema.org', '@type': 'WebPage', url: 'u', reviewedBy: { '@type': 'Person', name: 'L' },
    });
  });
});
