import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

export type KnowledgeTreeNode = {
  path: string
  parent: string | null
  children: KnowledgeTreeNode[]
}

export type KnowledgeTree = {
  root: KnowledgeTreeNode
  byPath: Map<string, KnowledgeTreeNode>
}

const startMarker = "<!-- primary-tree:start -->"
const endMarker = "<!-- primary-tree:end -->"
const rowPattern = /^( *)- `([^`]+)`$/

export function parseKnowledgeTree(source: string): KnowledgeTree {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("knowledge tree is missing its primary-tree markers")
  }

  const roots: KnowledgeTreeNode[] = []
  const stack: KnowledgeTreeNode[] = []
  const byPath = new Map<string, KnowledgeTreeNode>()
  const body = source.slice(start + startMarker.length, end)
  for (const [index, line] of body.split(/\r?\n/).entries()) {
    if (line.trim() === "") continue
    const match = rowPattern.exec(line)
    if (!match) throw new Error(`invalid knowledge tree row ${index + 1}`)
    const [, indentation, path] = match
    if (indentation.length % 2 !== 0) throw new Error(`odd indentation for ${path}`)
    const depth = indentation.length / 2
    if (depth > stack.length) throw new Error(`disconnected indentation jump for ${path}`)
    if (byPath.has(path)) throw new Error(`duplicate knowledge tree node: ${path}`)
    const parent = depth === 0 ? null : stack[depth - 1]?.path
    if (depth > 0 && parent === undefined) throw new Error(`missing parent for ${path}`)
    const node: KnowledgeTreeNode = { path, parent: parent ?? null, children: [] }
    byPath.set(path, node)
    if (parent === null) roots.push(node)
    else byPath.get(parent)!.children.push(node)
    stack.splice(depth)
    stack[depth] = node
  }

  if (roots.length !== 1 || roots[0].path !== "AGENTS.md") {
    throw new Error("knowledge tree must have AGENTS.md as its single root")
  }
  for (const [path, node] of byPath) {
    const seen = new Set<string>()
    let cursor: KnowledgeTreeNode | undefined = node
    while (cursor.parent !== null) {
      if (seen.has(cursor.path)) throw new Error(`cycle in knowledge tree at ${path}`)
      seen.add(cursor.path)
      cursor = byPath.get(cursor.parent)
      if (!cursor) throw new Error(`unknown parent for ${path}`)
    }
    if (cursor !== roots[0]) throw new Error(`node does not reach root: ${path}`)
  }
  return { root: roots[0], byPath }
}

/** Return the domain routers directly owned by the repository router. */
export function primaryRoutes(tree: KnowledgeTree): KnowledgeTreeNode[] {
  const repositoryRouter = tree.byPath.get("CONTEXT.md")
  if (!repositoryRouter) throw new Error("knowledge tree is missing CONTEXT.md")
  return repositoryRouter.children.filter((node) => node.path.endsWith("/CONTEXT.md"))
}

const cache = new Map<string, KnowledgeTree>()

export function loadValidatedKnowledgeTree(contentDirectory: string): KnowledgeTree {
  const contentRoot = resolve(process.cwd(), contentDirectory)
  const cached = cache.get(contentRoot)
  if (cached) return cached
  const validation = spawnSync("python3", ["_scripts/validate_kb.py"], {
    cwd: contentRoot,
    encoding: "utf8",
  })
  if (validation.status !== 0) {
    const detail = (validation.stderr || validation.stdout || "unknown validation error").trim()
    throw new Error(`Coach KB validation failed before Quartz build:\n${detail}`)
  }
  const manifest = readFileSync(resolve(contentRoot, "_system/knowledge-tree.md"), "utf8")
  const tree = parseKnowledgeTree(manifest)
  cache.set(contentRoot, tree)
  return tree
}
