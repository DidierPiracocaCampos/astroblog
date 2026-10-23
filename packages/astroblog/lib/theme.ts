import type { ResolvedConfig } from '../schema/config';

/** localStorage key holding the user's choice: 'light' | 'dark'. */
export const THEME_STORAGE_KEY = 'astroblog-theme';

// `<` (closing </script>) and the JS line separators U+2028/U+2029.
const UNSAFE = new RegExp(`[<${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

/** JSON literal safe to embed inside an inline <script>. */
function jsLiteral(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * Blocking anti-flicker script for <head> (spec §6, step 3): reads the stored 'light'|'dark'
 * choice, else `theme.default` / prefers-color-scheme, and sets `data-theme` on <html>
 * to the configured daisyUI theme name.
 */
export function themeScript(theme: ResolvedConfig['theme']): string {
  const names = jsLiteral({ light: theme.light, dark: theme.dark });
  return `(function(){var n=${names},d=${jsLiteral(theme.default)},s=null;` +
    `try{s=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}` +
    `var m=s==='light'||s==='dark'?s:d!=='system'?d:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';` +
    `document.documentElement.setAttribute('data-theme',n[m]);})();`;
}
