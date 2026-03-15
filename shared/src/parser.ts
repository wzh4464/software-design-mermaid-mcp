import type { FlowDiagram, FlowNode, FlowEdge, Subgraph, Direction, NodeShape, EdgeType } from "./types.js";

const DIRECTION_REGEX = /^(?:graph|flowchart)\s+(TD|LR|BT|RL)/;

const NODE_PATTERNS: { regex: RegExp; shape: NodeShape }[] = [
  { regex: /([A-Za-z_][\w]*)\(\[(.+?)\]\)/, shape: "stadium" },
  { regex: /([A-Za-z_][\w]*)\(\((.+?)\)\)/, shape: "circle" },
  { regex: /([A-Za-z_][\w]*)\{(.+?)\}/, shape: "diamond" },
  { regex: /([A-Za-z_][\w]*)\((.+?)\)/, shape: "rounded" },
  { regex: /([A-Za-z_][\w]*)\[(.+?)\]/, shape: "rect" },
];

const EDGE_PATTERNS: { regex: RegExp; type: EdgeType }[] = [
  { regex: /==>\|(.+?)\|/, type: "thick" },
  { regex: /==>/, type: "thick" },
  { regex: /-\.->\|(.+?)\|/, type: "dotted" },
  { regex: /-.->/, type: "dotted" },
  { regex: /-->\|(.+?)\|/, type: "arrow" },
  { regex: /-->/, type: "arrow" },
];

function parseNodeFromToken(token: string): { id: string; label: string; shape: NodeShape } | null {
  for (const { regex, shape } of NODE_PATTERNS) {
    const match = token.match(regex);
    if (match) {
      return { id: match[1], label: match[2], shape };
    }
  }
  const bareMatch = token.match(/^([A-Za-z_][\w]*)$/);
  if (bareMatch) {
    return { id: bareMatch[1], label: bareMatch[1], shape: "rect" };
  }
  return null;
}

const EDGE_SPLIT_REGEX = /(==>\|.+?\||==>|-\.->\|.+?\||-.->|-->\|.+?\||-->)/;

interface EdgeToken {
  type: EdgeType;
  label?: string;
}

function parseEdgeToken(token: string): EdgeToken {
  for (const { regex, type } of EDGE_PATTERNS) {
    const match = token.match(regex);
    if (match) {
      return { type, label: match[1] || undefined };
    }
  }
  return { type: "arrow" };
}

function tokenizeLine(line: string): string[] {
  return line.split(EDGE_SPLIT_REGEX).map((t) => t.trim()).filter((t) => t.length > 0);
}

export function parseMermaid(code: string): FlowDiagram {
  const lines = code.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  let direction: Direction = "TD";
  const nodeMap = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  let edgeCounter = 0;
  let nodeOrder = 0;
  const subgraphs: Subgraph[] = [];
  const subgraphStack: Subgraph[] = [];

  function addNode(id: string, label: string, shape: NodeShape): void {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id, label, shape,
        position: { x: 150 * (nodeOrder % 4), y: 100 * nodeOrder },
      });
      nodeOrder++;
    } else {
      const existing = nodeMap.get(id)!;
      if (label !== id) {
        existing.label = label;
        existing.shape = shape;
      }
    }
    // Track node in current subgraph context
    if (subgraphStack.length > 0) {
      const current = subgraphStack[subgraphStack.length - 1];
      if (!current.nodeIds.includes(id)) {
        current.nodeIds.push(id);
      }
    }
  }

  for (const line of lines) {
    const dirMatch = line.match(DIRECTION_REGEX);
    if (dirMatch) {
      direction = dirMatch[1] as Direction;
      continue;
    }

    // Always treat `end` as reserved — skip even when no active subgraph
    if (line === "end") {
      if (subgraphStack.length > 0) {
        const completed = subgraphStack.pop()!;
        // Nest under parent subgraph if one exists on the stack
        if (subgraphStack.length > 0) {
          const parent = subgraphStack[subgraphStack.length - 1];
          if (!parent.children) parent.children = [];
          parent.children.push(completed);
        } else {
          subgraphs.push(completed);
        }
      }
      continue;
    }

    const subgraphMatch = line.match(/^subgraph\s+(\S+?)(?:\s*\[(.+?)\])?(?:\s*$)/);
    if (subgraphMatch) {
      const id = subgraphMatch[1];
      const label = subgraphMatch[2] || id;
      subgraphStack.push({ id, label, nodeIds: [], hasExplicitId: true });
      continue;
    }
    // Also handle: subgraph Label (no brackets, label becomes id)
    const subgraphLabelOnly = line.match(/^subgraph\s+(.+)$/);
    if (subgraphLabelOnly && !subgraphMatch) {
      const label = subgraphLabelOnly[1].trim();
      const id = label.replace(/\s+/g, "_");
      subgraphStack.push({ id, label, nodeIds: [], hasExplicitId: false });
      continue;
    }

    const tokens = tokenizeLine(line);

    if (tokens.length >= 3) {
      for (let i = 0; i < tokens.length - 2; i += 2) {
        const sourceNode = parseNodeFromToken(tokens[i]);
        const targetNode = parseNodeFromToken(tokens[i + 2]);
        const edgeInfo = parseEdgeToken(tokens[i + 1]);

        if (sourceNode && targetNode) {
          addNode(sourceNode.id, sourceNode.label, sourceNode.shape);
          addNode(targetNode.id, targetNode.label, targetNode.shape);
          edges.push({
            id: `e${edgeCounter++}`,
            source: sourceNode.id,
            target: targetNode.id,
            label: edgeInfo.label,
            type: edgeInfo.type,
          });
        }
      }
      continue;
    }

    const node = parseNodeFromToken(line);
    if (node) {
      addNode(node.id, node.label, node.shape);
    }
  }

  return { direction, nodes: Array.from(nodeMap.values()), edges, ...(subgraphs.length > 0 ? { subgraphs } : {}) };
}
