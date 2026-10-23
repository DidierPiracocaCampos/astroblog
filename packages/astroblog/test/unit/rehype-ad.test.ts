import { describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { markdownToHast, markdownToHtml } from 'satteri';
import { rehypeAd, satteriAd } from '../../lib/rehype-ad';

const MD = '## a\np\n## b\np\n## c';
const OPTS = { slot: '1234567890', client: 'ca-pub-123', dev: false, label: 'Publicidad' };

/** Runs the Sätteri hast plugin (what Astro 7 uses by default) over Markdown. */
function render(md: string, opts: Parameters<typeof satteriAd>[0], frontmatter: Record<string, unknown> = {}): string {
  return markdownToHtml(md, { hastPlugins: [satteriAd(opts)], data: { astro: { frontmatter } } }).html;
}

describe('satteriAd (Astro 7 default pipeline)', () => {
  it('inserts ad after the second h2', () => {
    const html = render(MD, OPTS);
    const b = html.indexOf('<h2>b</h2>');
    const ins = html.indexOf('<ins class="adsbygoogle"');
    const c = html.indexOf('<h2>c</h2>');
    expect(b).toBeGreaterThan(-1);
    expect(ins).toBeGreaterThan(b);
    expect(ins).toBeLessThan(c);
    expect(html.match(/adsbygoogle"/g)).toHaveLength(1);
    expect(html).toContain('<div class="ad-slot not-prose" data-ad="inArticle">');
    expect(html).toContain('data-ad-layout="in-article"');
    expect(html).toContain('data-ad-format="fluid"');
    expect(html).toContain('data-ad-client="ca-pub-123"');
    expect(html).toContain('data-ad-slot="1234567890"');
    expect(html).toContain('style="display:block; text-align:center;"');
    expect(html).toContain('<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>');
  });

  it('skips when noAds frontmatter', () => {
    expect(render(MD, OPTS, { noAds: true })).not.toContain('ad-slot');
  });

  it('skips with fewer than two h2', () => {
    expect(render('## a\np\n### b\np', OPTS)).not.toContain('ad-slot');
  });

  it('ignores h2 nested below the top level', () => {
    expect(render('## a\n\n> ## quoted\n\np', OPTS)).not.toContain('ad-slot');
  });

  it('skips without slot or client', () => {
    expect(render(MD, { ...OPTS, slot: undefined })).not.toContain('ad-slot');
    expect(render(MD, { ...OPTS, client: undefined })).not.toContain('ad-slot');
  });

  it('skips institutional pages under src/content/pages/ but not blog posts', () => {
    const run = (fileURL: URL) =>
      markdownToHtml(MD, { hastPlugins: [satteriAd(OPTS)], fileURL, data: { astro: { frontmatter: {} } } }).html;
    expect(run(pathToFileURL(join(tmpdir(), 'site', 'src', 'content', 'pages', 'privacidad.md'))))
      .not.toContain('ad-slot');
    expect(run(pathToFileURL(join(tmpdir(), 'site', 'src', 'content', 'blog', 'post.md'))))
      .toContain('ad-slot');
  });

  it('renders placeholder in dev', () => {
    const html = render(MD, { ...OPTS, dev: true });
    expect(html).not.toContain('adsbygoogle');
    expect(html).toMatch(/<div class="ad-slot not-prose[^"]*" data-ad="inArticle">Publicidad<\/div>/);
    expect(html.indexOf('ad-slot')).toBeGreaterThan(html.indexOf('<h2>b</h2>'));
    expect(html.indexOf('ad-slot')).toBeLessThan(html.indexOf('<h2>c</h2>'));
  });
});

describe('rehypeAd (unified transformer)', () => {
  const tree = () => markdownToHast(MD) as any;
  const tags = (t: any) => t.children.filter((n: any) => n.type === 'element').map((n: any) =>
    n.tagName === 'div' ? `div.${n.properties.className.join('.')}` : n.tagName);

  it('inserts ad after the second h2', () => {
    const t = tree();
    rehypeAd(OPTS)(t, { data: { astro: { frontmatter: {} } } });
    expect(tags(t)).toEqual(['h2', 'p', 'h2', 'div.ad-slot.not-prose', 'p', 'h2']);
    const div = t.children.find((n: any) => n.tagName === 'div');
    expect(div.properties.dataAd).toBe('inArticle');
    const ins = div.children[0];
    expect(ins.tagName).toBe('ins');
    expect(ins.properties).toMatchObject({ dataAdClient: 'ca-pub-123', dataAdSlot: '1234567890' });
  });

  it('skips when noAds frontmatter', () => {
    const t = tree();
    rehypeAd(OPTS)(t, { data: { astro: { frontmatter: { noAds: true } } } });
    expect(tags(t)).toEqual(['h2', 'p', 'h2', 'p', 'h2']);
  });

  it('skips institutional pages under src/content/pages/ but not blog posts', () => {
    const data = { astro: { frontmatter: {} } };
    const page = tree();
    rehypeAd(OPTS)(page, { data, path: 'C:\\site\\src\\content\\pages\\privacidad.md' });
    expect(tags(page)).toEqual(['h2', 'p', 'h2', 'p', 'h2']);
    const posix = tree();
    rehypeAd(OPTS)(posix, { data, path: '/site/src/content/pages/privacidad.md' });
    expect(tags(posix)).toEqual(['h2', 'p', 'h2', 'p', 'h2']);
    const post = tree();
    rehypeAd(OPTS)(post, { data, path: 'C:\\site\\src\\content\\blog\\post.md' });
    expect(tags(post)).toContain('div.ad-slot.not-prose');
  });

  it('works without vfile data', () => {
    const t = tree();
    rehypeAd(OPTS)(t);
    expect(tags(t)).toContain('div.ad-slot.not-prose');
  });
});
