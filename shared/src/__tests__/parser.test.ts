import { describe, it, expect } from "vitest";
import { parseMermaid } from "../parser.js";

describe("parseMermaid", () => {
  it("parses direction", () => {
    const result = parseMermaid("graph LR\n  A[Start]");
    expect(result.direction).toBe("LR");
  });

  it("parses default direction as TD", () => {
    const result = parseMermaid("graph TD\n  A[Start]");
    expect(result.direction).toBe("TD");
  });

  it("parses rect node [text]", () => {
    const result = parseMermaid("graph TD\n  A[Start]");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({ id: "A", label: "Start", shape: "rect" });
  });

  it("parses rounded node (text)", () => {
    const result = parseMermaid("graph TD\n  A(Action)");
    expect(result.nodes[0]).toMatchObject({ id: "A", label: "Action", shape: "rounded" });
  });

  it("parses diamond node {text}", () => {
    const result = parseMermaid("graph TD\n  A{Decision}");
    expect(result.nodes[0]).toMatchObject({ id: "A", label: "Decision", shape: "diamond" });
  });

  it("parses circle node ((text))", () => {
    const result = parseMermaid("graph TD\n  A((End))");
    expect(result.nodes[0]).toMatchObject({ id: "A", label: "End", shape: "circle" });
  });

  it("parses stadium node ([text])", () => {
    const result = parseMermaid("graph TD\n  A([Input])");
    expect(result.nodes[0]).toMatchObject({ id: "A", label: "Input", shape: "stadium" });
  });

  it("parses arrow edge -->", () => {
    const result = parseMermaid("graph TD\n  A[Start] --> B[End]");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({ source: "A", target: "B", type: "arrow" });
  });

  it("parses dotted edge -.->", () => {
    const result = parseMermaid("graph TD\n  A[Start] -.-> B[End]");
    expect(result.edges[0]).toMatchObject({ source: "A", target: "B", type: "dotted" });
  });

  it("parses thick edge ==>", () => {
    const result = parseMermaid("graph TD\n  A[Start] ==> B[End]");
    expect(result.edges[0]).toMatchObject({ source: "A", target: "B", type: "thick" });
  });

  it("parses edge with label -->|text|", () => {
    const result = parseMermaid("graph TD\n  A[Start] -->|Yes| B[End]");
    expect(result.edges[0]).toMatchObject({ source: "A", target: "B", label: "Yes", type: "arrow" });
  });

  it("parses multiple nodes and edges", () => {
    const input = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C(Action)
  B -->|No| D((End))
  C --> D`;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(4);
  });

  it("handles standalone node declarations", () => {
    const input = `graph TD
  A[Node A]
  B[Node B]
  A --> B`;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it("deduplicates nodes referenced in edges", () => {
    const input = `graph TD\n  A[Start] --> B[End]\n  A --> B`;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(2);
  });

  it("parses chained edges on a single line", () => {
    const input = `graph LR\n  A([Input]) --> B[Process] --> C((Output))`;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0]).toMatchObject({ source: "A", target: "B" });
    expect(result.edges[1]).toMatchObject({ source: "B", target: "C" });
  });

  it("assigns auto-incremented positions", () => {
    const input = `graph TD\n  A[One] --> B[Two]`;
    const result = parseMermaid(input);
    expect(result.nodes[0].position).toBeDefined();
    expect(result.nodes[1].position).toBeDefined();
    expect(result.nodes[0].position.y).not.toBe(result.nodes[1].position.y);
  });
});
