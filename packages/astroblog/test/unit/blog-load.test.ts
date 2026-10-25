import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// lib/blog.ts runs inside Astro: its `astro:content` and virtual config imports are mocked here.
const entries = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('astro:content', () => ({ getCollection: async () => entries.value }));
const cfg = vi.hoisted(() => ({ value: { lang: 'es' } as Record<string, unknown> }));
vi.mock('virtual:astroblog/config', () => ({ default: cfg.value }));
// The mocked module object is reused across `vi.resetModules()`: replace its contents in place.
const setCfg = (c: Record<string, unknown>) => {
  for (const k of Object.keys(cfg.value)) delete cfg.value[k];
  Object.assign(cfg.value, c);
};

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

describe('loadPosts: silo y revisores (0.2)', () => {
  const entry = (id: string, category: string, extra: Record<string, unknown> = {}) => ({
    id,
    data: { title: id, description: 'd', pubDate: new Date('2026-01-01'), category, tags: [], draft: false, ...extra },
  });
  const load = async () => (await import('../../lib/blog')).loadPosts();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    setCfg({ lang: 'es', permalinks: 'silo' });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    setCfg({ lang: 'es' });
  });

  it('accepts posts in folders and at the root', async () => {
    entries.value = [entry('requisitos/edad', 'Requisitos'), entry('nomina', 'Requisitos')];
    expect(await load()).toHaveLength(2);
  });
  it('rejects a category whose slug is reserved', async () => {
    entries.value = [entry('x', 'Acerca')];
    await expect(load()).rejects.toThrow(/"Acerca".*acerca/);
  });
  it('rejects a category overriding a custom slug', async () => {
    setCfg({ lang: 'en', permalinks: 'silo', slugs: { about: 'who' } });
    entries.value = [entry('x', 'Who')];
    await expect(load()).rejects.toThrow(/reserved/);
  });
  it('rejects a category without a slug', async () => {
    entries.value = [entry('x', '???')];
    await expect(load()).rejects.toThrow(/"\?\?\?"/);
  });
  it('rejects two posts with the same silo URL', async () => {
    entries.value = [entry('a/edad', 'Requisitos'), entry('b/edad', 'Requisitos')];
    await expect(load()).rejects.toThrow(/\/requisitos\/edad\/.*"a\/edad".*"b\/edad"/s);
  });
  it('rejects a post slug equal to the page slug', async () => {
    entries.value = [entry('pagina', 'Requisitos')];
    await expect(load()).rejects.toThrow(/"pagina"/);
  });
  it('reports every issue at once', async () => {
    entries.value = [entry('pagina', 'Acerca'), entry('x', '!!')];
    await expect(load()).rejects.toThrow(/Acerca[\s\S]*pagina[\s\S]*!!/);
  });
  it('ignores silo rules in blog mode', async () => {
    setCfg({ lang: 'es' });
    entries.value = [entry('pagina', 'Acerca'), entry('a/x', 'c'), entry('b/x', 'c')];
    expect(await load()).toHaveLength(3);
  });
  it('rejects an unknown reviewer, in any mode', async () => {
    setCfg({ lang: 'es', reviewers: { luis: { name: 'Luis' } } });
    entries.value = [entry('x', 'c', { reviewer: 'luis' })];
    expect(await load()).toHaveLength(1);
    vi.resetModules();
    entries.value = [entry('x', 'c', { reviewer: 'marta' })];
    await expect(load()).rejects.toThrow(/"marta".*"x"/);
  });
});
