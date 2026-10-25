import { z } from 'astro/zod';

export const COMPONENT_KEYS = [
  'Header', 'Footer', 'ThemeToggle', 'Search', 'PostCard', 'PostHeader', 'TableOfContents',
  'RelatedPosts', 'ShareLinks', 'AuthorBox', 'Breadcrumbs', 'Pagination', 'Comments',
  'Faq', 'Sources', 'ReviewedBy',
] as const;
export type ComponentKey = (typeof COMPONENT_KEYS)[number];

export const ROUTE_KEYS = [
  'home', 'post', 'category', 'tag', 'author', 'about', 'contact', 'privacy', 'cookies',
  'terms', 'legal', 'search', 'notFound', 'rss', 'robots', 'adsTxt',
] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

export type ConsentProvider = 'google' | 'cookiebot' | 'cookieyes' | 'custom';

export type Lang = 'es' | 'en';

const MESSAGES = {
  es: { clientFormat: 'debe tener el formato ca-pub-XXXXXXXX (solo dígitos tras "ca-pub-")' },
  en: { clientFormat: 'must look like ca-pub-XXXXXXXX (digits only after "ca-pub-")' },
} as const;

const ISSUE_TEXT = {
  es: {
    required: 'es obligatorio',
    invalidType: (expected: string) => `debe ser de tipo ${expected}`,
    unrecognizedKeys: (keys: string[]) => `clave(s) desconocida(s): ${keys.map((k) => `"${k}"`).join(', ')}`,
    invalidValue: (values: string) => `valor no válido; valores permitidos: ${values}`,
    invalidUnion: 'valor no válido (revisa `provider` y sus campos)',
    tooSmall: 'valor demasiado pequeño o vacío',
    tooBig: 'valor demasiado grande',
    invalidFormat: 'formato no válido',
    other: 'valor no válido',
  },
  en: {
    required: 'is required',
    invalidType: (expected: string) => `must be of type ${expected}`,
    unrecognizedKeys: (keys: string[]) => `unknown key(s): ${keys.map((k) => `"${k}"`).join(', ')}`,
    invalidValue: (values: string) => `invalid value; allowed values: ${values}`,
    invalidUnion: 'invalid value (check `provider` and its fields)',
    tooSmall: 'value is too small or empty',
    tooBig: 'value is too large',
    invalidFormat: 'invalid format',
    other: 'invalid value',
  },
} as const;

function localizedError(lang: Lang) {
  const t = ISSUE_TEXT[lang];
  return (iss: any): string => {
    switch (iss.code) {
      case 'invalid_type':
        return iss.input === undefined ? t.required : t.invalidType(String(iss.expected));
      case 'unrecognized_keys': return t.unrecognizedKeys(iss.keys ?? []);
      case 'invalid_value': return t.invalidValue((iss.values ?? []).map(String).join(', '));
      case 'invalid_union': return t.invalidUnion;
      case 'too_small': return t.tooSmall;
      case 'too_big': return t.tooBig;
      case 'invalid_format': return t.invalidFormat;
      default: return t.other;
    }
  };
}

function peekLang(input: unknown): Lang {
  const lang = (input as { lang?: unknown } | null)?.lang;
  return lang === 'en' ? 'en' : 'es';
}

function buildSchema(lang: Lang) {
  const keyed = <K extends readonly string[]>(keys: K) =>
    z.strictObject(Object.fromEntries(keys.map((k) => [k, z.string().optional()])) as Record<K[number], z.ZodOptional<z.ZodString>>);
  const routes = z.strictObject(
    Object.fromEntries(ROUTE_KEYS.map((k) => [k, z.boolean().optional()])) as Record<RouteKey, z.ZodOptional<z.ZodBoolean>>,
  );

  const consent = z.discriminatedUnion('provider', [
    z.object({ provider: z.literal('google') }),
    z.object({ provider: z.literal('cookiebot'), id: z.string().min(1) }),
    z.object({ provider: z.literal('cookieyes'), id: z.string().min(1) }),
    z.object({ provider: z.literal('custom'), head: z.string().min(1), reopen: z.string().min(1) }),
  ]);

  return z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    lang: z.enum(['es', 'en']).default('es'),
    logo: z.string().optional(),
    author: z.object({
      name: z.string(), email: z.string().optional(), url: z.string().optional(), avatar: z.string().optional(),
      bio: z.string().optional(), jobTitle: z.string().optional(), sameAs: z.array(z.string()).optional(),
    }).optional(),
    reviewers: z.record(z.string(), z.object({
      name: z.string(), jobTitle: z.string().optional(), url: z.string().optional(),
      bio: z.string().optional(), avatar: z.string().optional(),
    })).optional(),
    disclaimer: z.string().optional(),
    seo: z.object({ articleType: z.enum(['BlogPosting', 'Article']).optional() }).optional(),
    permalinks: z.enum(['blog', 'silo']).default('blog'),
    owner: z.object({
      name: z.string(), country: z.string().optional(), email: z.string().optional(),
    }).optional(),
    social: z.record(z.string(), z.string()).optional(),
    nav: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    adsense: z.object({
      client: z.string().regex(/^ca-pub-\d+$/, { message: MESSAGES[lang].clientFormat }),
      autoAds: z.boolean().default(true),
      slots: z.object({
        inArticle: z.string().optional(), afterPost: z.string().optional(), sidebar: z.string().optional(),
      }).optional(),
    }).optional(),
    consent: consent.default({ provider: 'google' }),
    analytics: z.object({ ga4: z.string().optional() }).optional(),
    comments: z.object({
      giscus: z.object({
        repo: z.string(), repoId: z.string(), category: z.string(), categoryId: z.string(),
      }),
    }).optional(),
    theme: z.object({
      light: z.string().default('astroblog-light'),
      dark: z.string().default('astroblog-dark'),
      default: z.enum(['system', 'light', 'dark']).default('system'),
    }).default({ light: 'astroblog-light', dark: 'astroblog-dark', default: 'system' }),
    customCss: z.array(z.string()).default([]),
    components: keyed(COMPONENT_KEYS).optional(),
    routes: routes.optional(),
    slugs: z.record(z.string(), z.string()).optional(),
    search: z.boolean().default(true),
    contact: z.object({ email: z.string().optional(), formEndpoint: z.string().optional() }).optional(),
    postsPerPage: z.number().int().positive().default(10),
    // Task 3 will narrow this to Partial<UIStrings>.
    ui: z.record(z.string(), z.string()).optional(),
  });
}

export const UserConfigSchema = buildSchema('es');
export type AstroblogUserConfig = z.input<typeof UserConfigSchema>;
export type ResolvedConfig = z.output<typeof UserConfigSchema>;

export interface ConfigIssue { path: string; message: string }

export class AstroblogConfigError extends Error {
  issues: ConfigIssue[];
  constructor(issues: ConfigIssue[]) {
    super('[astroblog] ' + issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join('\n[astroblog] '));
    this.name = 'AstroblogConfigError';
    this.issues = issues;
  }
}

export function parseConfig(input: unknown): ResolvedConfig {
  const lang = peekLang(input);
  const result = buildSchema(lang).safeParse(input, { error: localizedError(lang) });
  if (result.success) return result.data;
  throw new AstroblogConfigError(
    result.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
  );
}
