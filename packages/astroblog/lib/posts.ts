export type PostLike = {
  id: string;
  body?: string;
  data: {
    title: string;
    pubDate: Date;
    category: string;
    tags: string[];
    draft: boolean;
    author?: string;
  };
};

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const byDateDesc = (a: PostLike, b: PostLike) =>
  b.data.pubDate.getTime() - a.data.pubDate.getTime();

export function publishedPosts<T extends PostLike>(posts: T[], opts: { includeDrafts: boolean }): T[] {
  return posts.filter((p) => opts.includeDrafts || !p.data.draft).sort(byDateDesc);
}

export function readingTime(body: string, wpm = 200): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export function relatedPosts<T extends PostLike>(post: T, all: T[], limit = 3): T[] {
  const tags = new Set(post.data.tags);
  return all
    .filter((o) => o.id !== post.id)
    .map((o) => ({
      o,
      score:
        (o.data.category === post.data.category ? 2 : 0) +
        o.data.tags.filter((t) => tags.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.o, b.o))
    .slice(0, limit)
    .map((x) => x.o);
}

const normalizeLabel = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function groupByTaxonomy<T extends PostLike>(
  posts: T[],
  field: 'category' | 'tags' | 'author',
  warn?: (message: string) => void,
): Map<string, { label: string; posts: T[] }> {
  const groups = new Map<string, { label: string; posts: T[] }>();
  const warned = new Set<string>();
  const warnOnce = (key: string, message: string) => {
    if (warned.has(key)) return;
    warned.add(key);
    warn?.(message);
  };
  for (const post of posts) {
    const raw = post.data[field];
    const labels = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const label of labels) {
      const slug = slugify(label);
      if (!slug) {
        warnOnce(`empty|${label}`, `Skipping ${field} "${label}" in post "${post.id}": it has no letters or digits to build a slug from.`);
        continue;
      }
      let g = groups.get(slug);
      if (!g) groups.set(slug, (g = { label, posts: [] }));
      else if (normalizeLabel(g.label) !== normalizeLabel(label)) {
        warnOnce(
          `${slug}|${label}`,
          `${field} labels "${g.label}" and "${label}" both produce the slug "${slug}" and were merged under "${g.label}".`,
        );
      }
      if (!g.posts.includes(post)) g.posts.push(post);
    }
  }
  return groups;
}
