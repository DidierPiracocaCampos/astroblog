import type { ResolvedConfig } from '../schema/config';

export type Consent = ResolvedConfig['consent'];

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Consent Mode v2 default (spec section 6, step 4). */
export function consentDefaultScript(): string {
  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'denied', wait_for_update: 500,
});`;
}

/** HTML for the CMP script, by provider. */
export function cmpHead(consent: Consent): string {
  switch (consent.provider) {
    case 'google':
      return '';
    case 'cookiebot':
      return `<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${escapeAttr(consent.id)}" data-blockingmode="auto" type="text/javascript"></script>`;
    case 'cookieyes':
      // encodeURIComponent keeps the id inside a single path segment ("/", "\"", "<" are encoded).
      return `<script id="cookieyes" type="text/javascript" src="https://cdn-cookieyes.com/client_data/${escapeAttr(encodeURIComponent(consent.id))}/script.js"></script>`;
    case 'custom':
      return consent.head;
  }
}

/**
 * JS expression to reopen the preferences UI. Meant to be placed inside an HTML
 * `onclick="..."` attribute, so built-in outputs use single quotes only.
 * For `custom`, `consent.reopen` is returned verbatim (the user must avoid double quotes).
 */
export function reopenScript(consent: Consent): string {
  switch (consent.provider) {
    case 'google':
      return 'window.googlefc=window.googlefc||{};googlefc.callbackQueue=googlefc.callbackQueue||[];googlefc.callbackQueue.push(googlefc.showRevocationMessage)';
    case 'cookiebot':
      return 'Cookiebot.renew()';
    case 'cookieyes':
      return 'revisitCkyConsent()';
    case 'custom':
      return consent.reopen;
  }
}

export function adsenseScript(client: string): string {
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeAttr(encodeURIComponent(client))}" crossorigin="anonymous"></script>`;
}

/** GA4 loader; reuses the `gtag` defined by `consentDefaultScript`. */
export function ga4Scripts(id: string): string {
  const jsId = JSON.stringify(id).slice(1, -1).replace(/'/g, "\\'").replace(/</g, '\\u003c');
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(encodeURIComponent(id))}"></script>
<script>gtag('js', new Date()); gtag('config', '${jsId}');</script>`;
}
