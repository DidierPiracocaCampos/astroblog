import { describe, expect, it } from 'vitest';
import { authorOf, formatDate, lengthWarnings, withDefaultAuthor } from '../../lib/posts';
import type { PostLike } from '../../lib/posts';
import { homePagesPrefix, paginationPaths, taxonomyPath } from '../../lib/routes';
import { parseConfig } from '../../schema/config';

const post = (data: Partial<PostLike['data']> & { description?: string } = {}, id = 'p'): PostLike & { data: { description: string } } => ({
  id,
  data: { title: 'T', description: 'd', pubDate: new Date('2026-01-01'), category: 'c', tags: [], draft: false, ...data },
});

describe('authorOf / withDefaultAuthor', () => {
  it('falls back to the configured author name', () => {
    expect(authorOf(post({ author: 'Luis' }), 'Ana')).toBe('Luis');
    expect(authorOf(post(), 'Ana')).toBe('Ana');
    expect(authorOf(post(), undefined)).toBeUndefined();
  });
  it('fills missing authors without mutating the input', () => {
    const a = post();
    const [b] = withDefaultAuthor([a], 'Ana');
    expect(b.data.author).toBe('Ana');
    expect(a.data.author).toBeUndefined();
    expect(b.id).toBe(a.id);
  });
});

describe('lengthWarnings', () => {
  const okDesc = 'x'.repeat(80);
  it('is empty for a title ≤ 70 and a description of 50–160 chars', () => {
    expect(lengthWarnings(post({ title: 'x'.repeat(70), description: okDesc }), 'en')).toEqual([]);
    expect(lengthWarnings(post({ description: 'x'.repeat(50) }), 'en')).toEqual([]);
    expect(lengthWarnings(post({ description: 'x'.repeat(160) }), 'en')).toEqual([]);
  });
  it('warns about a long title and a short or long description, naming the post', () => {
    const w = lengthWarnings(post({ title: 'x'.repeat(71), description: 'x'.repeat(49) }, 'mi-post'), 'es');
    expect(w).toHaveLength(2);
    expect(w[0]).toContain('mi-post');
    expect(w[0]).toContain('71');
    expect(w[1]).toContain('49');
    expect(lengthWarnings(post({ description: 'x'.repeat(161) }), 'en')[0]).toContain('161');
  });
  it('localizes the message', () => {
    const d = { title: 'x'.repeat(80), description: okDesc };
    expect(lengthWarnings(post(d), 'es')[0]).toContain('título');
    expect(lengthWarnings(post(d), 'en')[0]).toContain('title');
  });
});

describe('formatDate', () => {
  it('formats the UTC calendar day in the site language', () => {
    const d = new Date('2026-01-10');
    expect(formatDate(d, 'es')).toBe('10 de enero de 2026');
    expect(formatDate(d, 'en')).toBe('January 10, 2026');
  });
});

describe('taxonomyPath', () => {
  const paths = { category: '/categoria', tag: '/etiqueta' };
  it('builds the base-relative path from the section path and the slugified label', () => {
    expect(taxonomyPath(paths, 'category', 'Programación Web')).toBe('/categoria/programacion-web');
    expect(taxonomyPath(paths, 'tag', 'Guía')).toBe('/etiqueta/guia');
  });
  it('is undefined when the route is disabled or the label has no slug', () => {
    expect(taxonomyPath(paths, 'author', 'Ana')).toBeUndefined();
    expect(taxonomyPath(paths, 'tag', '!!!')).toBeUndefined();
  });
});

describe('paginationPaths', () => {
  it('uses the first path for page 1 and prefix/n for the rest', () => {
    expect(paginationPaths('/', '/pagina', 3)).toEqual(['/', '/pagina/2', '/pagina/3']);
    expect(paginationPaths('/categoria/x', '/categoria/x', 2)).toEqual(['/categoria/x', '/categoria/x/2']);
    expect(paginationPaths('/', '/pagina', 1)).toEqual(['/']);
  });
});

describe('homePagesPrefix', () => {
  it('follows lang and slugs.page', () => {
    expect(homePagesPrefix(parseConfig({ title: 't', description: 'd' }))).toBe('/pagina');
    expect(homePagesPrefix(parseConfig({ title: 't', description: 'd', lang: 'en' }))).toBe('/page');
    expect(homePagesPrefix(parseConfig({ title: 't', description: 'd', slugs: { page: '/p/' } }))).toBe('/p');
  });
});
