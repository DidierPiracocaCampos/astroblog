/**
 * In-article AdSense slot: inserted right after the second top-level `h2` of a post.
 *
 * Astro 7 renders Markdown/MDX with Sätteri by default, whose hast plugins are visitor
 * objects (`satteriAd`); `rehypeAd` is the equivalent unified transformer for projects
 * that set `markdown.processor: unified()`. Both share the same decision and node builder.
 */

export interface AdOptions {
  slot?: string;
  client?: string;
  dev: boolean;
  /** Placeholder text shown in dev (from `virtual:astroblog/ui` → `advertisement`). */
  label?: string;
}

/** Minimal structural hast types (avoids depending on @types/hast). */
interface HastText { type: 'text'; value: string }
interface HastElement {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: HastChild[];
}
type HastChild = HastElement | HastText | { type: string };
interface HastRoot { type: 'root'; children: HastChild[] }

const PUSH = '(adsbygoogle = window.adsbygoogle || []).push({});';

const el = (tagName: string, properties: Record<string, unknown>, children: HastChild[] = []): HastElement =>
  ({ type: 'element', tagName, properties, children });

/** The ad node to insert, or null when the slot is not configured. */
export function adNode(opts: AdOptions): HastElement | null {
  if (!opts.slot || !opts.client) return null;
  if (opts.dev) {
    return el('div', {
      className: ['ad-slot', 'not-prose', 'ad-placeholder'],
      dataAd: 'inArticle',
    }, [{ type: 'text', value: opts.label ?? 'Anuncio' } as HastText]);
  }
  return el('div', { className: ['ad-slot', 'not-prose'], dataAd: 'inArticle' }, [
    el('ins', {
      className: ['adsbygoogle'],
      style: 'display:block; text-align:center;',
      dataAdLayout: 'in-article',
      dataAdFormat: 'fluid',
      dataAdClient: opts.client,
      dataAdSlot: opts.slot,
    }),
    el('script', {}, [{ type: 'text', value: PUSH } as HastText]),
  ]);
}

/** The second top-level `h2`, if any. */
function anchor(children: readonly HastChild[]): HastElement | undefined {
  const h2s = children.filter((c): c is HastElement => c.type === 'element' && (c as HastElement).tagName === 'h2');
  return h2s[1];
}

const noAds = (data: unknown) =>
  (data as { astro?: { frontmatter?: { noAds?: unknown } } } | undefined)?.astro?.frontmatter?.noAds === true;

/**
 * Institutional pages (`src/content/pages/`) never get the in-article ad (spec §6 scopes it
 * to posts). Only the default location is detected; a custom `pages` loader base is not.
 */
export function isInstitutionalPage(path: string | undefined): boolean {
  return Boolean(path?.replace(/\\/g, '/').includes('/src/content/pages/'));
}

/** unified/rehype plugin: `rehypePlugins: [[rehypeAd, opts]]`. */
export function rehypeAd(opts: AdOptions) {
  return (tree: HastRoot, file?: { data?: unknown; path?: string }): void => {
    const node = adNode(opts);
    if (!node || noAds(file?.data) || isInstitutionalPage(file?.path)) return;
    const target = anchor(tree.children);
    if (!target) return;
    tree.children.splice(tree.children.indexOf(target) + 1, 0, node);
  };
}

/** Structural subset of Sätteri's `HastVisitorContext` used here. */
interface SatteriCtx {
  readonly data: unknown;
  readonly fileURL: URL | undefined;
  insertAfter(node: unknown, newNode: unknown): void;
}

/**
 * Sätteri hast plugin (Astro 7 default processor): `hastPlugins: [satteriAd(opts)]`.
 *
 * `adOptions` is not read by Sätteri (it only looks up visitor method names and `options`,
 * its own `{ position }` settings). It is there because Astro's content layer caches rendered
 * Markdown and invalidates it by a JSON digest of the Astro config, which drops functions:
 * without a serialisable copy of the options, changing the slot/client (or dev ↔ build)
 * would keep serving stale ad markup.
 */
export function satteriAd(opts: AdOptions) {
  return {
    name: 'astroblog-ad',
    adOptions: { ...opts },
    after(root: Readonly<HastRoot>, ctx: SatteriCtx): void {
      const node = adNode(opts);
      const path = ctx.fileURL && decodeURIComponent(ctx.fileURL.pathname);
      if (!node || noAds(ctx.data) || isInstitutionalPage(path)) return;
      const target = anchor(root.children);
      if (target) ctx.insertAfter(target, node);
    },
  };
}
