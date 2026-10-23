// Browser-only. No Node imports: importable from an Astro <script>.
// Loads Pagefind's default UI (`<bundle>pagefind-ui.css` / `.js`, bundle = `<base>pagefind/`) and
// mounts it on `element`. Shared by the search modal (components/Search.astro) and the search page.

export interface PagefindUIInstance {
  triggerSearch(term: string): void;
}

const loaded = new Map<string, Promise<void>>();

function loadBundle(bundle: string): Promise<void> {
  let p = loaded.get(bundle);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = `${bundle}pagefind-ui.css`;
      document.head.append(css);
      const script = document.createElement('script');
      script.src = `${bundle}pagefind-ui.js`;
      script.onload = () => resolve();
      script.onerror = () => {
        loaded.delete(bundle);
        reject(new Error('pagefind-ui.js could not be loaded'));
      };
      document.head.append(script);
    });
    loaded.set(bundle, p);
  }
  return p;
}

export async function mountPagefindUI(opts: { element: string; bundle: string; placeholder?: string }): Promise<PagefindUIInstance> {
  await loadBundle(opts.bundle);
  const PagefindUI = (window as any).PagefindUI;
  return new PagefindUI({
    element: opts.element,
    bundlePath: opts.bundle,
    showSubResults: true,
    translations: opts.placeholder ? { placeholder: opts.placeholder } : undefined,
  });
}
