import { describe, it, expect } from "vitest";
import { toMermaid } from "../serializer.js";
import type { FlowDiagram } from "../types.js";

describe("toMermaid", () => {
  it("serializes direction", () => {
    const diagram: FlowDiagram = { direction: "LR", nodes: [], edges: [] };
    expect(toMermaid(diagram)).toContain("graph LR");
  });

  it("serializes rect node", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [{ id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(toMermaid(diagram)).toContain("A[Start]");
  });

  it("serializes rounded node", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [{ id: "A", label: "Action", shape: "rounded", position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(toMermaid(diagram)).toContain("A(Action)");
  });

  it("serializes diamond node", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [{ id: "A", label: "Check", shape: "diamond", position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(toMermaid(diagram)).toContain("A{Check}");
  });

  it("serializes circle node", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [{ id: "A", label: "End", shape: "circle", position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(toMermaid(diagram)).toContain("A((End))");
  });

  it("serializes stadium node", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [{ id: "A", label: "Input", shape: "stadium", position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(toMermaid(diagram)).toContain("A([Input])");
  });

  it("serializes arrow edge", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "A", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "B", shape: "rect", position: { x: 0, y: 100 } },
      ],
      edges: [{ id: "e0", source: "A", target: "B", type: "arrow" }],
    };
    expect(toMermaid(diagram)).toContain("A --> B");
  });

  it("serializes edge with label", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "A", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "B", shape: "rect", position: { x: 0, y: 100 } },
      ],
      edges: [{ id: "e0", source: "A", target: "B", label: "Yes", type: "arrow" }],
    };
    expect(toMermaid(diagram)).toContain("A -->|Yes| B");
  });

  it("serializes dotted edge", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "A", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "B", shape: "rect", position: { x: 0, y: 100 } },
      ],
      edges: [{ id: "e0", source: "A", target: "B", type: "dotted" }],
    };
    expect(toMermaid(diagram)).toContain("A -.-> B");
  });

  it("serializes thick edge", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "A", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "B", shape: "rect", position: { x: 0, y: 100 } },
      ],
      edges: [{ id: "e0", source: "A", target: "B", type: "thick" }],
    };
    expect(toMermaid(diagram)).toContain("A ==> B");
  });

  it("serializes complete diagram", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "Decision", shape: "diamond", position: { x: 0, y: 100 } },
        { id: "C", label: "Action", shape: "rounded", position: { x: -100, y: 200 } },
        { id: "D", label: "End", shape: "circle", position: { x: 100, y: 200 } },
      ],
      edges: [
        { id: "e0", source: "A", target: "B", type: "arrow" },
        { id: "e1", source: "B", target: "C", label: "Yes", type: "arrow" },
        { id: "e2", source: "B", target: "D", label: "No", type: "arrow" },
        { id: "e3", source: "C", target: "D", type: "arrow" },
      ],
    };
    const output = toMermaid(diagram);
    expect(output).toContain("graph TD");
    expect(output).toContain("A[Start]");
    expect(output).toContain("B{Decision}");
    expect(output).toContain("C(Action)");
    expect(output).toContain("D((End))");
    expect(output).toContain("B -->|Yes| C");
    expect(output).toContain("B -->|No| D");
  });

  it("serializes subgraphs with member nodes only between subgraph/end lines", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "Process", shape: "rect", position: { x: 0, y: 100 } },
        { id: "C", label: "Outside", shape: "rect", position: { x: 100, y: 0 } },
      ],
      edges: [{ id: "e0", source: "A", target: "B", type: "arrow" }],
      subgraphs: [{ id: "sg1", label: "My Group", nodeIds: ["A", "B"] }],
    };
    const output = toMermaid(diagram);
    const lines = output.split("\n");

    // Find subgraph block boundaries
    const sgStart = lines.findIndex((l) => l.includes("subgraph sg1"));
    const sgEnd = lines.findIndex((l, i) => i > sgStart && l.trim() === "end");
    expect(sgStart).toBeGreaterThan(-1);
    expect(sgEnd).toBeGreaterThan(sgStart);

    // Member nodes A and B must appear inside the subgraph block
    const aIdx = lines.findIndex((l) => l.includes("A[Start]"));
    const bIdx = lines.findIndex((l) => l.includes("B[Process]"));
    expect(aIdx).toBeGreaterThan(sgStart);
    expect(aIdx).toBeLessThan(sgEnd);
    expect(bIdx).toBeGreaterThan(sgStart);
    expect(bIdx).toBeLessThan(sgEnd);

    // Member nodes must NOT appear as top-level nodes (outside the subgraph block)
    const topLevelLines = lines.filter((_, i) => i < sgStart || i > sgEnd);
    expect(topLevelLines.some((l) => l.includes("A[Start]"))).toBe(false);
    expect(topLevelLines.some((l) => l.includes("B[Process]"))).toBe(false);

    // C should be a top-level node, not inside the subgraph
    const cIdx = lines.findIndex((l) => l.includes("C[Outside]"));
    expect(cIdx).toBeLessThan(sgStart);
  });

  it("serializes label-only subgraph without bracket syntax", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "Node A", shape: "rect", position: { x: 0, y: 0 } },
      ],
      edges: [],
      subgraphs: [{ id: "Feature_Engineering", label: "Feature Engineering", nodeIds: ["A"], hasExplicitId: false }],
    };
    const output = toMermaid(diagram);
    expect(output).toContain("subgraph Feature Engineering");
    expect(output).not.toContain("[Feature Engineering]");
  });

  it("serializes subgraph with id === label and hasExplicitId without brackets", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "Node A", shape: "rect", position: { x: 0, y: 0 } },
      ],
      edges: [],
      subgraphs: [{ id: "Outer", label: "Outer", nodeIds: ["A"], hasExplicitId: true }],
    };
    const output = toMermaid(diagram);
    expect(output).toContain("subgraph Outer");
    expect(output).not.toContain("[Outer]");
  });

  it("serializes nested subgraphs with correct nesting", () => {
    const diagram: FlowDiagram = {
      direction: "TD",
      nodes: [
        { id: "A", label: "Inner Node", shape: "rect", position: { x: 0, y: 0 } },
        { id: "B", label: "Outer Node", shape: "rect", position: { x: 0, y: 100 } },
      ],
      edges: [],
      subgraphs: [{
        id: "outer", label: "Outer", nodeIds: ["B"], hasExplicitId: true,
        children: [{ id: "inner", label: "Inner", nodeIds: ["A"], hasExplicitId: true }],
      }],
    };
    const output = toMermaid(diagram);
    const lines = output.split("\n");

    const outerStart = lines.findIndex((l) => l.includes("subgraph outer"));
    const innerStart = lines.findIndex((l) => l.includes("subgraph inner"));
    const innerEnd = lines.findIndex((l, i) => i > innerStart && l.trim() === "end");
    const outerEnd = lines.findIndex((l, i) => i > innerEnd && l.trim() === "end");

    // Inner subgraph is nested inside outer
    expect(innerStart).toBeGreaterThan(outerStart);
    expect(innerEnd).toBeLessThan(outerEnd);

    // A is inside inner block, B is inside outer block but outside inner
    const aIdx = lines.findIndex((l) => l.includes("A[Inner Node]"));
    const bIdx = lines.findIndex((l) => l.includes("B[Outer Node]"));
    expect(aIdx).toBeGreaterThan(innerStart);
    expect(aIdx).toBeLessThan(innerEnd);
    expect(bIdx).toBeGreaterThan(innerEnd);
    expect(bIdx).toBeLessThan(outerEnd);
  });

  it("round-trips subgraphs through parse and serialize", async () => {
    const input = `graph TD
  subgraph sg1 [My Group]
    A[Start]
    B[End]
  end
  A --> B`;
    const { parseMermaid } = await import("../parser.js");
    const diagram = parseMermaid(input);
    const output = toMermaid(diagram);
    expect(output).toContain("subgraph sg1 [My Group]");
    expect(output).toContain("A[Start]");
    expect(output).toContain("B[End]");
    expect(output).toContain("A --> B");
  });
});
