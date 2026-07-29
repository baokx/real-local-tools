import en from './en.json';
import zh from './zh.json';

export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, unknown> = { en, zh };

type DictNode = string | { [key: string]: DictNode };

/** Look up a dotted key like "tools.json-formatter.name". Falls back to the key itself. */
export function t(lang: Locale, path: string): string {
  let cur: DictNode | undefined = dictionaries[lang] as DictNode;
  for (const key of path.split('.')) {
    if (cur && typeof cur === 'object') {
      cur = (cur as Record<string, DictNode>)[key];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

/** Interpolate {placeholders} in a dictionary string. */
export function tf(lang: Locale, path: string, vars: Record<string, string | number>): string {
  return t(lang, path).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/');
  return (locales as readonly string[]).includes(first) && first !== defaultLocale
    ? (first as Locale)
    : defaultLocale;
}

/** Prefix a path with the locale (default locale stays unprefixed). */
export function localePath(lang: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === defaultLocale) return clean;
  return `/${lang}${clean === '/' ? '' : clean}` || `/${lang}/`;
}

export function stripLocalePrefix(url: URL): string {
  const stripped = url.pathname.replace(/^\/zh(?=\/|$)/, '');
  return stripped === '' ? '/' : stripped;
}

/** URL of the current page in the other locale. */
export function alternateUrl(url: URL, target: Locale): string {
  return localePath(target, stripLocalePrefix(url));
}

export function otherLocale(lang: Locale): Locale {
  return lang === defaultLocale ? 'zh' : 'en';
}

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};
