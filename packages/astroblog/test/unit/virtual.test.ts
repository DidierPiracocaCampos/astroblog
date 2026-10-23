import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseConfig } from '../../schema/config';
import {
  resolveUserPath, resolveCustomCss, buildComponentsModule, buildStylesheet,
  buildVirtualModules, astroblogVitePlugin,
} from '../../lib/virtual';

const pkg = new URL('file:///D:/pkg/astroblog/');
const tmp = mkdtempSync(join(tmpdir(), 'ab-virtual-'));
mkdirSync(join(tmp, 'src'));
writeFileSync(join(tmp, 'src', 'Header.astro'), '<header></header>');
writeFileSync(join(tmp, 'tema.css'), 'a{}');
const root = new URL(pathToFileURL(tmp).href + '/');
const base = { title: 'T', description: 'D' };
const BS = String.fromCharCode(92);
const posix = (p: string) => p.split(BS).join('/');

describe('components module', () => {
  it('defaults every component to the package', () => {
    const m = buildComponentsModule({}, root, pkg);
    expect(m.split('\n').filter(Boolean)).toHaveLength(13);
    expect(m).toContain('export { default as Header } from "');
    expect(m).toContain('export { default as Header } from "D:/pkg/astroblog/components/Header.astro";');
    expect(m).not.toContain(BS);
  });
  it('uses user override path as absolute POSIX', () => {
    const m = buildComponentsModule({ Header: './src/Header.astro' }, root, pkg);
    const abs = posix(join(tmp, 'src', 'Header.astro'));
    expect(m).toContain(`export { default as Header } from "${abs}";`);
    expect(m).not.toContain(BS);
  });
  it('throws a clear error for a missing override', () => {
    expect(() => buildComponentsModule({ Header: './nope.astro' }, root, pkg)).toThrow(/Header.*nope\.astro/);
  });
  it('resolveUserPath names key and path', () => {
    expect(() => resolveUserPath(root, './nope.astro', 'Footer')).toThrow(/Footer.*nope\.astro/);
  });
  it('resolveCustomCss resolves and names customCss on failure', () => {
    expect(resolveCustomCss(root, './tema.css')).toBe(posix(join(tmp, 'tema.css')));
    expect(() => resolveCustomCss(root, './missing.css')).toThrow(/customCss.*missing\.css/);
  });
});

describe('stylesheet', () => {
  it('puts customCss after global.css', () => {
    const css = buildStylesheet({ pkgDir: pkg, themes: { light: 'astroblog-light', dark: 'astroblog-dark' }, customCss: ['/p/tema.css'] });
    expect(css.indexOf('global.css')).toBeLessThan(css.indexOf('/p/tema.css'));
    expect(css.startsWith('@import "tailwindcss";')).toBe(true);
    expect(css).toContain('@source "D:/pkg/astroblog/components";');
    expect(css).toContain('@plugin "@tailwindcss/typography";');
    expect(css).toContain('@import "D:/pkg/astroblog/styles/global.css";');
    expect(css.indexOf('@plugin "daisyui"')).toBeLessThan(css.indexOf('global.css'));
  });
  it('lists built-in daisyUI themes', () => {
    const css = buildStylesheet({ pkgDir: pkg, themes: { light: 'cupcake', dark: 'dracula' }, customCss: [] });
    expect(css).toMatch(/themes:\s*cupcake --default,\s*dracula --prefersdark;/);
  });
  it('emits themes: false when both themes are our own', () => {
    const css = buildStylesheet({ pkgDir: pkg, themes: { light: 'astroblog-light', dark: 'astroblog-dark' }, customCss: [] });
    expect(css).toMatch(/themes:\s*false;/);
    expect(css).not.toContain('astroblog-light --default');
  });
  it('lists only the built-in one when the other is our own', () => {
    const css = buildStylesheet({ pkgDir: pkg, themes: { light: 'astroblog-light', dark: 'dracula' }, customCss: [] });
    expect(css).toMatch(/themes:\s*dracula --prefersdark;/);
  });
});

describe('virtual modules', () => {
  const config = parseConfig({ ...base, ui: { readMore: 'Sigue' } });
  const modules = buildVirtualModules(config, { root, pkgDir: pkg, stylesheetPath: 'D:/gen/styles.css' });

  it('builds all five modules', () => {
    expect(Object.keys(modules).sort()).toEqual([
      'virtual:astroblog/components', 'virtual:astroblog/config', 'virtual:astroblog/routes',
      'virtual:astroblog/styles', 'virtual:astroblog/ui',
    ]);
    expect(modules['virtual:astroblog/styles']).toBe('D:/gen/styles.css');
  });
  it('serializes config and merged ui', () => {
    const cfg = JSON.parse(modules['virtual:astroblog/config'].replace(/^export default /, '').replace(/;$/, ''));
    expect(cfg.title).toBe('T');
    expect(modules['virtual:astroblog/ui']).toMatch(/^export default /);
  });
  it('routes module has routes and paths table', () => {
    const r = JSON.parse(modules['virtual:astroblog/routes'].replace(/^export default /, '').replace(/;$/, ''));
    expect(r.paths.category).toBe('/categoria');
    expect(r.paths.home).toBe('/');
    expect(r.routes.some((x: { key: string }) => x.key === 'post')).toBe(true);
    expect(r.paths.adsTxt).toBeUndefined();
  });
  it('rejects a missing customCss with its path', () => {
    const bad = parseConfig({ ...base, customCss: ['./missing.css'] });
    expect(() => buildVirtualModules(bad, { root, pkgDir: pkg, stylesheetPath: 'x' })).toThrow(/customCss.*missing\.css/);
  });
});

describe('vite plugin', () => {
  const plugin = astroblogVitePlugin({
    'virtual:astroblog/config': 'export default {};',
    'virtual:astroblog/styles': 'D:/gen/styles.css',
  });
  it('resolves virtual ids with \0 prefix and loads code', () => {
    expect(plugin.resolveId('virtual:astroblog/config')).toBe('\0virtual:astroblog/config');
    expect(plugin.load('\0virtual:astroblog/config')).toBe('export default {};');
  });
  it('resolves styles to the real file', () => {
    expect(plugin.resolveId('virtual:astroblog/styles')).toBe('D:/gen/styles.css');
  });
  it('ignores unknown ids', () => {
    expect(plugin.resolveId('virtual:other')).toBeUndefined();
    expect(plugin.load('\0virtual:other')).toBeUndefined();
  });
});
