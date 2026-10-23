import { describe, expect, it } from 'vitest';
import astroblog from '../../index.ts';

describe('astroblog integration', () => {
  it('returns an integration named @didierp/astroblog', () => {
    const i = astroblog({ title: 'T', description: 'D' });
    expect(i.name).toBe('@didierp/astroblog');
    expect(typeof i.hooks['astro:config:setup']).toBe('function');
  });
});
