import { SimpleSlug } from "../../util/path"

export type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

const rootSlug = "/" as SimpleSlug

/**
 * Build a directory-based ownership tree for the knowledge graph.
 *
 * Every note and synthetic folder has exactly one parent. Markdown cross-links
 * remain available in page content and backlinks, but they cannot introduce a
 * second parent or a cycle into this primary visualization.
 */
export function buildHierarchyLinks(slugs: Iterable<SimpleSlug>): SimpleLinkData[] {
  const links = new Map<string, SimpleLinkData>()

  const addLink = (source: SimpleSlug, target: SimpleSlug) => {
    if (source !== target) links.set(`${source}\0${target}`, { source, target })
  }

  for (const slug of slugs) {
    if (slug === rootSlug) continue

    const segments = slug.split("/").filter(Boolean)
    const folderDepth = slug.endsWith("/") ? segments.length : segments.length - 1
    let parent = rootSlug

    for (let depth = 1; depth <= folderDepth; depth++) {
      const folder = `${segments.slice(0, depth).join("/")}/` as SimpleSlug
      addLink(parent, folder)
      parent = folder
    }

    if (!slug.endsWith("/")) addLink(parent, slug)
  }

  return [...links.values()]
}
