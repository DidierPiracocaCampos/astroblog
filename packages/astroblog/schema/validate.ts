import type { ResolvedConfig, RouteKey } from './config';

const T = {
  es: {
    adsenseNeedsSite: 'adsense requiere definir `site` en la configuración de Astro.',
    noPosts: 'No hay posts publicados; la portada mostrará un estado vacío.',
    routeDisabled: (r: string) => `La ruta recomendada por AdSense "${r}" está desactivada.`,
    privacyWithAdsense: 'adsense está activo pero routes.privacy es false: AdSense exige una política de privacidad.',
  },
  en: {
    adsenseNeedsSite: 'adsense requires `site` to be set in the Astro config.',
    noPosts: 'There are no published posts; the home page will show an empty state.',
    routeDisabled: (r: string) => `The AdSense-recommended route "${r}" is disabled.`,
    privacyWithAdsense: 'adsense is enabled but routes.privacy is false: AdSense requires a privacy policy.',
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

  return { errors, warnings };
}
