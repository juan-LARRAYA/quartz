import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { parseKnowledgeTree } from "./knowledgeTreeData"

const wrap = (body: string) =>
  `before\n<!-- primary-tree:start -->\n${body}\n<!-- primary-tree:end -->\nafter`

describe("parseKnowledgeTree", () => {
  test("builds one rooted, single-parent hierarchy", () => {
    const tree = parseKnowledgeTree(
      wrap(
        "- `AGENTS.md`\n  - `CONTEXT.md`\n    - `tecnologias/CONTEXT.md`\n      - `tecnologias/icm.md`",
      ),
    )
    assert.equal(tree.root.path, "AGENTS.md")
    assert.equal(tree.byPath.get("tecnologias/icm.md")?.parent, "tecnologias/CONTEXT.md")
    assert.equal(tree.byPath.size, 4)
  })

  test("rejects duplicates and disconnected indentation", () => {
    assert.throws(
      () => parseKnowledgeTree(wrap("- `AGENTS.md`\n  - `CONTEXT.md`\n  - `CONTEXT.md`")),
      /duplicate/,
    )
    assert.throws(
      () => parseKnowledgeTree(wrap("- `AGENTS.md`\n    - `orphan.md`")),
      /indentation jump/,
    )
  })

  test("requires AGENTS.md as the only root", () => {
    assert.throws(() => parseKnowledgeTree(wrap("- `AGENTS.md`\n- `second.md`")), /single root/)
  })
})
