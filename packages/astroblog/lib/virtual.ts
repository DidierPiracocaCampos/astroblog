import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENT_KEYS, ROUTE_KEYS } from '../schema/config';
import type { ComponentKey, ResolvedConfig, RouteKey } from '../schema/config';
import { getUI } from '../i18n/index';
import type { UIStrings } from '../i18n/index';
import { resolveRoutes, routePath } from './routes';

/** Structurally a Vite plugin (vite is not a direct dependency to import its type from). */
export interface VirtualModulesPlugin {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
}

/** Absolute POSIX path (forward slashes, `C:/...` on Windows). */
function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/** Absolute POSIX directory path of a URL, without trailing slash. */
function dirOf(url: URL): string {
  return toPosix(fileURLToPath(url)).replace(/\/+$/, '');
}

function resolveExisting(root: URL, p: string): string | undefined {
  const abs = path.resolve(fileURLToPath(root), p);
  return existsSync(abs) ? toPosix(abs) : undefined;
}

/** Resolves a user-supplied path relative to the project root; throws naming key and path if missing. */
export function resolveUserPath(root: URL, p: string, key: string): string {
  const abs = resolveExisting(root, p);
  if (!abs) throw new Error(`astroblog: components.${key} points to "${p}", but that file does not exist.`);
  return abs;
}

/** Resolves a `customCss` entry relative to the project root; throws naming `customCss` and the path. */
export function resolveCustomCss(root: URL, p: string): string {
  const abs = resolveExisting(root, p);
  if (!abs) throw new Error(`astroblog: customCss entry "${p}" does not exist.`);
  return abs;
}

export function buildComponentsModule(
  overrides: Partial<Record<ComponentKey, string>>,
  root: URL,
  pkgDir: URL,
): string {
  const pkg = dirOf(pkgDir);
  return COMPONENT_KEYS.map((key) => {
    const override = overrides[key];
    const target = override ? resolveUserPath(root, override, key) : `${pkg}/components/${key}.astro`;
    return `export { default as ${key} } from ${JSON.stringify(target)};`;
  }).join('\n');
}

const OWN_THEME = /^astroblog-/;

export function buildStylesheet(opts: {
  pkgDir: URL;
  themes: { light: string; dark: string };
  customCss: string[];
}): string {
  const pkg = dirOf(opts.pkgDir);
  const { light, dark } = opts.themes;
  const builtin: string[] = [];
  if (!OWN_THEME.test(light)) builtin.push(`${light} --default`);
  if (!OWN_THEME.test(dark)) builtin.push(`${dark} --prefersdark`);
  const themes = builtin.length ? builtin.join(', ') : 'false';
  return [
    '@import "tailwindcss";',
    `@source "${pkg}/components";`,
    `@source "${pkg}/layouts";`,
    `@source "${pkg}/routes";`,
    `@source "${pkg}/legal";`,
    '@plugin "@tailwindcss/typography";',
    `@plugin "daisyui" {\n  themes: ${themes};\n}`,
    `@import "${pkg}/styles/global.css";`,
    ...opts.customCss.map((css) => `@import "${css}";`),
    '',
  ].join('\n');
}

const exportDefault = (value: unknown) => `export default ${JSON.stringify(value)};`;

export interface VirtualModulesOptions {
  root: URL;
  pkgDir: URL;
  /** Absolute path of the generated styles.css */
  stylesheetPath: string;
}

/**
 * Builds the code for each virtual module. `virtual:astroblog/styles` maps to the real
 * stylesheet file path (not code) so Tailwind's Vite plugin processes it.
 */
export function buildVirtualModules(config: ResolvedConfig, opts: VirtualModulesOptions): Record<string, string> {
  // Validate customCss now so a bad path fails with a clear message (the stylesheet itself is written in Task 9).
  config.customCss.forEach((p) => resolveCustomCss(opts.root, p));

  const paths: Partial<Record<RouteKey, string>> = {};
  for (const key of ROUTE_KEYS) {
    if (resolveRoutes(config).some((r) => r.key === key)) paths[key] = routePath(config, key);
  }

  return {
    'virtual:astroblog/config': exportDefault(config),
    'virtual:astroblog/ui': exportDefault(getUI(config.lang, config.ui as Partial<UIStrings> | undefined)),
    'virtual:astroblog/components': buildComponentsModule(config.components ?? {}, opts.root, opts.pkgDir),
    'virtual:astroblog/routes': exportDefault({ routes: resolveRoutes(config), paths }),
    'virtual:astroblog/styles': toPosix(opts.stylesheetPath),
  };
}

export function astroblogVitePlugin(modules: Record<string, string>): VirtualModulesPlugin {
  return {
    name: 'astroblog:virtual-modules',
    resolveId(id) {
      if (!(id in modules)) return undefined;
      // The stylesheet resolves to its real file so the CSS pipeline handles it.
      return id === 'virtual:astroblog/styles' ? modules[id] : `\0${id}`;
    },
    load(id) {
      if (!id.startsWith('\0')) return undefined;
      return modules[id.slice(1)];
    },
  };
}
