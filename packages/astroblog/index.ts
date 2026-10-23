import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration, AstroIntegrationLogger } from 'astro';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { AstroblogConfigError, parseConfig } from './schema/config';
import type { Lang, ResolvedConfig } from './schema/config';
import { validateConfig } from './schema/validate';
import { getUI } from './i18n/index';
import type { UIStrings } from './i18n/index';
import { resolveRoutes } from './lib/routes';
import type { ResolvedRoute } from './lib/routes';
import { astroblogVitePlugin, buildStylesheet, buildVirtualModules, virtualTypes } from './lib/virtual';
import { rehypeAd, satteriAd } from './lib/rehype-ad';
import type { AdOptions } from './lib/rehype-ad';
import { runPagefind, writeHeaders } from './lib/build';

const PKG_DIR = new URL('./', import.meta.url);

const T = {
  es: {
    collision: (pattern: string, key: string) =>
      `src/pages define la ruta "${pattern}", que astroblog también inyecta. Desactiva la de astroblog con \`routes.${key}: false\`.`,
    noProcessor: (name: string) =>
      `el procesador Markdown "${name}" no admite plugins de astroblog; el anuncio dentro del artículo (slots.inArticle) no se insertará.`,
  },
  en: {
    collision: (pattern: string, key: string) =>
      `src/pages defines the route "${pattern}", which astroblog also injects. Disable astroblog's with \`routes.${key}: false\`.`,
    noProcessor: (name: string) =>
      `the Markdown processor "${name}" does not accept astroblog plugins; the in-article ad (slots.inArticle) will not be inserted.`,
  },
} satisfies Record<Lang, unknown>;

interface ProcessorLike { name: string; options: Record<string, unknown> }

/**
 * Registers the in-article ad plugin on the active Markdown processor (shared by .md and .mdx).
 * Astro 7 defaults to Sätteri; `markdown.rehypePlugins` would require @astrojs/markdown-remark.
 */
function addAdPlugin(processor: ProcessorLike | undefined, opts: AdOptions, lang: Lang, logger: AstroIntegrationLogger) {
  if (processor?.name === 'satteri') {
    const list = (processor.options.hastPlugins ??= []) as { name?: string }[];
    const kept = list.filter((p) => p?.name !== 'astroblog-ad');
    list.splice(0, list.length, ...kept, satteriAd(opts));
  } else if (processor?.name === 'unified') {
    const list = (processor.options.rehypePlugins ??= []) as unknown[];
    const kept = list.filter((p) => !(Array.isArray(p) && p[0] === rehypeAd));
    list.splice(0, list.length, ...kept, [rehypeAd, opts]);
  } else {
    logger.warn(T[lang].noProcessor(processor?.name ?? 'unknown'));
  }
}

export default function astroblog(userConfig?: unknown): AstroIntegration {
  let config: ResolvedConfig;
  let injected: ResolvedRoute[] = [];
  let publicDir: URL;
  const warned = new Set<string>();

  return {
    name: '@didierp/astroblog',
    hooks: {
      'astro:config:setup': ({ config: astro, command, updateConfig, injectRoute, addWatchFile, createCodegenDir, logger }) => {
        try {
          config = parseConfig(userConfig);
        } catch (e) {
          if (e instanceof AstroblogConfigError) throw new Error(e.message, { cause: e });
          throw e;
        }

        const { errors, warnings } = validateConfig(config, { site: astro.site });
        if (errors.length) throw new Error(errors.map((m) => `[astroblog] ${m}`).join('\n'));
        for (const w of warnings) logger.warn(w);

        publicDir = astro.publicDir;
        const stylesheetUrl = new URL('styles.css', createCodegenDir());
        const { modules, customCss } = buildVirtualModules(config, {
          root: astro.root,
          pkgDir: PKG_DIR,
          stylesheetPath: fileURLToPath(stylesheetUrl),
        });
        writeFileSync(stylesheetUrl, buildStylesheet({ pkgDir: PKG_DIR, themes: config.theme, customCss }));
        for (const css of customCss) addWatchFile(css);

        const names = new Set(astro.integrations.map((i) => i.name));
        updateConfig({
          vite: {
            plugins: [tailwindcss(), astroblogVitePlugin(modules)],
            ssr: { noExternal: ['@didierp/astroblog'] },
          },
          integrations: [
            ...(names.has('@astrojs/mdx') ? [] : [mdx()]),
            ...(names.has('@astrojs/sitemap') ? [] : [sitemap()]),
          ],
        });

        if (config.adsense?.slots?.inArticle) {
          const ui = getUI(config.lang, config.ui as Partial<UIStrings> | undefined);
          addAdPlugin(astro.markdown.processor as ProcessorLike | undefined, {
            slot: config.adsense.slots.inArticle,
            client: config.adsense.client,
            dev: command === 'dev',
            label: ui.advertisement,
          }, config.lang, logger);
        }

        const ownAdsTxt = existsSync(new URL('ads.txt', astro.publicDir));
        injected = resolveRoutes(config).filter((r) => !(r.key === 'adsTxt' && ownAdsTxt));
        for (const r of injected) {
          injectRoute({ pattern: r.pattern, entrypoint: new URL(`./routes/${r.entry}`, import.meta.url) });
        }
      },

      'astro:routes:resolved': ({ routes, logger }) => {
        for (const route of routes) {
          if (route.origin !== 'project') continue;
          const ours = injected.find((r) => r.pattern === route.pattern);
          if (!ours || warned.has(route.pattern)) continue;
          warned.add(route.pattern); // the hook runs more than once per build
          logger.warn(T[config.lang].collision(route.pattern, ours.key));
        }
      },

      'astro:config:done': ({ injectTypes }) => {
        const source = readFileSync(new URL('./virtual.d.ts', import.meta.url), 'utf8');
        injectTypes({ filename: 'virtual.d.ts', content: virtualTypes(source, PKG_DIR) });
      },

      'astro:build:done': async ({ dir, logger }) => {
        await writeHeaders(dir, publicDir);
        if (config.search) {
          const { pages } = await runPagefind(dir);
          logger.info(`pagefind: ${pages} page(s) indexed`);
        }
      },
    },
  };
}
