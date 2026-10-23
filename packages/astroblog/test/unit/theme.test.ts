import { describe, it, expect } from 'vitest';
import { THEME_STORAGE_KEY, themeScript } from '../../lib/theme';

type Env = { stored?: string | null; prefersDark?: boolean; throws?: boolean };

function run(script: string, env: Env): string | null {
  const attrs: Record<string, string> = {};
  const localStorage = {
    getItem(k: string) {
      if (env.throws) throw new Error('blocked');
      return k === THEME_STORAGE_KEY ? env.stored ?? null : null;
    },
  };
  const document = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } };
  const matchMedia = (q: string) => ({ matches: q.includes('dark') && Boolean(env.prefersDark) });
  new Function('localStorage', 'document', 'matchMedia', script)(localStorage, document, matchMedia);
  return attrs['data-theme'] ?? null;
}

const themes = { light: 'cupcake', dark: 'dracula' };

describe('themeScript', () => {
  it('maps the stored light/dark value to the configured theme names', () => {
    const s = themeScript({ ...themes, default: 'system' });
    expect(run(s, { stored: 'dark' })).toBe('dracula');
    expect(run(s, { stored: 'light', prefersDark: true })).toBe('cupcake');
  });
  it('falls back to prefers-color-scheme with default "system"', () => {
    const s = themeScript({ ...themes, default: 'system' });
    expect(run(s, { prefersDark: true })).toBe('dracula');
    expect(run(s, { prefersDark: false })).toBe('cupcake');
    expect(run(s, { stored: 'bogus', prefersDark: true })).toBe('dracula');
  });
  it('uses the configured default when nothing is stored', () => {
    expect(run(themeScript({ ...themes, default: 'dark' }), {})).toBe('dracula');
    expect(run(themeScript({ ...themes, default: 'light' }), { prefersDark: true })).toBe('cupcake');
  });
  it('survives blocked storage', () => {
    expect(run(themeScript({ ...themes, default: 'dark' }), { throws: true })).toBe('dracula');
  });
  it('cannot break out of the inline <script>', () => {
    const s = themeScript({ light: '</script><b>', dark: 'x', default: 'system' });
    expect(s).not.toContain('</script>');
    expect(run(s, { stored: 'light' })).toBe('</script><b>');
  });
});
