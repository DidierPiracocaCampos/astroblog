// Type-check-only shim: plain `tsc` cannot read .astro files (Astro's language tools can).
// Not shipped (absent from package.json "files"); consumers get real types from Astro.
declare module '*.astro' {
  const Component: import('astro/runtime/server/index.js').AstroComponentFactory;
  export default Component;
}
