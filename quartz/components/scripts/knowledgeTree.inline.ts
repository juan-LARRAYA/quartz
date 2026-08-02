const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()

function initializeTree(root: HTMLElement) {
  if (root.dataset.initialized === "true") return
  root.dataset.initialized = "true"
  const details = [...root.querySelectorAll("details")]
  const nodes = [...root.querySelectorAll<HTMLElement>(".knowledge-tree-node")]
  const search = root.querySelector<HTMLInputElement>(".knowledge-tree-search")
  const empty = root.querySelector<HTMLElement>(".knowledge-tree-empty")

  root.querySelector('[data-tree-action="expand"]')?.addEventListener("click", () => {
    details.forEach((item) => item.setAttribute("open", ""))
  })
  root.querySelector('[data-tree-action="collapse"]')?.addEventListener("click", () => {
    details.forEach((item, index) =>
      index === 0 ? item.setAttribute("open", "") : item.removeAttribute("open"),
    )
  })

  const filter = () => {
    const query = normalize(search?.value.trim() ?? "")
    let matches = 0
    for (const node of nodes.reverse()) {
      const ownMatch = normalize(node.dataset.search ?? "").includes(query)
      const childMatch = [
        ...node.querySelectorAll(":scope > details > ul > .knowledge-tree-node"),
      ].some((child) => !(child as HTMLElement).hidden)
      node.hidden = query.length > 0 && !ownMatch && !childMatch
      if (!node.hidden && ownMatch && query.length > 0) matches += 1
      if (query.length > 0 && childMatch)
        node.querySelector(":scope > details")?.setAttribute("open", "")
    }
    nodes.reverse()
    if (empty) empty.hidden = query.length === 0 || matches > 0
  }
  search?.addEventListener("input", filter)

  root.querySelector(".knowledge-tree")?.addEventListener("click", (event) => {
    const row = (event.target as Element).closest<HTMLElement>(".knowledge-node-row")
    if (!row) return
    root
      .querySelectorAll(".branch-active,.branch-selected")
      .forEach((item) => item.classList.remove("branch-active", "branch-selected"))
    const selected = row.closest<HTMLElement>(".knowledge-tree-node")
    selected?.classList.add("branch-selected")
    let ancestor = selected?.parentElement?.closest<HTMLElement>(".knowledge-tree-node")
    while (ancestor) {
      ancestor.classList.add("branch-active")
      ancestor = ancestor.parentElement?.closest<HTMLElement>(".knowledge-tree-node") ?? null
    }
  })
}

document.addEventListener("nav", () => {
  document.querySelectorAll<HTMLElement>(".knowledge-tree-map").forEach(initializeTree)
})
