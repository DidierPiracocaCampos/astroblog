import { describe, it, expect } from 'vitest';
import { adsTxt, robotsTxt, DEFAULT_HEADERS, mergeHeaders } from '../../lib/files';

describe('adsTxt', () => {
  it('strips ca- prefix', () => {
    expect(adsTxt('ca-pub-123')).toBe('google.com, pub-123, DIRECT, f08c47fec0942fa0\n');
  });
  it('accepts a client without prefix', () => {
    expect(adsTxt('pub-123')).toBe('google.com, pub-123, DIRECT, f08c47fec0942fa0\n');
  });
});

describe('robotsTxt', () => {
  it('allows all and points to the sitemap', () => {
    expect(robotsTxt('https://x.com/sitemap-index.xml')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://x.com/sitemap-index.xml\n',
    );
  });
});

describe('DEFAULT_HEADERS', () => {
  it('matches spec section 9 exactly', () => {
    expect(DEFAULT_HEADERS).toBe(
      '/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n' +
        '/pagefind/*\n  Cache-Control: public, max-age=3600\n' +
        '/*\n  X-Content-Type-Options: nosniff\n' +
        '  Referrer-Policy: strict-origin-when-cross-origin\n' +
        '  Permissions-Policy: camera=(), microphone=(), geolocation=()\n',
    );
  });
});

describe('mergeHeaders', () => {
  it('returns defaults when user has none', () => {
    expect(mergeHeaders(DEFAULT_HEADERS, null)).toBe(DEFAULT_HEADERS);
  });
  it('returns defaults for an empty/blank user file', () => {
    expect(mergeHeaders(DEFAULT_HEADERS, '')).toBe(DEFAULT_HEADERS);
    expect(mergeHeaders(DEFAULT_HEADERS, '\n  \n')).toBe(DEFAULT_HEADERS);
  });
  it('user header wins for same path', () => {
    const out = mergeHeaders(DEFAULT_HEADERS, '/*\n  referrer-policy: no-referrer\n/api/*\n  X-A: 1\n');
    expect(out).toContain('referrer-policy: no-referrer');
    expect(out).not.toContain('strict-origin-when-cross-origin');
    expect(out).toContain('X-Content-Type-Options: nosniff');
    expect(out).toMatch(/\/api\/\*\n  X-A: 1/);
  });
  it('keeps our path order, then user-only paths; ends with newline', () => {
    const out = mergeHeaders(DEFAULT_HEADERS, '/api/*\n  X-A: 1\n/*\n  X-B: 2\n');
    const paths = out.split('\n').filter((l) => l && !l.startsWith(' '));
    expect(paths).toEqual(['/_astro/*', '/pagefind/*', '/*', '/api/*']);
    expect(out.endsWith('\n')).toBe(true);
    expect(out).toContain('  X-B: 2');
  });
  it('handles CRLF, comments, blank lines and tab indentation', () => {
    const user =
      '# my rules\r\n\r\n/*\r\n\t# inner comment\r\n\tREFERRER-POLICY: no-referrer\r\n\r\n/api/*\r\n    X-A: 1\r\n';
    const out = mergeHeaders(DEFAULT_HEADERS, user);
    expect(out).not.toContain('\r');
    expect(out).not.toContain('#');
    expect(out).not.toContain('strict-origin-when-cross-origin');
    expect(out).toContain('\n  REFERRER-POLICY: no-referrer\n');
    expect(out).toContain('/api/*\n  X-A: 1\n');
    expect(out).toContain('  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
  });
  it('merges a path repeated in the user file and keeps duplicate user headers', () => {
    const out = mergeHeaders(DEFAULT_HEADERS, '/a\n  Link: <x>\n/a\n  Link: <y>\n');
    expect(out).toContain('/a\n  Link: <x>\n  Link: <y>\n');
    expect(out.match(/^\/a$/gm)).toHaveLength(1);
  });
  it('keeps header lines without a colon verbatim (e.g. Cloudflare detach "! Name")', () => {
    const out = mergeHeaders(DEFAULT_HEADERS, '/*\n  ! X-Content-Type-Options\n');
    expect(out).toContain('  ! X-Content-Type-Options\n');
    expect(out).toContain('  X-Content-Type-Options: nosniff\n');
  });
  it('ignores indented lines before any path', () => {
    expect(mergeHeaders(DEFAULT_HEADERS, '  X-Orphan: 1\n')).toBe(DEFAULT_HEADERS);
  });
});
