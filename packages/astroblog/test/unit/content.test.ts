import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { blogCollection, blogSchema, pagesCollection } from '../../content';

const s = blogSchema({ image: () => z.string() });
const valid = { title: 'T', description: 'D', pubDate: '2026-01-01', category: 'Cat' };

describe('blogSchema', () => {
  it('requires title, description, pubDate, category', () => {
    expect(s.safeParse({}).success).toBe(false);
    for (const k of Object.keys(valid)) {
      const { [k as keyof typeof valid]: _, ...rest } = valid;
      expect(s.safeParse(rest).success).toBe(false);
    }
  });
  it('accepts a minimal valid entry', () => expect(s.safeParse(valid).success).toBe(true));
  it('requires coverAlt when cover is set', () => {
    const r = s.safeParse({ ...valid, cover: 'a.jpg' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('coverAlt');
    expect(s.safeParse({ ...valid, cover: 'a.jpg', coverAlt: 'x' }).success).toBe(true);
  });
  it('applies defaults', () =>
    expect(s.parse(valid)).toMatchObject({ tags: [], draft: false, noAds: false }));
  it('coerces dates', () => {
    expect(s.parse({ ...valid, pubDate: '2026-01-02' }).pubDate).toBeInstanceOf(Date);
    expect(s.parse({ ...valid, updatedDate: '2026-02-02' }).updatedDate).toBeInstanceOf(Date);
  });
  it('does not fail on long title/description (warnings are emitted by routes)', () => {
    expect(s.safeParse({ ...valid, title: 'x'.repeat(100), description: 'y' }).success).toBe(true);
  });
});

describe('collections', () => {
  it('blogCollection has loader and schema function', () => {
    const c = blogCollection();
    expect(c.loader).toBeDefined();
    expect(c.schema({ image: () => z.string() }).safeParse(valid).success).toBe(true);
  });
  it('blogCollection and pagesCollection accept base', () => {
    expect(blogCollection({ base: './x' }).loader.name).toBe('glob-loader');
    expect(pagesCollection({ base: './y' }).loader).toBeDefined();
  });
  it('pages schema', () => {
    const p = pagesCollection().schema;
    expect(p.safeParse({ title: 'A' }).success).toBe(true);
    expect(p.parse({ title: 'A', updatedDate: '2026-01-01' }).updatedDate).toBeInstanceOf(Date);
    expect(p.safeParse({}).success).toBe(false);
  });
});

describe('blogSchema: campos YMYL (0.2)', () => {
  it('accepts reviewer, reviewedDate, faq and sources', () => {
    const r = s.parse({
      ...valid,
      reviewer: 'luis',
      reviewedDate: '2026-03-01',
      faq: [{ q: '¿Edad máxima?', a: 'Suele ser **75 años** al final del préstamo.' }],
      sources: [{ title: 'Banco de España', url: 'https://www.bde.es' }],
    });
    expect(r.reviewer).toBe('luis');
    expect(r.reviewedDate).toBeInstanceOf(Date);
    expect(r.faq).toHaveLength(1);
    expect(r.sources?.[0].url).toBe('https://www.bde.es');
  });
  it('rejects malformed faq and sources', () => {
    expect(s.safeParse({ ...valid, faq: [{ q: 'x' }] }).success).toBe(false);
    expect(s.safeParse({ ...valid, sources: [{ title: 'x' }] }).success).toBe(false);
  });
  it('leaves the new fields undefined when absent', () =>
    expect(s.parse(valid)).not.toHaveProperty('faq'));
});
