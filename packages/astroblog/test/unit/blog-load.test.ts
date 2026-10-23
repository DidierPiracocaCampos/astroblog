import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// lib/blog.ts runs inside Astro: its `astro:content` and virtual config imports are mocked here.
const entries = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('astro:content', () => ({ getCollection: async () => entries.value }));
vi.mock('virtual:astroblog/config', () => ({ default: { lang: 'es' } }));

const post = (id: string, draft = false) => ({
  id,
  data: { title: id, description: 'd', pubDate: new Date('2026-01-01'), category: 'c', tags: [], draft },
});

describe('loadPosts: "no posts" warning (spec §3, validateConfig noPosts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('warns once per build when only drafts exist', async () => {
    entries.value = [post('borrador', true)];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadPosts } = await import('../../lib/blog');
    expect(await loadPosts()).toEqual([]);
    await loadPosts();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[astroblog] No hay posts publicados; la portada mostrará un estado vacío.');
  });

  it('does not warn when there are published posts', async () => {
    entries.value = [post('hola')];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadPosts } = await import('../../lib/blog');
    expect(await loadPosts()).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });
});
