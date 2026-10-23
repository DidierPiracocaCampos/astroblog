import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';
import { getUI } from '../../i18n/index';

const ui = getUI('es');
let f: BuiltFixture;
let html: string;

beforeAll(async () => {
  f = await buildFixture('basic');
  html = await f.read('index.html');
});

describe('basic fixture: head', () => {
  it('emits head in the required order', async () => {
    const idx = (s: string) => html.indexOf(s);
    expect(idx('<link rel="canonical"')).toBeGreaterThan(-1);
    expect(idx("gtag('consent', 'default'")).toBeLessThan(idx('adsbygoogle.js?client=ca-pub-123'));
    expect(idx('adsbygoogle.js')).toBeLessThan(idx('googletagmanager.com/gtag/js?id='));
    expect(html).toContain('"@type":"WebSite"');
  });

  it('follows the full spec order: meta, OG, JSON-LD, theme, consent, AdSense, GA4, CSS', () => {
    const head = html.slice(0, html.indexOf('</head>'));
    const order = [
      '<meta charset="utf-8"',
      '<meta name="viewport"',
      '<title>',
      '<meta name="description"',
      '<link rel="canonical"',
      '<meta property="og:title"',
      '<meta name="twitter:card"',
      'application/ld+json',
      'astroblog-theme',
      "gtag('consent', 'default'",
      'adsbygoogle.js?client=ca-pub-123',
      'googletagmanager.com/gtag/js?id=G-TEST',
      'rel="stylesheet"',
    ].map((s) => [s, head.indexOf(s)] as const);
    for (const [s, i] of order) expect(i, s).toBeGreaterThan(-1);
    for (let k = 1; k < order.length; k++) {
      expect(order[k][1], `${order[k - 1][0]} before ${order[k][0]}`).toBeGreaterThan(order[k - 1][1]);
    }
  });

  it('uses absolute canonical and og:url from site', () => {
    expect(html).toContain('<link rel="canonical" href="https://example.com/"');
    expect(html).toContain('<meta property="og:url" content="https://example.com/"');
  });

  it('inlines a theme script mapping light/dark to the configured theme names', () => {
    const m = html.match(/<script>([^<]*astroblog-theme[^<]*)<\/script>/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('astroblog-light');
    expect(m![1]).toContain('astroblog-dark');
    expect(m![1]).toContain('data-theme');
  });

  it('compiles Tailwind + daisyUI into the emitted stylesheet', async () => {
    const href = html.match(/<link rel="stylesheet" href="([^"]+)"/)![1];
    const css = await f.read(href.replace(/^\//, ''));
    expect(css).toContain('.navbar');
    expect(css).toContain('.footer');
    expect(css).toContain('.modal');
    expect(css).toContain('astroblog-light');
    expect(css).not.toContain('@plugin');
  });
});

describe('basic fixture: chrome', () => {
  it('footer has cookie settings and legal links', () => {
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    expect(footer).toContain(ui.cookieSettings);
    expect(footer).toContain('onclick="window.googlefc=');
    expect(footer).toContain('href="/privacidad/"');
    expect(footer).toContain('href="/cookies/"');
    expect(footer).toContain(ui.privacy);
    expect(footer).toContain(`© ${new Date().getFullYear()} Ana Pérez SL`);
    expect(footer).toContain('href="https://github.com/example"');
  });

  it('header has navbar, nav links, search button and theme toggle', () => {
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    expect(header).toContain('navbar');
    expect(header).toContain('href="/categoria/diseno/"');
    expect(header).toContain('theme-controller');
    expect(header).toContain('value="astroblog-dark"');
    expect(header).toContain(`aria-label="${ui.search}"`);
    expect(header).toContain('dropdown');
  });

  it('renders the search dialog with the pagefind bundle path', () => {
    expect(html).toContain('<dialog id="astroblog-search" class="modal ');
    expect(html).toContain('data-bundle="/pagefind/"');
  });

  it('emits only valid nesting (no block element inside <p>)', () => {
    expect(html).not.toMatch(/<p(?:\s[^>]*)?>(?:(?!<\/p>).)*<(div|ul|nav|dialog)[\s>]/s);
  });
});

describe('nosite fixture', () => {
  it('omits canonical, og:url and JSON-LD instead of emitting relative URLs', async () => {
    const page = await (await buildFixture('nosite')).read('index.html');
    expect(page).toContain('<title>Sin site</title>');
    expect(page).not.toContain('rel="canonical"');
    expect(page).not.toContain('og:url');
    expect(page).not.toContain('application/ld+json');
  });
  it('omits search button and dialog when search is off', async () => {
    const page = await (await buildFixture('nosite')).read('index.html');
    expect(page).not.toContain('data-astroblog-search-open');
    expect(page).not.toContain('astroblog-search');
  });
});
