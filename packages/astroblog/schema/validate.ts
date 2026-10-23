import type { ResolvedConfig, RouteKey } from './config';
import { hasCmp } from '../lib/consent';

const T = {
  es: {
    adsenseNeedsSite: 'adsense requiere definir `site` en la configuración de Astro.',
    noPosts: 'No hay posts publicados; la portada mostrará un estado vacío.',
    routeDisabled: (r: string) => `La ruta recomendada por AdSense "${r}" está desactivada.`,
    privacyWithAdsense: 'adsense está activo pero routes.privacy es false: AdSense exige una política de privacidad.',
    noCmp: 'consent.provider es "google" pero no hay adsense: la plataforma de gestión del consentimiento de Google solo se carga con AdSense, así que GA4 seguirá con el consentimiento denegado y Giscus no se desbloqueará. Configura adsense u otra CMP (consent.provider: "cookiebot", "cookieyes" o "custom").',
  },
  en: {
    adsenseNeedsSite: 'adsense requires `site` to be set in the Astro config.',
    noPosts: 'There are no published posts; the home page will show an empty state.',
    routeDisabled: (r: string) => `The AdSense-recommended route "${r}" is disabled.`,
    privacyWithAdsense: 'adsense is enabled but routes.privacy is false: AdSense requires a privacy policy.',
    noCmp: 'consent.provider is "google" but adsense is not set: Google\'s consent management platform only loads with AdSense, so GA4 will stay with consent denied and Giscus will never unlock. Configure adsense or another consent management platform (consent.provider: "cookiebot", "cookieyes" or "custom").',
  },
} as const;

/** The "no published posts" warning; also emitted by `loadPosts` in a build, where posts are known. */
export function noPostsWarning(lang: ResolvedConfig['lang']): string {
  return T[lang].noPosts;
}

const ADSENSE_ROUTES: RouteKey[] = ['about', 'contact', 'privacy', 'cookies'];

export function validateConfig(
  config: ResolvedConfig,
  ctx: { site?: string; hasPosts?: boolean },
): { errors: string[]; warnings: string[] } {
  const t = T[config.lang];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.adsense && !ctx.site) errors.push(t.adsenseNeedsSite);
  if (ctx.hasPosts === false) warnings.push(t.noPosts);
  for (const r of ADSENSE_ROUTES) {
    if (config.routes?.[r] === false) warnings.push(t.routeDisabled(r));
  }
  if (config.adsense && config.routes?.privacy === false) warnings.push(t.privacyWithAdsense);
  if (!hasCmp(config) && (config.analytics?.ga4 || config.comments?.giscus)) warnings.push(t.noCmp);

  return { errors, warnings };
}
