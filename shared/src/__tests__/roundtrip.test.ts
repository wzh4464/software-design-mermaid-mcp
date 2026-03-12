import { describe, it, expect } from "vitest";
import { parseMermaid } from "../parser.js";
import { toMermaid } from "../serializer.js";

describe("round-trip: parse → serialize → parse", () => {
  const testCases = [
    {
      name: "simple flowchart",
      input: `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C(Action)
  B -->|No| D((End))
  C --> D`,
    },
    {
      name: "LR direction with stadium",
      input: `graph LR
  A([Input]) --> B[Process] --> C((Output))`,
    },
    {
      name: "dotted and thick edges",
      input: `graph TD
  A[Start] -.-> B[Middle]
  B ==> C[End]`,
    },
  ];

  for (const { name, input } of testCases) {
    it(`round-trips: ${name}`, () => {
      const parsed1 = parseMermaid(input);
      const serialized = toMermaid(parsed1);
      const parsed2 = parseMermaid(serialized);

      expect(parsed2.nodes.map((n) => ({ id: n.id, label: n.label, shape: n.shape }))).toEqual(
        parsed1.nodes.map((n) => ({ id: n.id, label: n.label, shape: n.shape }))
      );

      expect(parsed2.edges.map((e) => ({ source: e.source, target: e.target, label: e.label, type: e.type }))).toEqual(
        parsed1.edges.map((e) => ({ source: e.source, target: e.target, label: e.label, type: e.type }))
      );

      expect(parsed2.direction).toBe(parsed1.direction);
    });
  }
});
