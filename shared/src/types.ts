export type NodeShape = "rect" | "rounded" | "diamond" | "circle" | "stadium";
export type EdgeType = "arrow" | "dotted" | "thick";
export type Direction = "TD" | "LR" | "BT" | "RL";

export interface FlowNode {
  id: string;
  label: string;
  shape: NodeShape;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: EdgeType;
}

/**
 * Represents a Mermaid subgraph, possibly with nested children.
 *
 * **Nesting contract**: `children` forms a tree of nested subgraphs.
 * Two codepaths produce this shape and must stay aligned:
 *  - Parser (`shared/src/parser.ts`): stack-based nesting during parse
 *  - Editor (`editor/src/App.tsx` `buildSubgraphsFromNodes`): three-pass
 *    reconstruction from ReactFlow `parentId` relationships
 *
 * When `hasExplicitId` is false, `id` must equal `normalizeSubgraphLabel(label)`.
 * The serializer relies on this invariant for round-trip correctness.
 */
export interface Subgraph {
  id: string;
  label: string;
  nodeIds: string[];
  children?: Subgraph[];
  hasExplicitId?: boolean;
}

/**
 * Normalizes a subgraph label into an ID by replacing whitespace runs with underscores.
 * Used by both the parser and serializer to maintain round-trip correctness for
 * label-only subgraphs (where `hasExplicitId` is false).
 */
export function normalizeSubgraphLabel(label: string): string {
  return label.replace(/\s+/g, "_");
}

export interface FlowDiagram {
  direction: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  subgraphs?: Subgraph[];
}
