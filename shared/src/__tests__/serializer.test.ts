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
});
