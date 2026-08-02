import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { SimpleSlug } from "../../util/path"
import { buildHierarchyLinks, buildTreePositions } from "./graphData"

describe("buildHierarchyLinks", () => {
  test("gives every knowledge node exactly one parent", () => {
    const links = buildHierarchyLinks([
      "/",
      "README",
      "yo/juan-larraya",
      "aprendizaje/english-practice/README",
      "aprendizaje/english-practice/week-01",
    ] as SimpleSlug[])

    assert.deepEqual(links, [
      { source: "/", target: "README" },
      { source: "/", target: "yo/" },
      { source: "yo/", target: "yo/juan-larraya" },
      { source: "/", target: "aprendizaje/" },
      { source: "aprendizaje/", target: "aprendizaje/english-practice/" },
      {
        source: "aprendizaje/english-practice/",
        target: "aprendizaje/english-practice/README",
      },
      {
        source: "aprendizaje/english-practice/",
        target: "aprendizaje/english-practice/week-01",
      },
    ])

    const parentCounts = new Map<string, number>()
    for (const { target } of links) {
      parentCounts.set(target, (parentCounts.get(target) ?? 0) + 1)
    }
    assert([...parentCounts.values()].every((count) => count === 1))
  })

  test("deduplicates shared folders and never creates self-links", () => {
    const links = buildHierarchyLinks([
      "/",
      "proyectos/",
      "proyectos/uno",
      "proyectos/dos",
    ] as SimpleSlug[])

    assert.equal(links.filter(({ target }) => target === "proyectos/").length, 1)
    assert.equal(
      links.some(({ source, target }) => source === target),
      false,
    )
  })

  test("lays out hierarchy levels from left to right", () => {
    const root = "/" as SimpleSlug
    const projects = "proyectos/" as SimpleSlug
    const firstProject = "proyectos/uno" as SimpleSlug
    const secondProject = "proyectos/dos" as SimpleSlug
    const nodes = [root, projects, firstProject, secondProject]
    const links = buildHierarchyLinks(nodes)
    const positions = buildTreePositions(nodes, links, 800, 400)

    assert(positions.get(root)!.x < positions.get(projects)!.x)
    assert(positions.get(projects)!.x < positions.get(firstProject)!.x)
    assert.equal(positions.get(firstProject)!.x, positions.get(secondProject)!.x)
    assert.equal(
      positions.get(projects)!.y,
      (positions.get(firstProject)!.y + positions.get(secondProject)!.y) / 2,
    )
  })
})
