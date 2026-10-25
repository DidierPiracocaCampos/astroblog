// Checks that need the posts (not possible in validateConfig, at astro:config:setup): silo URL
// collisions and unknown reviewers. Pure: lib/blog.ts throws with the returned messages.
import type { Lang, ResolvedConfig } from '../schema/config';
import { slugify } from './posts';
import type { PostLike } from './posts';
import { homePagesPrefix, postPath, postSlug, reservedSlugs } from './routes';

const T = {
  es: {
    reserved: (label: string, s: string) => `la categoría "${label}" produce el silo "/${s}/", un slug reservado por astroblog; cámbiale el nombre.`,
    emptySlug: (label: string, id: string) => `la categoría "${label}" del post "${id}" no tiene letras ni dígitos para formar la URL del silo.`,
    pageSlug: (id: string, s: string) => `el post "${id}" tiene el slug "${s}", que choca con la paginación de su silo; renombra el fichero.`,
    collision: (path: string, a: string, b: string) => `la URL ${path} la producen dos posts, "${a}" y "${b}".`,
    reviewer: (id: string, post: string) => `el revisor "${id}" del post "${post}" no existe en \`reviewers\`.`,
  },
  en: {
    reserved: (label: string, s: string) => `category "${label}" produces the silo "/${s}/", a slug reserved by astroblog; rename it.`,
    emptySlug: (label: string, id: string) => `category "${label}" of post "${id}" has no letters or digits to build the silo URL from.`,
    pageSlug: (id: string, s: string) => `post "${id}" has the slug "${s}", which clashes with its silo's pagination; rename the file.`,
    collision: (path: string, a: string, b: string) => `the URL ${path} is produced by two posts, "${a}" and "${b}".`,
    reviewer: (id: string, post: string) => `reviewer "${id}" of post "${post}" does not exist in \`reviewers\`.`,
  },
} satisfies Record<Lang, unknown>;

type IssueConfig = Pick<ResolvedConfig, 'lang'> & Partial<Pick<ResolvedConfig, 'permalinks' | 'slugs' | 'reviewers'>>;

/** Build errors (already localized, without the `[astroblog]` prefix) for these posts; [] when fine. */
export function postIssues(posts: (PostLike & { data: { reviewer?: string } })[], config: IssueConfig): string[] {
  const t = T[config.lang];
  const issues: string[] = [];
  const cfg = config as ResolvedConfig;

  for (const post of posts) {
    const id = post.data.reviewer;
    if (id && !config.reviewers?.[id]) issues.push(t.reviewer(id, post.id));
  }
  if (config.permalinks !== 'silo') return issues;

  const reserved = new Set(reservedSlugs(cfg));
  const pageSlug = homePagesPrefix(cfg).slice(1);
  const reportedCategories = new Set<string>();
  const seen = new Map<string, string>();
  for (const post of posts) {
    const label = post.data.category;
    const cat = slugify(label);
    if (!cat) {
      issues.push(t.emptySlug(label, post.id));
      continue;
    }
    if (reserved.has(cat) && !reportedCategories.has(cat)) {
      reportedCategories.add(cat);
      issues.push(t.reserved(label, cat));
    }
    const s = postSlug(post.id);
    if (s === pageSlug) issues.push(t.pageSlug(post.id, s));
    const path = postPath(cfg, post);
    const other = seen.get(path);
    if (other) issues.push(t.collision(path, other, post.id));
    else seen.set(path, post.id);
  }
  return issues;
}
