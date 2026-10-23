import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture } from './helpers.ts';
import type { BuiltFixture } from './helpers.ts';
import { getUI } from '../../i18n/index';

const es = getUI('es');
const enUI = getUI('en');
let f: BuiltFixture;
let en: BuiltFixture;

beforeAll(async () => {
  f = await buildFixture('basic');
  en = await buildFixture('minimal-legal');
});

const ES_PAGES = ['acerca', 'contacto', 'privacidad', 'cookies', 'terminos', 'aviso-legal'];
const EN_PAGES = ['about', 'contact', 'privacy', 'cookies', 'terms', 'legal-notice'];

describe('institutional and legal pages', () => {
  it('builds every institutional page in both languages', () => {
    for (const p of ES_PAGES) expect(f.exists(`${p}/index.html`), p).toBe(true);
    for (const p of EN_PAGES) expect(en.exists(`${p}/index.html`), p).toBe(true);
  });

  it('privacy mentions Google ads policy when adsense is on', async () =>
    expect(await f.read('privacidad/index.html')).toContain('policies.google.com/technologies/ads'));

  it('privacy explains how to opt out of personalised ads, GA4 and contact email when configured', async () => {
    const html = await f.read('privacidad/index.html');
    expect(html).toContain('https://adssettings.google.com');
    expect(html).toContain('Google Analytics');
    expect(html).toContain('mailto:legal@example.com');
    expect(html).toContain('Ana Pérez SL');
    expect(html).toContain(`<h1>${es.privacy}</h1>`);
    expect(html).toContain(es.updatedOn);
    // GA4 loads under Consent Mode: only its cookies wait for consent, cookieless pings may not.
    expect(html).toContain('sin cookies');
    expect(html).toContain('mediante el formulario de contacto');
  });

  it('privacy mentions the contact form only when an endpoint is set', async () =>
    expect(await en.read('privacy/index.html')).not.toContain('contact form'));

  it('privacy omits ads section without adsense', async () =>
    expect(await en.read('privacy/index.html')).not.toContain('policies.google.com/technologies/ads'));

  it('english privacy omits GA4 and ad settings without them and is in English', async () => {
    const html = await en.read('privacy/index.html');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain(`<h1>${enUI.privacy}</h1>`);
    expect(html).not.toContain('Google Analytics');
    expect(html).not.toContain('adssettings.google.com');
    expect(html).toContain(enUI.updatedOn);
  });

  it('user markdown overrides template', async () => {
    const html = await f.read('acerca/index.html');
    expect(html).toContain('Texto propio');
    expect(html).toContain('<h1>Sobre este blog</h1>');
    expect(html).toContain('<title>Sobre este blog | Blog Básico</title>');
    // the built-in about template (author box with the site description) is not rendered
    expect(html).not.toContain('data-about-template');
  });

  it('about template shows the author and social links when there is no markdown', async () => {
    const html = await en.read('about/index.html');
    expect(html).toContain('data-about-template');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Minimal legal fixture');
    expect(html).toContain('href="https://github.com/jane"');
  });

  it('contact renders form when endpoint set', async () => {
    const html = await f.read('contacto/index.html');
    expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="https:\/\/formspree\.io\/f\/test"/);
    for (const name of ['name', 'email', 'message']) expect(html).toMatch(new RegExp(`name="${name}"`));
    expect(html).toContain('<textarea');
    expect(html).toContain('name="_gotcha"');
    expect(html).toContain(es.contactFormName);
    expect(html).toContain(es.contactFormEmail);
    expect(html).toContain(es.contactFormMessage);
    expect(html).toContain(es.contactFormSend);
    expect(html).toContain('href="mailto:contacto@example.com"');
  });

  it('contact has no form without endpoint', async () => {
    const html = await en.read('contact/index.html');
    expect(html).not.toMatch(/<form[^>]*method="POST"/i); // the search dialog has its own <form method="dialog">
    expect(html).toContain('href="mailto:jane@example.com"');
  });

  it('cookies page includes settings button', async () => {
    const html = await f.read('cookies/index.html');
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    expect(main).toContain(`>${es.cookieSettings}</button>`);
    expect(main).toContain('<table class="table');
  });

  it('without a CMP (google provider, no adsense) legal pages say so and offer no settings button', async () => {
    const es = await buildFixture('minimal');
    for (const [fx, pages, phrase] of [
      [es, ['cookies', 'privacidad'], 'no tiene configurada ninguna plataforma de gestión del consentimiento'],
      [en, ['cookies', 'privacy'], 'has no consent management platform configured'],
    ] as const) {
      for (const p of pages) {
        const html = await fx.read(`${p}/index.html`);
        const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
        expect(main, p).toContain(phrase);
        expect(main, p).not.toContain('Google');
        expect(main, p).not.toContain('googlefc');
        expect(main, p).not.toContain('<button');
      }
    }
  });

  it('with a CMP, legal pages name it', async () => {
    expect(await f.read('cookies/index.html')).toContain('Privacidad y mensajes');
    expect(await f.read('privacidad/index.html')).toContain('Privacidad y mensajes');
  });

  it('cookies table lists statistics and marketing only for active services', async () => {
    const withAll = await f.read('cookies/index.html');
    expect(withAll).toContain('data-cookie-category="necessary"');
    expect(withAll).toContain('data-cookie-category="preferences"');
    expect(withAll).toContain('data-cookie-category="statistics"');
    expect(withAll).toContain('data-cookie-category="marketing"');
    const none = await en.read('cookies/index.html');
    expect(none).toContain('data-cookie-category="necessary"');
    expect(none).not.toContain('data-cookie-category="statistics"');
    expect(none).not.toContain('data-cookie-category="marketing"');
  });

  it('legal notice names the owner', async () => {
    const html = await f.read('aviso-legal/index.html');
    expect(html).toContain('Ana Pérez SL');
    expect(html).toContain('https://example.com');
  });

  it('pages have breadcrumbs, links ending in slash and valid <p> nesting', async () => {
    for (const [fx, page] of [[f, 'privacidad'], [f, 'contacto'], [f, 'cookies'], [en, 'terms'], [en, 'legal-notice'], [en, 'about']] as const) {
      const html = await fx.read(`${page}/index.html`);
      expect(html, page).toContain(`<link rel="canonical" href="https://example.com/${page}/"`);
      expect(html, page).toContain('"@type":"BreadcrumbList"');
      expect(html, page).not.toContain('<aside'); // no empty sidebar column
      expect(html, page).not.toMatch(/<p(?:\s[^>]*)?>(?:(?!<\/p>).)*<(div|ul|ol|nav|section|figure|table|form|h[1-6])[\s>]/s);
      const internal = [...html.matchAll(/<a [^>]*href="(\/[^"/][^"]*|\/)"/g)].map((m) => m[1].replace(/[?#].*$/, ''));
      for (const h of internal.filter((h) => !/\.[^/]*$/.test(h))) expect(h, `${page}: ${h}`).toMatch(/\/$/);
    }
  });

  it('institutional pages carry no manual ad slots', async () => {
    for (const p of ES_PAGES) expect(await f.read(`${p}/index.html`), p).not.toContain('data-ad=');
  });
});
