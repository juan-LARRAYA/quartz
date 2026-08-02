import { SimpleSlug } from "../../util/path"

export type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

export type TreePosition = {
  x: number
  y: number
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

/** Position a hierarchy from left to right with parents centered on children. */
export function buildTreePositions(
  slugs: Iterable<SimpleSlug>,
  links: SimpleLinkData[],
  width: number,
  height: number,
): Map<SimpleSlug, TreePosition> {
  const nodes = [...new Set(slugs)]
  const nodeSet = new Set(nodes)
  const children = new Map<SimpleSlug, SimpleSlug[]>()
  const hasParent = new Set<SimpleSlug>()

  for (const { source, target } of links) {
    if (!nodeSet.has(source) || !nodeSet.has(target)) continue
    children.set(source, [...(children.get(source) ?? []), target])
    hasParent.add(target)
  }
  for (const values of children.values()) values.sort()

  const roots = nodes.filter((node) => !hasParent.has(node)).sort()
  const rawPositions = new Map<SimpleSlug, { depth: number; row: number }>()
  const visited = new Set<SimpleSlug>()
  let nextRow = 0

  const place = (node: SimpleSlug, depth: number): number => {
    if (visited.has(node)) return rawPositions.get(node)?.row ?? nextRow
    visited.add(node)

    const childRows = (children.get(node) ?? [])
      .filter((child) => !visited.has(child))
      .map((child) => place(child, depth + 1))
    const row =
      childRows.length > 0
        ? childRows.reduce((sum, childRow) => sum + childRow, 0) / childRows.length
        : nextRow++
    rawPositions.set(node, { depth, row })
    return row
  }

  for (const root of roots) place(root, 0)
  for (const node of nodes) {
    if (!visited.has(node)) place(node, 0)
  }

  const maxDepth = Math.max(0, ...[...rawPositions.values()].map(({ depth }) => depth))
  const maxRow = Math.max(0, ...[...rawPositions.values()].map(({ row }) => row))
  const horizontalPadding = Math.min(70, width * 0.1)
  const verticalPadding = Math.min(40, height * 0.1)
  const horizontalStep = maxDepth === 0 ? 0 : (width - 2 * horizontalPadding) / maxDepth
  const verticalStep = maxRow === 0 ? 0 : Math.min(48, (height - 2 * verticalPadding) / maxRow)
  const positions = new Map<SimpleSlug, TreePosition>()

  for (const [node, { depth, row }] of rawPositions) {
    positions.set(node, {
      x: -width / 2 + horizontalPadding + depth * horizontalStep,
      y: (row - maxRow / 2) * verticalStep,
    })
  }

  return positions
}
