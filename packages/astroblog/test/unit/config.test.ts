import { describe, it, expect } from 'vitest';
import { parseConfig, AstroblogConfigError, COMPONENT_KEYS } from '../../schema/config';
import { validateConfig } from '../../schema/validate';

const base = { title: 'T', description: 'D' };

describe('parseConfig', () => {
  it('applies defaults', () => {
    const c = parseConfig(base);
    expect(c).toMatchObject({
      lang: 'es', search: true, postsPerPage: 10, customCss: [],
      consent: { provider: 'google' },
      theme: { light: 'astroblog-light', dark: 'astroblog-dark', default: 'system' },
    });
  });
  it('rejects cookiebot without id', () =>
    expect(() => parseConfig({ ...base, consent: { provider: 'cookiebot' } })).toThrow(AstroblogConfigError));
  it('rejects custom consent without head/reopen', () =>
    expect(() => parseConfig({ ...base, consent: { provider: 'custom', head: '<script></script>' } })).toThrow(AstroblogConfigError));
  it('rejects malformed adsense client', () =>
    expect(() => parseConfig({ ...base, adsense: { client: 'pub-1' } })).toThrow(/ca-pub/));
  it('rejects unknown component key', () =>
    expect(() => parseConfig({ ...base, components: { Foo: './x.astro' } })).toThrow(/Foo/));
  it('exposes 13 component keys', () => expect(COMPONENT_KEYS).toHaveLength(13));
  it('exposes issues with path', () => {
    try { parseConfig({ ...base, adsense: { client: 'x' } }); expect.unreachable(); }
    catch (e) {
      expect(e).toBeInstanceOf(AstroblogConfigError);
      expect((e as AstroblogConfigError).issues[0].path).toBe('adsense.client');
    }
  });
  it('reports zod issues in english when lang is en', () =>
    expect(() => parseConfig({ ...base, lang: 'en', adsense: { client: 'x' } })).toThrow(/must look like/));
  it('reports zod issues in spanish by default', () =>
    expect(() => parseConfig({ ...base, adsense: { client: 'x' } })).toThrow(/debe tener el formato/));
});

describe('parseConfig localized issues', () => {
  const msg = (input: unknown) => {
    try { parseConfig(input); } catch (e) { return (e as Error).message; }
    return '';
  };
  it('es: missing cookiebot id', () =>
    expect(msg({ ...base, consent: { provider: 'cookiebot' } })).toMatch(/consent\.id: es obligatorio/));
  it('en: missing cookiebot id', () =>
    expect(msg({ ...base, lang: 'en', consent: { provider: 'cookiebot' } })).toMatch(/consent\.id: is required/));
  it('es: unknown component key', () =>
    expect(msg({ ...base, components: { Foo: 'x' } })).toMatch(/components: clave\(s\) desconocida\(s\): "Foo"/));
  it('en: unknown component key', () =>
    expect(msg({ ...base, lang: 'en', components: { Foo: 'x' } })).toMatch(/components: unknown key\(s\): "Foo"/));
  it('es/en: invalid theme.default', () => {
    expect(msg({ ...base, theme: { default: 'x' } })).toMatch(/theme\.default: valor no válido/);
    expect(msg({ ...base, lang: 'en', theme: { default: 'x' } })).toMatch(/theme\.default: invalid value/);
  });
  it('es/en: wrong type', () => {
    expect(msg({ title: 1, description: 'D' })).toMatch(/title: debe ser de tipo string/);
    expect(msg({ title: 1, description: 'D', lang: 'en' })).toMatch(/title: must be of type string/);
  });
});

describe('validateConfig', () => {
  it('errors when adsense is set without site', () => {
    const c = parseConfig({ ...base, adsense: { client: 'ca-pub-123' } });
    expect(validateConfig(c, {}).errors[0]).toMatch(/site/);
  });
  it('warns when an AdSense-recommended route is disabled', () => {
    const c = parseConfig({ ...base, routes: { privacy: false } });
    expect(validateConfig(c, { site: 'https://x.com' }).warnings.join()).toMatch(/privacy|privacidad/);
  });
  it('warns when adsense is present and privacy is disabled', () => {
    const c = parseConfig({ ...base, adsense: { client: 'ca-pub-1' }, routes: { privacy: false } });
    expect(validateConfig(c, { site: 'https://x.com' }).warnings.length).toBeGreaterThanOrEqual(2);
  });
  it('has no errors or warnings for a healthy config', () => {
    const c = parseConfig(base);
    expect(validateConfig(c, { site: 'https://x.com', hasPosts: true })).toEqual({ errors: [], warnings: [] });
  });
  it('warns when there are no posts', () => {
    const c = parseConfig(base);
    const r = validateConfig(c, { site: 'https://x.com', hasPosts: false });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toMatch(/publicad/);
  });
  it('does not warn about posts when hasPosts is undefined', () => {
    expect(validateConfig(parseConfig(base), { site: 'https://x.com' }).warnings).toEqual([]);
  });
  it('reports messages in english when lang is en', () => {
    const c = parseConfig({ ...base, lang: 'en', adsense: { client: 'ca-pub-123' } });
    const r = validateConfig(c, {});
    expect(r.errors[0]).toMatch(/site/);
    expect(r.errors[0]).toMatch(/requires/);
  });
});
