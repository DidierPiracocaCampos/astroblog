import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import astroblog from '../../index.ts';

const dirUrl = (p: string) => new URL(pathToFileURL(p).href + '/');

function project(files: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ab-int-'));
  mkdirSync(join(root, 'public'));
  for (const [f, c] of Object.entries(files)) writeFileSync(join(root, f), c);
  return root;
}

function logger() {
  const warns: string[] = [];
  const l: any = { warn: (m: string) => warns.push(m), info() {}, error() {}, debug() {} };
  l.fork = () => l;
  return { l, warns };
}

async function setup(userConfig: unknown, opts: { root?: string; site?: string; integrations?: { name: string }[]; command?: string } = {}) {
  const root = opts.root ?? project();
  const routes: { pattern: string; entrypoint: string | URL }[] = [];
  const updates: any[] = [];
  const watched: string[] = [];
  const codegen = dirUrl(join(root, '.astro', 'integrations', 'astroblog'));
  const processor = { name: 'satteri', options: { mdastPlugins: [], hastPlugins: [] as any[], features: {} } };
  const { l, warns } = logger();
  const integration = astroblog(userConfig);
  await (integration.hooks['astro:config:setup'] as any)({
    config: {
      root: dirUrl(root),
      publicDir: dirUrl(join(root, 'public')),
      site: opts.site,
      integrations: opts.integrations ?? [],
      markdown: { processor },
    },
    command: opts.command ?? 'build',
    updateConfig: (c: any) => updates.push(c),
    injectRoute: (r: any) => routes.push(r),
    addWatchFile: (p: any) => watched.push(String(p)),
    createCodegenDir: () => {
      mkdirSync(fileURLToPath(codegen), { recursive: true });
      return codegen;
    },
    logger: l,
  });
  return { integration, root, routes, updates, watched, codegen, processor, warns, l };
}

const base = { title: 'T', description: 'D' };
const adsense = { client: 'ca-pub-123', slots: { inArticle: '999' } };

