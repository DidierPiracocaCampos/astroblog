// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adsenseScript, cmpHead, consentDefaultScript, ga4Scripts, hasCmp, reopenScript,
} from '../../lib/consent';
import { onConsent } from '../../lib/consent-client';
import { mountConsentGates } from '../../lib/consent-gate-client';

const w = window as any;

describe('consent snippets', () => {
  it('default denies all four signals', () => {
    const s = consentDefaultScript();
    for (const k of ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage']) {
      expect(s).toMatch(new RegExp(`${k}:\\s*'denied'`));
    }
    expect(s).toContain('wait_for_update: 500');
    expect(s).toContain('function gtag(){dataLayer.push(arguments);}');
  });

  it('cmpHead per provider', () => {
    expect(cmpHead({ provider: 'google' })).toBe('');
    expect(cmpHead({ provider: 'cookiebot', id: 'abc' })).toBe(
      '<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="abc" data-blockingmode="auto" type="text/javascript"></script>',
    );
    expect(cmpHead({ provider: 'cookieyes', id: 'x1' })).toBe(
      '<script id="cookieyes" type="text/javascript" src="https://cdn-cookieyes.com/client_data/x1/script.js"></script>',
    );
    expect(cmpHead({ provider: 'custom', head: '<script>a("b")</script>', reopen: 'x' })).toBe('<script>a("b")</script>');
  });

  it('escapes ids for attribute and URL path contexts', () => {
    expect(cmpHead({ provider: 'cookiebot', id: 'a"b' })).toContain('data-cbid="a&quot;b"');
    expect(cmpHead({ provider: 'cookiebot', id: 'a<b>&' })).toContain('data-cbid="a&lt;b&gt;&amp;"');
    const y = cmpHead({ provider: 'cookieyes', id: 'a"b</c/../d' });
    expect(y).not.toMatch(/a"b/);
    expect(y).not.toContain('</c');
    expect(y).toContain('client_data/a%22b%3C%2Fc%2F..%2Fd/script.js');
  });

  it('reopenScript expressions, never with double quotes', () => {
    expect(reopenScript({ provider: 'cookieyes', id: 'x' })).toBe('revisitCkyConsent()');
    expect(reopenScript({ provider: 'cookiebot', id: 'x' })).toBe('Cookiebot.renew()');
    expect(reopenScript({ provider: 'custom', head: '', reopen: 'cmp.open()' })).toBe('cmp.open()');
    expect(reopenScript({ provider: 'google' })).toBe(
      'window.googlefc=window.googlefc||{};googlefc.callbackQueue=googlefc.callbackQueue||[];googlefc.callbackQueue.push(googlefc.showRevocationMessage)',
    );
    for (const c of [
      { provider: 'google' }, { provider: 'cookiebot', id: 'a' }, { provider: 'cookieyes', id: 'a' },
      { provider: 'custom', head: 'h', reopen: "cmp.open('x')" },
    ] as const) {
      expect(reopenScript(c)).not.toContain('"');
    }
  });

  it('adsense and ga4 scripts', () => {
    expect(adsenseScript('ca-pub-1')).toBe(
      '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1" crossorigin="anonymous"></script>',
    );
    const g = ga4Scripts('G-ABC');
    expect(g).toContain('<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC"></script>');
    expect(g).toContain("gtag('js', new Date())");
    expect(g).toContain("gtag('config', 'G-ABC')");
    expect(ga4Scripts('G-"<')).not.toContain('G-"<');
  });
});

describe('onConsent', () => {
  afterEach(() => {
    delete w.Cookiebot; delete w.getCkyConsent; delete w.__tcfapi; delete w.__astroblogConsent;
  });

  it('fires for cookiebot accept, once', () => {
    const cb = vi.fn();
    w.Cookiebot = { consent: { marketing: false } };
    onConsent('cookiebot', 'marketing', cb);
    expect(cb).not.toHaveBeenCalled();
    w.Cookiebot.consent.marketing = true;
    window.dispatchEvent(new Event('CookiebotOnAccept'));
    window.dispatchEvent(new Event('CookiebotOnAccept'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not fire for cookiebot accept of another category', () => {
    const cb = vi.fn();
    w.Cookiebot = { consent: { statistics: true, marketing: false } };
    onConsent('cookiebot', 'marketing', cb);
    window.dispatchEvent(new Event('CookiebotOnAccept'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires immediately when cookiebot consent already given', () => {
    const cb = vi.fn();
    w.Cookiebot = { consent: { marketing: true } };
    onConsent('cookiebot', 'marketing', cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('cookieyes maps categories from event detail', () => {
    const cb = vi.fn();
    onConsent('cookieyes', 'statistics', cb);
    document.dispatchEvent(new CustomEvent('cookieyes_consent_update', { detail: { accepted: ['necessary', 'advertisement'] } }));
    expect(cb).not.toHaveBeenCalled();
    document.dispatchEvent(new CustomEvent('cookieyes_consent_update', { detail: { accepted: ['analytics'] } }));
    document.dispatchEvent(new CustomEvent('cookieyes_consent_update', { detail: { accepted: ['analytics'] } }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('cookieyes already consented via getCkyConsent', () => {
    const cb = vi.fn();
    w.getCkyConsent = () => ({ categories: { advertisement: true } });
    onConsent('cookieyes', 'marketing', cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires for custom event, once', () => {
    const cb = vi.fn();
    onConsent('custom', 'marketing', cb);
    window.dispatchEvent(new CustomEvent('astroblog:consent', { detail: { categories: ['statistics'] } }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new CustomEvent('astroblog:consent', { detail: { categories: ['marketing'] } }));
    window.dispatchEvent(new CustomEvent('astroblog:consent', { detail: { categories: ['marketing'] } }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('custom: already granted via window.__astroblogConsent', () => {
    const cb = vi.fn();
    w.__astroblogConsent = ['marketing'];
    onConsent('custom', 'marketing', cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('google TCF: waits for useractioncomplete/tcloaded with purpose 1', () => {
    const cb = vi.fn();
    let listener: (d: any, ok: boolean) => void = () => {};
    w.__tcfapi = vi.fn((cmd: string, _v: number, fn: any) => { if (cmd === 'addEventListener') listener = fn; });
    onConsent('google', 'marketing', cb);
    listener({ eventStatus: 'cmpuishown', gdprApplies: true, purpose: { consents: { 1: true } } }, true);
    listener({ eventStatus: 'tcloaded', gdprApplies: true, purpose: { consents: { 1: false } } }, true);
    expect(cb).not.toHaveBeenCalled();
    listener({ eventStatus: 'useractioncomplete', gdprApplies: true, purpose: { consents: { 1: true } }, listenerId: 3 }, true);
    listener({ eventStatus: 'tcloaded', gdprApplies: false }, true);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('google TCF: gdprApplies false fires', () => {
    const cb = vi.fn();
    w.__tcfapi = (cmd: string, _v: number, fn: any) => { if (cmd === 'addEventListener') fn({ eventStatus: 'tcloaded', gdprApplies: false }, true); };
    onConsent('google', 'statistics', cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  describe('google TCF defined late', () => {
    afterEach(() => vi.useRealTimers());

    it('subscribes once __tcfapi appears after onConsent ran', () => {
      vi.useFakeTimers();
      const cb = vi.fn();
      onConsent('google', 'marketing', cb);
      vi.advanceTimersByTime(1000);
      expect(cb).not.toHaveBeenCalled();
      w.__tcfapi = (cmd: string, _v: number, fn: any) => { if (cmd === 'addEventListener') fn({ eventStatus: 'tcloaded', gdprApplies: false }, true); };
      vi.advanceTimersByTime(250);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('gives up silently after ~10s', () => {
      vi.useFakeTimers();
      const cb = vi.fn();
      onConsent('google', 'marketing', cb);
      vi.advanceTimersByTime(11_000);
      const api = vi.fn((cmd: string, _v: number, fn: any) => fn({ eventStatus: 'tcloaded', gdprApplies: false }, true));
      w.__tcfapi = api;
      vi.advanceTimersByTime(5000);
      expect(api).not.toHaveBeenCalled();
      expect(cb).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});

describe('mountConsentGates', () => {
  afterEach(() => {
    delete w.__astroblogConsent;
    document.body.innerHTML = '';
  });

  const markup = `<div data-consent-root>
    <div role="alert" data-consent-placeholder>needs consent</div>
    <template data-consent-gate data-provider="custom" data-category="preferences">
      <script src="https://giscus.app/client.js" data-repo="a/b" crossorigin="anonymous" async></script>
      <p id="inner">hello</p>
    </template>
  </div>`;

  it('keeps the placeholder and content locked until consent', () => {
    document.body.innerHTML = markup;
    mountConsentGates();
    expect(document.querySelector('[data-consent-placeholder]')).not.toBeNull();
    expect(document.getElementById('inner')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
  });

  it('on consent replaces the placeholder with the content, recreating scripts', () => {
    document.body.innerHTML = markup;
    const original = document.querySelector<HTMLTemplateElement>('template')!.content.querySelector('script')!;
    mountConsentGates();
    window.dispatchEvent(new CustomEvent('astroblog:consent', { detail: { categories: ['preferences'] } }));
    expect(document.querySelector('[data-consent-placeholder]')).toBeNull();
    expect(document.querySelector('template')).toBeNull();
    expect(document.getElementById('inner')?.textContent).toBe('hello');
    const script = document.querySelector('script')!;
    expect(script).not.toBe(original);
    expect(script.getAttribute('src')).toBe('https://giscus.app/client.js');
    expect(script.getAttribute('data-repo')).toBe('a/b');
    expect(script.getAttribute('crossorigin')).toBe('anonymous');
    expect(script.hasAttribute('async')).toBe(true);
  });

  it('unlocks immediately when consent was already granted', () => {
    w.__astroblogConsent = ['preferences'];
    document.body.innerHTML = markup;
    mountConsentGates();
    expect(document.getElementById('inner')).not.toBeNull();
    expect(document.querySelector('[data-consent-placeholder]')).toBeNull();
  });
});

describe('hasCmp', () => {
  it("is false only for the google provider without adsense (Google's CMP ships with AdSense)", () => {
    expect(hasCmp({ consent: { provider: 'google' }, adsense: undefined })).toBe(false);
    expect(hasCmp({ consent: { provider: 'google' }, adsense: { client: 'ca-pub-1' } } as any)).toBe(true);
    expect(hasCmp({ consent: { provider: 'cookiebot', id: 'x' }, adsense: undefined })).toBe(true);
    expect(hasCmp({ consent: { provider: 'custom', head: 'h', reopen: 'r' }, adsense: undefined })).toBe(true);
  });
});
