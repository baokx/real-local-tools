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
  // Developer tools
  { slug: 'json-formatter', category: 'developer', icon: '{;}' },
  { slug: 'base64-converter', category: 'developer', icon: '⇄64' },
  { slug: 'url-converter', category: 'developer', icon: '%20' },
  { slug: 'uuid-generator', category: 'developer', icon: '⌘id' },
  { slug: 'timestamp-converter', category: 'developer', icon: '⏱' },
  { slug: 'html-entity-converter', category: 'developer', icon: '&amp;' },
  { slug: 'color-converter', category: 'developer', icon: '#hex' },
  { slug: 'number-base-converter', category: 'developer', icon: '0x1F' },

  // Security tools
  { slug: 'password-generator', category: 'security', icon: '✳✳✳' },

  // Text tools
  { slug: 'word-counter', category: 'text', icon: 'Aa¶' },
  { slug: 'case-converter', category: 'text', icon: 'a→A' },
  { slug: 'text-reverser', category: 'text', icon: '↩ab' },
  { slug: 'remove-duplicate-lines', category: 'text', icon: '≡≠' },

  // Calculators
  { slug: 'percentage-calculator', category: 'calculator', icon: '％' },
  { slug: 'bmi-calculator', category: 'calculator', icon: 'kg/m²' },
  { slug: 'date-difference', category: 'calculator', icon: 'd±' },
  { slug: 'random-number-generator', category: 'calculator', icon: '∴#' },
];

export function getTool(slug: string): ToolDef | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function toolsByCategory(category: CategorySlug): ToolDef[] {
  return tools.filter((tool) => tool.category === category);
}
