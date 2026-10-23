import { describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';

describe('minimal fixture', () => {
  it('builds and emits dist/index.html', async () => {
    const out = await buildFixture('minimal');
    expect(out.exists('index.html')).toBe(true);
    expect(await out.read('index.html')).toContain('Minimal');
  });

  it('emits consent default but no ad or GA4 scripts without adsense/analytics', async () => {
    const page = await (await buildFixture('minimal')).read('index.html');
    expect(page).toContain("gtag('consent', 'default'");
    expect(page).not.toContain('adsbygoogle');
    expect(page).not.toContain('googletagmanager');
  });
});
