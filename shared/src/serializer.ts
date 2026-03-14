import type { FlowDiagram, FlowNode, FlowEdge, NodeShape } from "./types.js";

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

export function toMermaid(diagram: FlowDiagram): string {
  const lines: string[] = [];
  lines.push(`graph ${diagram.direction}`);

  // Build set of nodes that belong to subgraphs
  const nodesInSubgraphs = new Set<string>();
  if (diagram.subgraphs) {
    for (const sg of diagram.subgraphs) {
      for (const nodeId of sg.nodeIds) {
        nodesInSubgraphs.add(nodeId);
      }
    }
  }

  // Emit top-level nodes (not in any subgraph)
  for (const node of diagram.nodes) {
    if (!nodesInSubgraphs.has(node.id)) {
      lines.push(`  ${serializeNode(node)}`);
    }
  }

  // Emit subgraph blocks with their nodes
  if (diagram.subgraphs) {
    const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));
    for (const sg of diagram.subgraphs) {
      lines.push(`  subgraph ${sg.id} [${sg.label}]`);
      for (const nodeId of sg.nodeIds) {
        const node = nodeById.get(nodeId);
        if (node) {
          lines.push(`    ${serializeNode(node)}`);
        }
      }
      lines.push(`  end`);
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
