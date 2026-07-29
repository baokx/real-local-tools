/**
 * JSON-LD structured data builders. Every page gets schema.org markup:
 * home pages get WebSite, tool pages get WebApplication + BreadcrumbList.
 */
import { t, localePath, htmlLang, type Locale } from '../i18n/utils';
import type { ToolDef, CategorySlug } from '../tools/registry';

const SITE = 'https://real-local-tools.com';

export function siteUrl(path: string): string {
  return new URL(path.replace(/^\//, ''), SITE).href;
}

/** schema.org applicationCategory for each tool category. */
const appCategory: Record<CategorySlug, string> = {
  developer: 'DeveloperApplication',
  image: 'MultimediaApplication',
  calculator: 'UtilitiesApplication',
  security: 'SecurityApplication',
  text: 'UtilitiesApplication',
};

export function websiteSchema(lang: Locale): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    name: t(lang, 'site.name'),
    url: siteUrl(localePath(lang, '/')),
    description: t(lang, 'site.description'),
    inLanguage: htmlLang[lang],
  };
}

export function categorySchemas(lang: Locale, category: CategorySlug): Record<string, unknown>[] {
  const homeUrl = siteUrl(localePath(lang, '/'));
  const name = t(lang, `categories.${category}`);
  return [
    {
      '@type': 'CollectionPage',
      name,
      description: t(lang, `categoryPages.${category}.description`),
      url: siteUrl(localePath(lang, `/${category}/`)),
      inLanguage: htmlLang[lang],
      isPartOf: { '@type': 'WebSite', name: t(lang, 'site.name'), url: homeUrl },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t(lang, 'common.home'), item: homeUrl },
        { '@type': 'ListItem', position: 2, name },
      ],
    },
  ];
}

export function toolSchemas(lang: Locale, tool: ToolDef): Record<string, unknown>[] {
  const homeUrl = siteUrl(localePath(lang, '/'));
  const name = t(lang, `tools.${tool.slug}.name`);
  return [
    {
      '@type': 'WebApplication',
      name,
      description: t(lang, `tools.${tool.slug}.description`),
      url: siteUrl(localePath(lang, `/${tool.category}/${tool.slug}/`)),
      applicationCategory: appCategory[tool.category],
      operatingSystem: 'Any',
      browserRequirements: 'Requires a modern web browser',
      inLanguage: htmlLang[lang],
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t(lang, 'common.home'), item: homeUrl },
        {
          '@type': 'ListItem',
          position: 2,
          name: t(lang, `categories.${tool.category}`),
          item: siteUrl(localePath(lang, `/${tool.category}/`)),
        },
        { '@type': 'ListItem', position: 3, name },
      ],
    },
  ];
}
