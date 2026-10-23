import { describe, it, expect } from 'vitest';
import {
  slugify,
  publishedPosts,
  readingTime,
  relatedPosts,
  groupByTaxonomy,
  type PostLike,
} from '../../lib/posts';

let n = 0;
function p(data: Partial<PostLike['data']> = {}, id = `p${++n}`): PostLike {
  return {
    id,
    body: '',
    data: {
      title: id,
      pubDate: new Date('2026-01-01'),
      category: 'x',
      tags: [],
      draft: false,
      ...data,
    },
  };
}

describe('slugify', () => {
  it('strips diacritics, lowercases and joins with dashes', () => {
    expect(slugify('Programación Web')).toBe('programacion-web');
    expect(slugify('  Ñandú & Co. ')).toBe('nandu-co');
  });
  it('collapses runs of symbols and trims dashes', () => {
    expect(slugify('--Hello___World!!')).toBe('hello-world');
  });
});

describe('publishedPosts', () => {
  it('filters drafts and sorts desc', () => {
    const a = p({ pubDate: new Date('2026-01-01') }, 'a');
    const b = p({ pubDate: new Date('2026-03-01') }, 'b');
    const d = p({ pubDate: new Date('2026-02-01'), draft: true }, 'd');
    expect(publishedPosts([a, d, b], { includeDrafts: false }).map((x) => x.id)).toEqual(['b', 'a']);
    expect(publishedPosts([a, d, b], { includeDrafts: true }).map((x) => x.id)).toEqual(['b', 'd', 'a']);
  });
  it('does not mutate the input', () => {
    const arr = [p({ pubDate: new Date('2026-01-01') }, 'a'), p({ pubDate: new Date('2026-03-01') }, 'b')];
    publishedPosts(arr, { includeDrafts: true });
    expect(arr.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('readingTime', () => {
  it('rounds up by words per minute', () => {
    expect(readingTime('palabra '.repeat(450))).toBe(3);
    expect(readingTime('palabra '.repeat(200))).toBe(1);
    expect(readingTime('palabra '.repeat(201))).toBe(2);
    expect(readingTime('a b c d', 2)).toBe(2);
  });
  it('is at least 1 and ignores whitespace-only bodies', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('  \n\t ')).toBe(1);
  });
});

describe('relatedPosts', () => {
  it('ranks related by category and shared tags', () => {
    const A = p({ category: 'x', tags: ['a', 'b'] }, 'A');
    const B = p({ category: 'x', tags: ['a'] }, 'B');
    const C = p({ category: 'y', tags: ['a', 'b'] }, 'C');
    const D = p({ category: 'y', tags: [] }, 'D');
    expect(relatedPosts(A, [A, B, C, D]).map((x) => x.id)).toEqual(['B', 'C']);
  });
  it('breaks ties by most recent and respects limit', () => {
    const A = p({ category: 'x' }, 'A');
    const old = p({ category: 'x', pubDate: new Date('2025-01-01') }, 'old');
    const recent = p({ category: 'x', pubDate: new Date('2026-06-01') }, 'recent');
    expect(relatedPosts(A, [A, old, recent]).map((x) => x.id)).toEqual(['recent', 'old']);
    expect(relatedPosts(A, [A, old, recent], 1).map((x) => x.id)).toEqual(['recent']);
  });
});

describe('groupByTaxonomy', () => {
  it('groups taxonomy by slug keeping original label', () => {
    const g = groupByTaxonomy(
      [p({ category: 'Programación Web' }), p({ category: 'programacion web' })],
      'category',
    );
    expect([...g.keys()]).toEqual(['programacion-web']);
    expect(g.get('programacion-web')!.label).toBe('Programación Web');
    expect(g.get('programacion-web')!.posts).toHaveLength(2);
  });
  it('handles the tags array field, one post in several groups', () => {
    const p1 = p({ tags: ['Diseño Gráfico', 'JS'] });
    const p2 = p({ tags: ['diseno grafico'] });
    const g = groupByTaxonomy([p1, p2], 'tags');
    expect([...g.keys()].sort()).toEqual(['diseno-grafico', 'js']);
    expect(g.get('diseno-grafico')!.label).toBe('Diseño Gráfico');
    expect(g.get('diseno-grafico')!.posts).toEqual([p1, p2]);
    expect(g.get('js')!.posts).toEqual([p1]);
  });
  it('does not duplicate a post listing the same tag twice', () => {
    const p1 = p({ tags: ['Año', 'ano'] });
    expect(groupByTaxonomy([p1], 'tags').get('ano')!.posts).toEqual([p1]);
  });
  it('skips posts without author', () => {
    const a = p({ author: 'José Núñez' });
    const b = p({});
    const c = p({ author: 'jose nunez' });
    const g = groupByTaxonomy([a, b, c], 'author');
    expect([...g.keys()]).toEqual(['jose-nunez']);
    expect(g.get('jose-nunez')!.label).toBe('José Núñez');
    expect(g.get('jose-nunez')!.posts).toEqual([a, c]);
  });
  it('skips values whose slug is empty', () => {
    const g = groupByTaxonomy([p({ category: '!!!' })], 'category');
    expect(g.size).toBe(0);
  });
});
