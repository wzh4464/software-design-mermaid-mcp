import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { Direction, Subgraph } from "@software-design-mermaid-mcp/converter";

const DIRECTION_MAP: Record<Direction, string> = {
  TD: "TB",
  LR: "LR",
  BT: "BT",
  RL: "RL",
};

function estimateNodeSize(label: string, shape: string): { width: number; height: number } {
  const lines = label.split(/<br\s*\/?>/gi);
  const maxLineLen = Math.max(...lines.map((l) => l.length));
  const width = Math.max(shape === "diamond" ? 100 : 100, maxLineLen * 8 + 40);
  const baseHeight = shape === "diamond" || shape === "circle" ? width : 44;
  const height = baseHeight + Math.max(0, lines.length - 1) * 20;
  return { width, height };
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: Direction,
  subgraphs?: Subgraph[],
): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: DIRECTION_MAP[direction],
    ranksep: 80,
    nodesep: 40,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add subgraph parent nodes
  if (subgraphs) {
    for (const sg of subgraphs) {
      g.setNode(sg.id, { label: sg.label, width: 200, height: 100 });
    }
  }

  // Add nodes
  const nodeSizes = new Map<string, { width: number; height: number }>();
  for (const node of nodes) {
    if (node.type === "subgraphGroup") continue; // subgraph group nodes sized by dagre
    const data = node.data as { label: string; shape: string };
    const size = estimateNodeSize(data.label, data.shape);
    nodeSizes.set(node.id, size);
    g.setNode(node.id, { ...size });
  }

  // Set parent relationships for subgraphs
  if (subgraphs) {
    for (const sg of subgraphs) {
      for (const nodeId of sg.nodeIds) {
        if (g.hasNode(nodeId)) {
          g.setParent(nodeId, sg.id);
        }
      }
    }
  }

  // Add edges (only between non-group nodes)
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  // Build updated nodes with dagre positions (dagre gives center, ReactFlow wants top-left)
  const updatedNodes: Node[] = [];

  // Add subgraph group nodes first
  if (subgraphs) {
    for (const sg of subgraphs) {
      const nodeData = g.node(sg.id);
      if (nodeData) {
        updatedNodes.push({
          id: sg.id,
          type: "subgraphGroup",
          position: { x: nodeData.x - nodeData.width / 2, y: nodeData.y - nodeData.height / 2 },
          data: { label: sg.label },
          style: { width: nodeData.width, height: nodeData.height },
        });
      }
    }
  }

  // Add regular nodes
  for (const node of nodes) {
    if (node.type === "subgraphGroup") continue;
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      updatedNodes.push(node);
      continue;
    }
    const size = nodeSizes.get(node.id) || { width: 100, height: 44 };

    // Check if this node belongs to a subgraph
    const parentId = g.parent(node.id);
    let position = { x: dagreNode.x - size.width / 2, y: dagreNode.y - size.height / 2 };

    if (parentId) {
      // Make position relative to parent
      const parentData = g.node(parentId);
      if (parentData) {
        const parentX = parentData.x - parentData.width / 2;
        const parentY = parentData.y - parentData.height / 2;
        position = {
          x: dagreNode.x - size.width / 2 - parentX,
          y: dagreNode.y - size.height / 2 - parentY,
        };
      }
    }

    updatedNodes.push({
      ...node,
      position,
      ...(parentId ? { parentId } : {}),
    });
  }

  return updatedNodes;
}
