// Browser-only. No Node imports: importable from an Astro <script>.
import type { ConsentProvider } from '../schema/config';

export type ConsentCategory = 'marketing' | 'statistics' | 'preferences';

const TCF_POLL_MS = 250;
const TCF_POLL_MAX_MS = 10_000;

const COOKIEYES_CATEGORY: Record<ConsentCategory, string> = {
  marketing: 'advertisement',
  statistics: 'analytics',
  preferences: 'functional',
};

/**
 * Calls `cb` at most once, as soon as `category` is consented (immediately if it already was).
 *
 * `custom` provider contract: the CMP either dispatches
 * `window.dispatchEvent(new CustomEvent('astroblog:consent', { detail: { categories: ['marketing'] } }))`
 * and/or sets `window.__astroblogConsent = ['marketing', ...]` (the list of already granted
 * categories) before/at load.
 */
export function onConsent(provider: ConsentProvider, category: ConsentCategory, cb: () => void): void {
  const w = window as any;
  let done = false;
  const cleanups: Array<() => void> = [];
  const fire = () => {
    if (done) return;
    done = true;
    cleanups.forEach((c) => c());
    cb();
  };
  const listen = (target: EventTarget, type: string, handler: (e: Event) => void) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };

  switch (provider) {
    case 'cookiebot': {
      const granted = () => w.Cookiebot?.consent?.[category] === true;
      if (granted()) return fire();
      listen(window, 'CookiebotOnAccept', () => { if (granted()) fire(); });
      return;
    }
    case 'cookieyes': {
      const name = COOKIEYES_CATEGORY[category];
      try {
        if (w.getCkyConsent?.()?.categories?.[name] === true) return fire();
      } catch { /* CMP not ready yet */ }
      listen(document, 'cookieyes_consent_update', (e) => {
        const accepted = (e as CustomEvent).detail?.accepted;
        if (Array.isArray(accepted) && accepted.includes(name)) fire();
      });
      return;
    }
    case 'google': {
      const listener = (tcData: any, success: boolean) => {
        if (!success || done || !tcData) return;
        if (tcData.eventStatus !== 'useractioncomplete' && tcData.eventStatus !== 'tcloaded') return;
        if (tcData.gdprApplies === false || tcData.purpose?.consents?.[1]) {
          if (tcData.listenerId !== undefined) {
            w.__tcfapi('removeEventListener', 2, () => {}, tcData.listenerId);
          }
          fire();
        }
      };
      // Google's CMP defines __tcfapi asynchronously: poll for it, then give up silently.
      const subscribe = () => w.__tcfapi('addEventListener', 2, listener);
      if (typeof w.__tcfapi === 'function') return subscribe();
      let waited = 0;
      const timer = setInterval(() => {
        waited += TCF_POLL_MS;
        if (typeof w.__tcfapi === 'function') {
          clearInterval(timer);
          subscribe();
        } else if (waited >= TCF_POLL_MAX_MS) {
          clearInterval(timer);
        }
      }, TCF_POLL_MS);
      return;
    }
    case 'custom': {
      if (Array.isArray(w.__astroblogConsent) && w.__astroblogConsent.includes(category)) return fire();
      listen(window, 'astroblog:consent', (e) => {
        const cats = (e as CustomEvent).detail?.categories;
        if (Array.isArray(cats) && cats.includes(category)) fire();
      });
      return;
    }
  }
}
