import type { Lang } from '../schema/config';
import { es } from './es';
import { en } from './en';

export interface UIStrings {
  readMore: string;
  readingTime: string;
  categories: string;
  tags: string;
  author: string;
  search: string;
  searchPlaceholder: string;
  noResults: string;
  toc: string;
  related: string;
  share: string;
  previous: string;
  next: string;
  page: string;
  cookieSettings: string;
  consentRequired: string;
  manageCookies: string;
  themeToggle: string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
  emptyBlog: string;
  publishedOn: string;
  updatedOn: string;
  advertisement: string;
  contactFormName: string;
  contactFormEmail: string;
  contactFormMessage: string;
  contactFormSend: string;
  home: string;
  about: string;
  contact: string;
  privacy: string;
  cookies: string;
  terms: string;
  legal: string;
}

const DICTIONARIES: Record<Lang, UIStrings> = { es, en };

export function getUI(lang: Lang, overrides?: Partial<UIStrings>): UIStrings {
  const merged: Record<string, string> = { ...DICTIONARIES[lang] };
  for (const [k, v] of Object.entries(overrides ?? {})) {
    if (k in merged && typeof v === 'string') merged[k] = v;
  }
  return merged as unknown as UIStrings;
}

export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}
