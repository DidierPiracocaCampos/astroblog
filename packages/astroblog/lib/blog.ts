// Blog collection access shared by the injected routes (runs inside the Astro build/dev server).
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { PaginateFunction } from 'astro';
import { groupByTaxonomy, publishedPosts, withDefaultAuthor } from './posts';

export type BlogPost = CollectionEntry<'blog'>;

let cached: Promise<BlogPost[]> | undefined;

async function load(): Promise<BlogPost[]> {
  let entries: BlogPost[];
  try {
    // A project without a `blog` collection gets [] (Astro logs that it does not exist or is empty).
    entries = (await getCollection('blog')) ?? [];
  } catch {
    entries = [];
  }
  return publishedPosts(entries, { includeDrafts: import.meta.env.DEV });
}

/**
 * Published posts, newest first; drafts only in `astro dev`. In a build the collection is read once
 * and shared by every route (one "collection does not exist" warning at most); in dev it is re-read
 * on each call so content edits show up.
 */
export function loadPosts(): Promise<BlogPost[]> {
  if (import.meta.env.DEV) return load();
  return (cached ??= load());
}

export type PageEntry = CollectionEntry<'pages'>;

let cachedPages: Promise<PageEntry[]> | undefined;

async function loadPagesUncached(): Promise<PageEntry[]> {
  try {
    // The `pages` collection is optional: a project without it gets [] (at most one Astro warning).
    return (await getCollection('pages')) ?? [];
  } catch {
    return [];
  }
}

/**
 * The user's entry of the optional `pages` collection with this id (e.g. `privacidad`), if any.
 * Reads the whole collection once per build instead of `getEntry()`, which logs a warning for
 * every missing entry; in dev it is re-read on each call.
 */
export async function findPage(id: string): Promise<PageEntry | undefined> {
  const pages = import.meta.env.DEV ? loadPagesUncached() : (cachedPages ??= loadPagesUncached());
  return (await pages).find((p) => p.id === id);
}

const warn = (message: string) => console.warn(`[astroblog] ${message}`);

/**
 * `getStaticPaths` result for a paginated taxonomy route (`/categoria/[cat]/[...page]`): one
 * `paginate()` run per non-empty group, keyed by the slug, with the original `label` as a prop.
 * Slug collisions are reported through `groupByTaxonomy`'s warnings.
 */
export async function taxonomyStaticPaths(
  field: 'category' | 'tags',
  param: string,
  paginate: PaginateFunction,
  pageSize: number,
) {
  const groups = groupByTaxonomy(await loadPosts(), field, warn);
  return [...groups].flatMap(([slug, g]) =>
    paginate(g.posts, { params: { [param]: slug }, props: { label: g.label }, pageSize }));
}

/** Author groups (posts without `author` count as `fallback`, the site's `author.name`). */
export async function authorGroups(fallback: string | undefined) {
  return groupByTaxonomy(withDefaultAuthor(await loadPosts(), fallback), 'author', warn);
}
