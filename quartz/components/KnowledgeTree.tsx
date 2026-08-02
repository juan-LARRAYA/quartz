import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { KnowledgeTreeNode, loadValidatedKnowledgeTree } from "./knowledgeTreeData"
import { classNames } from "../util/lang"
import { resolveRelative } from "../util/path"
// @ts-ignore
import script from "./scripts/knowledgeTree.inline"
import style from "./styles/knowledgeTree.scss"

type PublicNode = { slug: NonNullable<QuartzComponentProps["fileData"]["slug"]>; title: string }

function publicNodes(allFiles: QuartzComponentProps["allFiles"]): Map<string, PublicNode> {
  const result = new Map<string, PublicNode>()
  for (const file of allFiles) {
    if (file.relativePath && file.slug) {
      result.set(file.relativePath, {
        slug: file.slug,
        title: file.frontmatter?.title ?? file.relativePath.replace(/\.md$/, ""),
      })
    }
  }
  return result
}

function labelFor(node: KnowledgeTreeNode, pages: Map<string, PublicNode>): string {
  return pages.get(node.path)?.title ?? node.path
}

function NodeLabel({
  node,
  pages,
  currentSlug,
}: {
  node: KnowledgeTreeNode
  pages: Map<string, PublicNode>
  currentSlug: NonNullable<QuartzComponentProps["fileData"]["slug"]>
}) {
  const page = pages.get(node.path)
  const label = labelFor(node, pages)
  return page ? (
    <a class="internal knowledge-node-label" href={resolveRelative(currentSlug, page.slug)}>
      {label}
    </a>
  ) : (
    <span class="knowledge-node-label knowledge-node-router" title="Router not published by Quartz">
      {label}
    </span>
  )
}

function TreeItem({
  node,
  pages,
  currentSlug,
}: {
  node: KnowledgeTreeNode
  pages: Map<string, PublicNode>
  currentSlug: NonNullable<QuartzComponentProps["fileData"]["slug"]>
}) {
  const searchable = `${labelFor(node, pages)} ${node.path}`
  if (node.children.length === 0) {
    return (
      <li class="knowledge-tree-node" data-node-path={node.path} data-search={searchable}>
        <div class="knowledge-node-row">
          <span class="knowledge-leaf-marker" aria-hidden="true"></span>
          <NodeLabel node={node} pages={pages} currentSlug={currentSlug} />
        </div>
      </li>
    )
  }
  return (
    <li class="knowledge-tree-node" data-node-path={node.path} data-search={searchable}>
      <details open>
        <summary class="knowledge-node-row">
          <NodeLabel node={node} pages={pages} currentSlug={currentSlug} />
        </summary>
        <ul>
          {node.children.map((child) => (
            <TreeItem node={child} pages={pages} currentSlug={currentSlug} />
          ))}
        </ul>
      </details>
    </li>
  )
}

export const KnowledgeTreeMap = (() => {
  const Map: QuartzComponent = ({
    ctx,
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    const tree = loadValidatedKnowledgeTree(ctx.argv.directory)
    const pages = publicNodes(allFiles)
    return (
      <section
        class={classNames(displayClass, "knowledge-tree-map")}
        aria-label="Primary knowledge tree"
      >
        <div class="knowledge-tree-tools">
          <label>
            <span class="visually-hidden">Search by title</span>
            <input
              type="search"
              class="knowledge-tree-search"
              placeholder="Search by title…"
              autocomplete="off"
            />
          </label>
          <div class="knowledge-tree-actions">
            <button type="button" data-tree-action="expand">
              Expand all
            </button>
            <button type="button" data-tree-action="collapse">
              Collapse all
            </button>
          </div>
        </div>
        <p class="knowledge-tree-empty" hidden>
          No matching nodes.
        </p>
        <nav class="knowledge-tree" aria-label="Knowledge hierarchy">
          <ul>
            <TreeItem node={tree.root} pages={pages} currentSlug={fileData.slug!} />
          </ul>
        </nav>
      </section>
    )
  }
  Map.css = style
  Map.afterDOMLoaded = script
  return Map
}) satisfies QuartzComponentConstructor

export const KnowledgeBranch = (() => {
  const Branch: QuartzComponent = ({
    ctx,
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    if (!fileData.relativePath) return null
    const tree = loadValidatedKnowledgeTree(ctx.argv.directory)
    const current = tree.byPath.get(fileData.relativePath)
    if (!current) return null
    const pages = publicNodes(allFiles)
    const chain: KnowledgeTreeNode[] = []
    let cursor: KnowledgeTreeNode | undefined = current
    while (cursor) {
      chain.unshift(cursor)
      cursor = cursor.parent ? tree.byPath.get(cursor.parent) : undefined
    }
    return (
      <nav
        class={classNames(displayClass, "knowledge-branch")}
        aria-label="Primary knowledge branch"
      >
        <h3>Knowledge branch</h3>
        <ol>
          {chain.map((node, index) => (
            <li class={node.path === current.path ? "current" : undefined}>
              <NodeLabel node={node} pages={pages} currentSlug={fileData.slug!} />
              {index < chain.length - 1 && (
                <span class="branch-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )
  }
  Branch.css = style
  return Branch
}) satisfies QuartzComponentConstructor
