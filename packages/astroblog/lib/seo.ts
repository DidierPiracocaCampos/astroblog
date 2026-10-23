export function absoluteUrl(site: string, base: string, path: string): string {
  const origin = site.replace(/\/+$/, '');
  const baseSeg = base.replace(/^\/+|\/+$/g, '');
  const pathSeg = path.replace(/^\/+/, '');
  const joined = [baseSeg, pathSeg].filter(Boolean).join('/').replace(/\/{2,}/g, '/');
  if (!joined) return `${origin}/`;
  const trailing = pathSeg === '' || pathSeg.endsWith('/');
  return `${origin}/${joined}${trailing && !joined.endsWith('/') ? '/' : ''}`;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface MetaInput {
  title: string;
  siteTitle: string;
  description: string;
  url: string;
  image?: string;
  type: 'website' | 'article';
  lang: 'es' | 'en';
  publishedTime?: Date;
  modifiedTime?: Date;
}

export function buildMeta(input: MetaInput): { title: string; meta: MetaTag[] } {
  const title =
    input.title === input.siteTitle ? input.title : `${input.title} | ${input.siteTitle}`;
  const meta: MetaTag[] = [
    { name: 'description', content: input.description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: input.description },
    { property: 'og:type', content: input.type },
    { property: 'og:url', content: input.url },
    { property: 'og:site_name', content: input.siteTitle },
    { property: 'og:locale', content: input.lang === 'es' ? 'es_ES' : 'en_US' },
    { name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: input.description },
  ];
  if (input.image) {
    meta.push({ property: 'og:image', content: input.image });
    meta.push({ name: 'twitter:image', content: input.image });
  }
  if (input.publishedTime) {
    meta.push({ property: 'article:published_time', content: input.publishedTime.toISOString() });
  }
  if (input.modifiedTime) {
    meta.push({ property: 'article:modified_time', content: input.modifiedTime.toISOString() });
  }
  return { title, meta };
}

export function jsonLdWebsite(c: {
  name: string;
  url: string;
  description: string;
  publisher: { name: string; logo?: string };
}): object {
  const org: Record<string, unknown> = { '@type': 'Organization', name: c.publisher.name };
  if (c.publisher.logo) org.logo = c.publisher.logo;
  return {
    '@context': 'https://schema.org',
    '@graph': [{ '@type': 'WebSite', name: c.name, url: c.url, description: c.description }, org],
  };
}

export function jsonLdPost(c: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: Date;
  dateModified?: Date;
  author: { name: string; url?: string };
  publisherName: string;
}): object {
  const author: Record<string, unknown> = { '@type': 'Person', name: c.author.name };
  if (c.author.url) author.url = c.author.url;
  const out: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: c.title,
    description: c.description,
    mainEntityOfPage: c.url,
    url: c.url,
    datePublished: c.datePublished.toISOString(),
    dateModified: (c.dateModified ?? c.datePublished).toISOString(),
    author,
    publisher: { '@type': 'Organization', name: c.publisherName },
  };
  if (c.image) out.image = c.image;
  return out;
}

export function jsonLdBreadcrumbs(items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
