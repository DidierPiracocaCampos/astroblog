import { describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';

describe('minimal fixture', () => {
  it('builds and emits dist/index.html', async () => {
    const out = await buildFixture('minimal');
    expect(out.exists('index.html')).toBe(true);
    expect(await out.read('index.html')).toContain('Minimal');
  });
});
