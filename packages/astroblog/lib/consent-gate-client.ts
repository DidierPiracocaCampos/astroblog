// Browser-only. Unlocks every `[data-consent-gate]` <template> once its category is consented.
import type { ConsentProvider } from '../schema/config';
import { onConsent } from './consent-client';
import type { ConsentCategory } from './consent-client';

/** Clone the template content, recreating <script> elements (cloned scripts never execute). */
export function unlock(template: HTMLTemplateElement): void {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  for (const old of Array.from(fragment.querySelectorAll('script'))) {
    const fresh = document.createElement('script');
    for (const { name, value } of Array.from(old.attributes)) fresh.setAttribute(name, value);
    fresh.text = old.textContent ?? '';
    old.replaceWith(fresh);
  }
  const root = template.closest<HTMLElement>('[data-consent-root]');
  root?.querySelector('[data-consent-placeholder]')?.remove();
  template.replaceWith(fragment);
}

export function mountConsentGates(root: ParentNode = document): void {
  for (const template of Array.from(root.querySelectorAll<HTMLTemplateElement>('template[data-consent-gate]'))) {
    const { provider, category } = template.dataset;
    if (!provider || !category) continue;
    onConsent(provider as ConsentProvider, category as ConsentCategory, () => unlock(template));
  }
}
