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
