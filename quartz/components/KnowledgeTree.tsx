import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { KnowledgeTreeNode, loadValidatedKnowledgeTree, primaryRoutes } from "./knowledgeTreeData"
import { classNames } from "../util/lang"
import { FullSlug, resolveRelative } from "../util/path"
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

function routeName(node: KnowledgeTreeNode): string {
  return node.path.replace(/\/CONTEXT\.md$/, "").replace(/^_/, "")
}

function routeFolderSlug(node: KnowledgeTreeNode): FullSlug | undefined {
  const folder = node.path.replace(/\/CONTEXT\.md$/, "")
  return folder.startsWith("_") ? undefined : (`${folder}/index` as FullSlug)
}

function routeIsActive(node: KnowledgeTreeNode, relativePath?: string): boolean {
  const folder = node.path.replace(/CONTEXT\.md$/, "")
  return relativePath?.startsWith(folder) ?? false
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
    const tree = loadValidatedKnowledgeTree(ctx.argv.directory)
    const current = fileData.relativePath ? tree.byPath.get(fileData.relativePath) : undefined
    const pages = publicNodes(allFiles)
    const chain: KnowledgeTreeNode[] = []
    let cursor: KnowledgeTreeNode | undefined = current
    while (cursor) {
      chain.unshift(cursor)
      cursor = cursor.parent ? tree.byPath.get(cursor.parent) : undefined
    }
    const routes = primaryRoutes(tree)
    return (
      <nav
        class={classNames(displayClass, "knowledge-branch")}
        aria-label="Primary knowledge routes"
      >
        <h3>Knowledge routes</h3>
        <ul class="knowledge-route-list">
          {routes.map((route) => {
            const folderSlug = routeFolderSlug(route)
            const label = (
              <>
                <span class="knowledge-route-name">{routeName(route)}</span>
                <code>{route.path}</code>
              </>
            )
            return (
              <li class={routeIsActive(route, fileData.relativePath) ? "active" : undefined}>
                {folderSlug ? (
                  <a class="internal" href={resolveRelative(fileData.slug!, folderSlug)}>
                    {label}
                  </a>
                ) : (
                  <span>{label}</span>
                )}
                <span class="knowledge-route-count" title="Direct destinations">
                  {route.children.length}
                </span>
              </li>
            )
          })}
        </ul>
        {current && (
          <>
            <h3 class="knowledge-branch-title">Current branch</h3>
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
          </>
        )}
        <a
          class="internal knowledge-map-link"
          href={resolveRelative(fileData.slug!, "mapa" as FullSlug)}
        >
          Open complete knowledge map →
        </a>
      </nav>
    )
  }
  Branch.css = style
  return Branch
}) satisfies QuartzComponentConstructor
