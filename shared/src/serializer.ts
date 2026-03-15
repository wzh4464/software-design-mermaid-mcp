import type { FlowDiagram, FlowNode, FlowEdge, Subgraph, NodeShape } from "./types.js";

const SHAPE_WRAPPERS: Record<NodeShape, [string, string]> = {
  rect: ["[", "]"],
  rounded: ["(", ")"],
  diamond: ["{", "}"],
  circle: ["((", "))"],
  stadium: ["([", "])"],
};

const EDGE_ARROWS: Record<string, string> = {
  arrow: "-->",
  dotted: "-.->",
  thick: "==>",
};

function serializeNode(node: FlowNode): string {
  const [open, close] = SHAPE_WRAPPERS[node.shape];
  return `${node.id}${open}${node.label}${close}`;
}

function serializeSubgraphHeader(sg: Subgraph): string {
  if (sg.hasExplicitId === false) {
    return `subgraph ${sg.label}`;
  }
  if (sg.id === sg.label) {
    return `subgraph ${sg.id}`;
  }
  return `subgraph ${sg.id} [${sg.label}]`;
}

function collectAllSubgraphNodeIds(subgraphs: Subgraph[]): Set<string> {
  const ids = new Set<string>();
  for (const sg of subgraphs) {
    for (const nodeId of sg.nodeIds) {
      ids.add(nodeId);
    }
    if (sg.children) {
      for (const id of collectAllSubgraphNodeIds(sg.children)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

function emitSubgraph(sg: Subgraph, nodeById: Map<string, FlowNode>, lines: string[], indent: string): void {
  lines.push(`${indent}${serializeSubgraphHeader(sg)}`);
  const childIndent = indent + "  ";
  // Emit child subgraphs first
  if (sg.children) {
    for (const child of sg.children) {
      emitSubgraph(child, nodeById, lines, childIndent);
    }
  }
  // Then emit direct nodes
  for (const nodeId of sg.nodeIds) {
    const node = nodeById.get(nodeId);
    if (node) {
      lines.push(`${childIndent}${serializeNode(node)}`);
    }
  }
  lines.push(`${indent}end`);
}

export function toMermaid(diagram: FlowDiagram): string {
  const lines: string[] = [];
  lines.push(`graph ${diagram.direction}`);

  // Build set of nodes that belong to any subgraph (including nested)
  const nodesInSubgraphs = diagram.subgraphs
    ? collectAllSubgraphNodeIds(diagram.subgraphs)
    : new Set<string>();

  // Emit top-level nodes (not in any subgraph)
  for (const node of diagram.nodes) {
    if (!nodesInSubgraphs.has(node.id)) {
      lines.push(`  ${serializeNode(node)}`);
    }
  }

  // Emit subgraph blocks with their nodes (recursively for nesting)
  if (diagram.subgraphs) {
    const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));
    for (const sg of diagram.subgraphs) {
      emitSubgraph(sg, nodeById, lines, "  ");
    }
  }

  // Emit all edges with bare IDs (nodes already declared above)
  for (const edge of diagram.edges) {
    const arrow = EDGE_ARROWS[edge.type] || "-->";
    if (edge.label) {
      lines.push(`  ${edge.source} ${arrow}|${edge.label}| ${edge.target}`);
    } else {
      lines.push(`  ${edge.source} ${arrow} ${edge.target}`);
    }
  }

  return lines.join("\n");
}
