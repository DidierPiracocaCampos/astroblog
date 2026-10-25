import { describe, expect, it } from 'vitest';
import { inlineMarkdown, inlineText } from '../../lib/inline-md';

describe('inlineMarkdown', () => {
  it('renders bold, emphasis, code and links', () => {
    expect(inlineMarkdown('**a** *b* `c` [d](https://x.es/?q=1&r=2)')).toBe(
      '<strong>a</strong> <em>b</em> <code>c</code> <a href="https://x.es/?q=1&amp;r=2">d</a>');
  });
  it('escapes HTML', () => {
    expect(inlineMarkdown('<script>alert("x")</script> & co')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co');
  });
  it('does not link javascript: URLs', () => {
    expect(inlineMarkdown('[x](javascript:alert(1))')).not.toContain('href');
  });
  it('keeps plain text as is', () => expect(inlineMarkdown('Hasta 75 años.')).toBe('Hasta 75 años.'));
});

describe('inlineText', () => {
  it('strips the markup', () => expect(inlineText('**a** *b* `c` [d](https://x)')).toBe('a b c d'));
});
