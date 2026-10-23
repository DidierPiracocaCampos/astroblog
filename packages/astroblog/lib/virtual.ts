import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENT_KEYS, ROUTE_KEYS } from '../schema/config';
import type { ComponentKey, ResolvedConfig, RouteKey } from '../schema/config';
import { getUI } from '../i18n/index';
import type { UIStrings } from '../i18n/index';
import { DARK_THEME, LIGHT_THEME } from '../styles/themes';
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
  try {
    return statSync(abs).isFile() ? toPosix(abs) : undefined;
  } catch {
    return undefined;
  }
}

/** Resolves a user-supplied path relative to the project root; throws naming key and path if missing. */
export function resolveUserPath(root: URL, p: string, key: string): string {
  const abs = resolveExisting(root, p);
  if (!abs) throw new Error(`astroblog: components.${key} points to "${p}", but that is not an existing file.`);
  return abs;
}

/** Resolves a `customCss` entry relative to the project root; throws naming `customCss` and the path. */
export function resolveCustomCss(root: URL, p: string): string {
  const abs = resolveExisting(root, p);
  if (!abs) throw new Error(`astroblog: customCss entry "${p}" is not an existing file.`);
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
    `@plugin "daisyui" {\n  themes: ${themes};\n  logs: false;\n}`,
    ...(light === 'astroblog-light' ? [LIGHT_THEME] : []),
    ...(dark === 'astroblog-dark' ? [DARK_THEME] : []),
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
 * Also returns `customCss`: the already-resolved absolute POSIX paths (validated, throws
 * naming `customCss` and the path). Pass them to `buildStylesheet` so they resolve once.
 */
export function buildVirtualModules(
  config: ResolvedConfig,
  opts: VirtualModulesOptions,
): { modules: Record<string, string>; customCss: string[] } {
  const customCss = config.customCss.map((p) => resolveCustomCss(opts.root, p));

  const paths: Partial<Record<RouteKey, string>> = {};
  for (const key of ROUTE_KEYS) {
    if (resolveRoutes(config).some((r) => r.key === key)) paths[key] = routePath(config, key);
  }

  const modules = {
    'virtual:astroblog/config': exportDefault(config),
    'virtual:astroblog/ui': exportDefault(getUI(config.lang, config.ui as Partial<UIStrings> | undefined)),
    'virtual:astroblog/components': buildComponentsModule(config.components ?? {}, opts.root, opts.pkgDir),
    'virtual:astroblog/routes': exportDefault({ routes: resolveRoutes(config), paths }),
    'virtual:astroblog/styles': toPosix(opts.stylesheetPath),
  };
  return { modules, customCss };
}

/**
 * Rewrites the relative `import('./x')` types of the package's `virtual.d.ts` to absolute
 * POSIX paths so the declarations resolve when injected into the project's `.astro/` dir.
 */
export function virtualTypes(source: string, pkgDir: URL): string {
  const pkg = dirOf(pkgDir);
  return source.replace(/import\((['"])\.\/([^'"]+)\1\)/g, (_m, q: string, rel: string) => `import(${q}${pkg}/${rel}${q})`);
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
