import { tools } from '../tools/registry';

/** Shared by the [category]/[tool] route file of every locale. */
export function getToolStaticPaths() {
  return tools.map((tool) => ({
    params: { category: tool.category, tool: tool.slug },
  }));
}
