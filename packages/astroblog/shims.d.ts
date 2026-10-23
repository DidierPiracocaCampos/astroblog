// Type-check-only shim: plain `tsc` cannot read .astro files (Astro's language tools can).
// Not shipped (absent from package.json "files"); consumers get real types from Astro.
declare module '*.astro' {
  const Component: import('astro/runtime/server/index.js').AstroComponentFactory;
  export default Component;
}

// `astro:content` is generated per project (.astro/content.d.ts); this minimal shape is enough to
// type-check lib/blog.ts here. Projects get the real, schema-typed declarations.
declare module 'astro:content' {
  export type CollectionEntry<C extends string> = {
    id: string;
    collection: C;
    body?: string;
    data: {
      title: string; description: string; pubDate: Date; updatedDate?: Date;
      category: string; tags: string[]; draft: boolean; noAds: boolean; author?: string;
    };
  };
  export function getCollection<C extends string>(collection: C): Promise<CollectionEntry<C>[]>;
}
