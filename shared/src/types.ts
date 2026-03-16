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
 * When `hasExplicitId` is false, `id` must equal `label.replace(/\s+/g, "_")`.
 * The serializer relies on this invariant for round-trip correctness.
 */
export interface Subgraph {
  id: string;
  label: string;
  nodeIds: string[];
  children?: Subgraph[];
  hasExplicitId?: boolean;
}

export interface FlowDiagram {
  direction: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  subgraphs?: Subgraph[];
}
