// Blog collection access shared by the injected routes (runs inside the Astro build/dev server).
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Page, PaginateFunction } from 'astro';
import config from 'virtual:astroblog/config';
import { noPostsWarning } from '../schema/validate';
import { groupByTaxonomy, lengthWarnings, publishedPosts, relatedPosts, withDefaultAuthor } from './posts';
import { homePagesPrefix, postPath } from './routes';
import { postIssues } from './silo';

export type BlogPost = CollectionEntry<'blog'>;

let cached: Promise<BlogPost[]> | undefined;

const warn = (message: string) => console.warn(`[astroblog] ${message}`);

async function load(): Promise<BlogPost[]> {
  let entries: BlogPost[];
  try {
    // A project without a `blog` collection gets [] (Astro logs that it does not exist or is empty).
    entries = (await getCollection('blog')) ?? [];
  } catch {
    entries = [];
  }
  const posts = publishedPosts(entries, { includeDrafts: import.meta.env.DEV });
  const issues = postIssues(posts, config);
  if (issues.length) throw new Error(issues.map((m) => `[astroblog] ${m}`).join('\n'));
  // `validateConfig` cannot know about posts in astro:config:setup: warn here, once per build.
  if (!import.meta.env.DEV && posts.length === 0) warn(noPostsWarning(config.lang));
  return posts;
}

/**
 * Published posts, newest first; drafts only in `astro dev`. In a build the collection is read once
 * and shared by every route (one "collection does not exist" warning at most, and one "no published
 * posts" warning when it is empty); in dev it is re-read on each call so content edits show up.
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

/**
 * Every published post with its related posts, for the post routes (`post.astro`, `silo.astro`).
 * Emits the SEO length warnings once per post (`getStaticPaths` runs once per build).
 */
export async function postEntries(): Promise<{ post: BlogPost; related: BlogPost[] }[]> {
  const posts = await loadPosts();
  for (const post of posts) for (const warning of lengthWarnings(post, config.lang)) console.warn(warning);
  return posts.map((post) => ({ post, related: relatedPosts(post, posts, 3) }));
}

/** The part of Astro's `Page` that TaxonomyLayout reads. */
export type ListingPage = Pick<Page<BlogPost>, 'data' | 'currentPage' | 'lastPage'>;

export type SiloProps =
  | { kind: 'post'; post: BlogPost; related: BlogPost[] }
  | { kind: 'category'; label: string; page: ListingPage };

/**
 * `getStaticPaths` result for the silo route (`/[...path]`): each category's listing at `<cat>`
 * (page n ≥ 2 at `<cat>/<page slug>/<n>`) and each post at `<cat>/<slug>`. Collisions were
 * rejected by `loadPosts`.
 */
export async function siloStaticPaths(pageSize: number): Promise<{ params: { path: string }; props: SiloProps }[]> {
  const pageSlug = homePagesPrefix(config).slice(1);
  const listings = [...groupByTaxonomy(await loadPosts(), 'category', warn)].flatMap(([cat, g]) => {
    const lastPage = Math.max(1, Math.ceil(g.posts.length / pageSize));
    return Array.from({ length: lastPage }, (_, i) => ({
      params: { path: i === 0 ? cat : `${cat}/${pageSlug}/${i + 1}` },
      props: {
        kind: 'category' as const,
        label: g.label,
        page: { data: g.posts.slice(i * pageSize, (i + 1) * pageSize), currentPage: i + 1, lastPage },
      },
    }));
  });
  const posts = (await postEntries()).map(({ post, related }) => ({
    params: { path: postPath(config, post).replace(/^\/+|\/+$/g, '') },
    props: { kind: 'post' as const, post, related },
  }));
  return [...listings, ...posts];
}

/** Author groups (posts without `author` count as `fallback`, the site's `author.name`). */
export async function authorGroups(fallback: string | undefined) {
  return groupByTaxonomy(withDefaultAuthor(await loadPosts(), fallback), 'author', warn);
}
