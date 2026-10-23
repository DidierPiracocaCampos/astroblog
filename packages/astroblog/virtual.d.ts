// Ambient declarations for the astroblog virtual modules.
// Types are referenced with inline `import()` types relative to this file; the integration
// injects it via `injectTypes` with those paths rewritten to absolute ones (`virtualTypes`).

declare module 'virtual:astroblog/config' {
  const config: import('./schema/config').ResolvedConfig;
  export default config;
}

declare module 'virtual:astroblog/ui' {
  const ui: import('./i18n/index').UIStrings;
  export default ui;
}

declare module 'virtual:astroblog/components' {
  type Component = import('astro/runtime/server/index.js').AstroComponentFactory;
  export const Header: Component;
  export const Footer: Component;
  export const ThemeToggle: Component;
  export const Search: Component;
  export const PostCard: Component;
  export const PostHeader: Component;
  export const TableOfContents: Component;
  export const RelatedPosts: Component;
  export const ShareLinks: Component;
  export const AuthorBox: Component;
  export const Breadcrumbs: Component;
  export const Pagination: Component;
  export const Comments: Component;
}

declare module 'virtual:astroblog/routes' {
  const routes: {
    routes: import('./lib/routes').ResolvedRoute[];
    paths: Partial<Record<import('./schema/config').RouteKey, string>>;
  };
  export default routes;
}

declare module 'virtual:astroblog/styles' {}
