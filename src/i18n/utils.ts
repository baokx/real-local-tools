import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import ja from './ja.json';

export const locales = ['en', 'zh', 'es', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, unknown> = { en, zh, es, ja };

type DictNode = string | { [key: string]: DictNode };

function lookup(dict: DictNode, path: string): string | undefined {
  let cur: DictNode | undefined = dict;
  for (const key of path.split('.')) {
    if (cur && typeof cur === 'object') {
      cur = (cur as Record<string, DictNode>)[key];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Look up a dotted key like "tools.json-formatter.name". Falls back to English, then to the key itself. */
export function t(lang: Locale, path: string): string {
  return (
    lookup(dictionaries[lang] as DictNode, path) ??
    lookup(dictionaries[defaultLocale] as DictNode, path) ??
    path
  );
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

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const nonDefault = locales.filter((l) => l !== defaultLocale).join('|');
const prefixRe = new RegExp(`^/(${nonDefault})(?=/|$)`);

/** Prefix a path with the locale (default locale stays unprefixed). */
export function localePath(lang: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const localized =
    lang === defaultLocale ? clean : `/${lang}${clean === '/' ? '' : clean}` || `/${lang}/`;
  return `${base}${localized}`;
}

export function stripLocalePrefix(url: URL): string {
  const withoutBase = base ? url.pathname.replace(new RegExp(`^${base}`), '') : url.pathname;
  const stripped = withoutBase.replace(prefixRe, '');
  return stripped === '' ? '/' : stripped;
}

/** URL of the current page in another locale. */
export function alternateUrl(url: URL, target: Locale): string {
  return localePath(target, stripLocalePrefix(url));
}

export function otherLocales(lang: Locale): Locale[] {
  return locales.filter((l) => l !== lang);
}

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  ja: '日本語',
};

/** BCP-47 tags for the <html lang> attribute. */
export const htmlLang: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-CN',
  es: 'es',
  ja: 'ja',
};