describe('astroblog integration', () => {
  it('returns an integration named @didierp/astroblog', () => {
    const i = astroblog(base);
    expect(i.name).toBe('@didierp/astroblog');
    expect(typeof i.hooks['astro:config:setup']).toBe('function');
  });

  it('rethrows invalid config as a readable error', async () => {
    await expect(setup({ title: '' })).rejects.toThrow(/\[astroblog\] title:/);
  });

  it('throws validation errors (adsense without site)', async () => {
    await expect(setup({ ...base, adsense })).rejects.toThrow(/site/);
  });

  it('logs validation warnings through the hook logger', async () => {
    const { warns } = await setup({ ...base, routes: { about: false } });
    expect(warns.some((w) => w.includes('about'))).toBe(true);
  });

  it('injects every resolved route with an entrypoint inside the package routes/ dir', async () => {
    const { routes } = await setup(base);
    expect(routes.map((r) => r.pattern)).toContain('/');
    expect(routes.map((r) => r.pattern)).toContain('/blog/[...slug]');
    expect(routes.map((r) => r.pattern)).not.toContain('/ads.txt');
    for (const r of routes) {
      expect(r.entrypoint).toBeInstanceOf(URL);
      expect(existsSync(fileURLToPath(r.entrypoint as URL))).toBe(true);
      expect(String(r.entrypoint)).toMatch(/\/routes\/[^/]+$/);
    }
  });

  it('injects ads.txt with adsense, but not when public/ads.txt exists', async () => {
    const withAds = await setup({ ...base, adsense }, { site: 'https://x.com' });
    expect(withAds.routes.map((r) => r.pattern)).toContain('/ads.txt');
    const root = project();
    writeFileSync(join(root, 'public', 'ads.txt'), 'google.com, pub-1, DIRECT\n');
    const own = await setup({ ...base, adsense }, { site: 'https://x.com', root });
    expect(own.routes.map((r) => r.pattern)).not.toContain('/ads.txt');
  });

  it('updates config with vite plugins, noExternal and missing integrations only', async () => {
    const { updates } = await setup(base);
    const u = Object.assign({}, ...updates);
    const names = u.vite.plugins.flat().map((p: any) => p.name);
    expect(names).toContain('astroblog:virtual-modules');
    expect(names.some((n: string) => n.startsWith('@tailwindcss/vite'))).toBe(true);
    expect(u.vite.ssr.noExternal).toContain('@didierp/astroblog');
    expect(u.integrations.map((i: any) => i.name).sort()).toEqual(['@astrojs/mdx', '@astrojs/sitemap']);

    const again = await setup(base, { integrations: [{ name: '@astrojs/mdx' }, { name: '@astrojs/sitemap' }] });
    const integrations = again.updates.flatMap((x) => x.integrations ?? []);
    expect(integrations).toEqual([]);
  });

  it('writes the generated stylesheet into the codegen dir', async () => {
    const { codegen } = await setup(base);
    const css = readFileSync(fileURLToPath(new URL('styles.css', codegen)), 'utf8');
    expect(css).toContain('@import "tailwindcss";');
  });

  it('watches customCss files and fails clearly when one is missing', async () => {
    const root = project({ 'tema.css': 'a{}' });
    const { watched } = await setup({ ...base, customCss: ['./tema.css'] }, { root });
    expect(watched.some((w) => w.replace(/\\/g, '/').endsWith('/tema.css'))).toBe(true);
    await expect(setup({ ...base, customCss: ['./nope.css'] })).rejects.toThrow(/customCss.*nope\.css/);
  });

  it('adds the in-article ad plugin to the active Sätteri processor', async () => {
    const none = await setup(base);
    expect(none.processor.options.hastPlugins).toHaveLength(0);
    const { processor, updates } = await setup({ ...base, adsense }, { site: 'https://x.com' });
    expect(processor.options.hastPlugins).toHaveLength(1);
    expect(processor.options.hastPlugins[0].name).toBe('astroblog-ad');
    // never uses the deprecated markdown.rehypePlugins (needs @astrojs/markdown-remark in Astro 7)
    expect(updates.some((x) => x.markdown?.rehypePlugins)).toBe(false);
  });

  it('adds rehypeAd to a unified processor', async () => {
    const root = project();
    const processor = { name: 'unified', options: { rehypePlugins: [] as any[] } };
    const i = astroblog({ ...base, adsense });
    const { l } = logger();
    mkdirSync(join(root, 'gen'));
    await (i.hooks['astro:config:setup'] as any)({
      config: { root: dirUrl(root), publicDir: dirUrl(join(root, 'public')), site: 'https://x.com', integrations: [], markdown: { processor } },
      command: 'dev', updateConfig() {}, injectRoute() {}, addWatchFile() {},
      createCodegenDir: () => dirUrl(join(root, 'gen')), logger: l,
    });
    expect(processor.options.rehypePlugins).toHaveLength(1);
    expect(processor.options.rehypePlugins[0][1]).toMatchObject({ slot: '999', client: 'ca-pub-123', dev: true });
  });

  it('warns when a project route collides with an injected one', async () => {
    const { integration, l, warns } = await setup({ ...base, lang: 'en' });
    const resolved = {
      routes: [
        { pattern: '/about', origin: 'project' },
        { pattern: '/', origin: 'external' },
        { pattern: '/other', origin: 'project' },
      ],
      logger: l,
    };
    // Astro calls the hook more than once per build; warn only once per route.
    await (integration.hooks['astro:routes:resolved'] as any)(resolved);
    await (integration.hooks['astro:routes:resolved'] as any)(resolved);
    const collision = warns.filter((w) => w.includes('routes.'));
    expect(collision).toHaveLength(1);
    expect(collision[0]).toContain('/about');
    expect(collision[0]).toContain('routes.about: false');
  });

  it('injects virtual module types with absolute import paths', async () => {
    const { integration, l } = await setup(base);
    let injected: { filename: string; content: string } | undefined;
    await (integration.hooks['astro:config:done'] as any)({
      config: {}, logger: l,
      injectTypes: (t: any) => { injected = t; return new URL('file:///x'); },
    });
    expect(injected!.filename).toBe('virtual.d.ts');
    expect(injected!.content).toContain("declare module 'virtual:astroblog/config'");
    expect(injected!.content).not.toMatch(/import\(['"]\.\.?\//);
    const m = injected!.content.match(/import\('([^']+\/schema\/config)'\)/);
    expect(m).not.toBeNull();
    expect(existsSync(m![1] + '.ts')).toBe(true);
  });
});
