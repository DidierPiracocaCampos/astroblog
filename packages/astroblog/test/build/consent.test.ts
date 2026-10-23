import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';
import { getUI } from '../../i18n/index';

const es = getUI('es');
let f: BuiltFixture;
let en: BuiltFixture;

beforeAll(async () => {
  f = await buildFixture('basic');
  en = await buildFixture('minimal-legal');
});

describe('consent gate and giscus', () => {
  it('giscus is inside a consent template', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html).toMatch(/<template data-consent-gate[^>]*>[\s\S]*giscus\.app\/client\.js[\s\S]*<\/template>/);
  });

  it('giscus script carries the configured attributes', async () => {
    const html = await f.read('blog/post-largo/index.html');
    const tpl = html.match(/<template data-consent-gate[^>]*>[\s\S]*?<\/template>/)![0];
    expect(tpl).toContain('data-repo="example/comments"');
    expect(tpl).toContain('data-repo-id="R_1"');
    expect(tpl).toContain('data-category="Anuncios"');
    expect(tpl).toContain('data-category-id="DIC_1"');
    expect(tpl).toContain('data-mapping="pathname"');
    expect(tpl).toContain('data-reactions-enabled="1"');
    expect(tpl).toContain('data-input-position="bottom"');
    expect(tpl).toContain('data-theme="preferred_color_scheme"');
    expect(tpl).toContain('data-lang="es"');
    expect(tpl).toContain('crossorigin="anonymous"');
    expect(tpl).toMatch(/\basync\b/);
    expect(tpl).toMatch(/data-category="preferences"/);
  });

  it('shows the localized placeholder with a manage-cookies button', async () => {
    const html = await f.read('blog/post-largo/index.html');
    const root = html.match(/<div[^>]*data-consent-root[\s\S]*?<\/template>/)![0];
    expect(root).toContain('role="alert"');
    expect(root).toContain('data-consent-placeholder');
    expect(root).toContain(es.consentRequired);
    expect(root).toContain(`>${es.manageCookies}</button>`);
  });

  it('giscus never appears outside the template', async () => {
    const html = await f.read('blog/post-largo/index.html');
    expect(html.replace(/<template data-consent-gate[\s\S]*?<\/template>/g, '')).not.toContain('giscus.app');
  });

  it('no comments without config', async () => {
    const html = await en.read('index.html');
    expect(html).not.toContain('giscus.app');
    expect(html).not.toContain('data-consent-gate');
  });
});
