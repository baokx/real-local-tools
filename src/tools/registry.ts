/**
 * Single source of truth for every tool on the site.
 * Pages, sitemap, search and navigation are all generated from this list.
 * Adding a tool = add one entry here + one component in src/components/tools/.
 */
export const categories = ['developer', 'image', 'calculator', 'security', 'text'] as const;
export type CategorySlug = (typeof categories)[number];

export interface ToolDef {
  /** URL slug, e.g. "json-formatter" */
  slug: string;
  category: CategorySlug;
  /** Short symbol shown on the card, rendered in mono type */
  icon: string;
}

export const tools: ToolDef[] = [
  { slug: 'json-formatter', category: 'developer', icon: '{;}' },
  { slug: 'base64-converter', category: 'developer', icon: '⇄64' },
  { slug: 'password-generator', category: 'security', icon: '✳✳✳' },
];

export function getTool(slug: string): ToolDef | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function toolsByCategory(category: CategorySlug): ToolDef[] {
  return tools.filter((tool) => tool.category === category);
}
