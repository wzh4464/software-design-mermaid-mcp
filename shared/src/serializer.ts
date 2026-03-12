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

  // Emit all nodes as explicit declarations
  for (const node of diagram.nodes) {
    lines.push(`  ${serializeNode(node)}`);
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
