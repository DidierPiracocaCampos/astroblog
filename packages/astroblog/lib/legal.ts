// Values interpolated by the legal/institutional templates (legal/<lang>/*.astro), spec §8.
import type { Lang, ResolvedConfig } from '../schema/config';

export type InstitutionalKey = 'about' | 'contact' | 'privacy' | 'cookies' | 'terms' | 'legal';
export const INSTITUTIONAL_KEYS: readonly InstitutionalKey[] = ['about', 'contact', 'privacy', 'cookies', 'terms', 'legal'];

export interface LegalContext {
  /** Data controller / site owner: `owner.name ?? author.name ?? title`. */
  owner: string;
  country?: string;
  /** Contact address for privacy requests: `owner.email ?? author.email ?? contact.email`. */
  email?: string;
  ads: boolean;
  ga4: boolean;
  giscus: boolean;
  /** Human name of the consent management platform. */
  cmp: string;
}

const CMP_NAMES: Record<Lang, Record<ResolvedConfig['consent']['provider'], string>> = {
  es: {
    google: 'la plataforma de gestión del consentimiento de Google («Privacidad y mensajes»)',
    cookiebot: 'Cookiebot (Usercentrics)',
    cookieyes: 'CookieYes',
    custom: 'una plataforma de gestión del consentimiento',
  },
  en: {
    google: 'Google’s consent management platform (“Privacy & messaging”)',
    cookiebot: 'Cookiebot (Usercentrics)',
    cookieyes: 'CookieYes',
    custom: 'a consent management platform',
  },
};

export function legalContext(config: ResolvedConfig): LegalContext {
  return {
    owner: config.owner?.name ?? config.author?.name ?? config.title,
    country: config.owner?.country,
    email: config.owner?.email ?? config.author?.email ?? config.contact?.email,
    ads: Boolean(config.adsense),
    ga4: Boolean(config.analytics?.ga4),
    giscus: Boolean(config.comments?.giscus),
    cmp: CMP_NAMES[config.lang][config.consent.provider],
  };
}

/**
 * Which institutional route a request is for: the base-relative pathname (see `stripBase`) is
 * compared with the `virtual:astroblog/routes` paths ignoring leading/trailing slashes.
 */
export function institutionalKey(
  paths: Partial<Record<string, string>>,
  pathname: string,
): InstitutionalKey | undefined {
  const norm = (p: string) => p.replace(/^\/+|\/+$/g, '');
  const target = norm(pathname);
  return INSTITUTIONAL_KEYS.find((k) => paths[k] !== undefined && norm(paths[k]!) === target);
}

/** Entry id in the `pages` collection for a route path: its last segment (`/privacidad/` → `privacidad`). */
export function pageEntryId(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() ?? '';
}
