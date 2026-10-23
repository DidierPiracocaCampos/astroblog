import { describe, expect, it } from 'vitest';
import { institutionalKey, legalContext, pageEntryId } from '../../lib/legal';
import { parseConfig } from '../../schema/config';

const base = { title: 'T', description: 'D' };

describe('legalContext', () => {
  it('falls back owner → author → title and owner.email → author.email → contact.email', () => {
    expect(legalContext(parseConfig(base))).toMatchObject({ owner: 'T', email: undefined, ads: false, ga4: false, giscus: false });
    expect(legalContext(parseConfig({ ...base, author: { name: 'A', email: 'a@x' }, contact: { email: 'c@x' } })))
      .toMatchObject({ owner: 'A', email: 'a@x' });
    expect(legalContext(parseConfig({ ...base, contact: { email: 'c@x' } })).email).toBe('c@x');
    expect(legalContext(parseConfig({ ...base, author: { name: 'A', email: 'a@x' }, owner: { name: 'O', country: 'ES', email: 'o@x' } })))
      .toMatchObject({ owner: 'O', country: 'ES', email: 'o@x' });
  });

  it('flags active services and names the CMP in the site language', () => {
    const c = legalContext(parseConfig({
      ...base, lang: 'en',
      adsense: { client: 'ca-pub-1' }, analytics: { ga4: 'G-1' },
      comments: { giscus: { repo: 'r', repoId: 'i', category: 'c', categoryId: 'ci' } },
      consent: { provider: 'cookiebot', id: 'x' },
    }));
    expect(c).toMatchObject({ ads: true, ga4: true, giscus: true, cmp: 'Cookiebot (Usercentrics)' });
    expect(legalContext(parseConfig(base)).cmp).toContain('Google');
  });
});

describe('institutionalKey / pageEntryId', () => {
  const paths = { home: '/', privacy: '/privacidad/', legal: '/aviso-legal/', about: '/sobre-mi/' };
  it('matches the pathname ignoring slashes', () => {
    expect(institutionalKey(paths, '/privacidad/')).toBe('privacy');
    expect(institutionalKey(paths, '/aviso-legal')).toBe('legal');
    expect(institutionalKey(paths, '/sobre-mi/')).toBe('about');
    expect(institutionalKey(paths, '/')).toBeUndefined();
    expect(institutionalKey(paths, '/cookies/')).toBeUndefined();
  });
  it('uses the last path segment as the entry id', () => {
    expect(pageEntryId('/privacidad/')).toBe('privacidad');
    expect(pageEntryId('/legal/notice/')).toBe('notice');
  });
});
