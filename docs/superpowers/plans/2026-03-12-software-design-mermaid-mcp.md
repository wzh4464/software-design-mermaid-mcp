# Software Design Mermaid MCP — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MCP server that provides a visual drag-and-drop flowchart editor for Claude Code planning sessions, using Mermaid code as the interchange format.

**Architecture:** TypeScript monorepo with npm workspaces: a shared Mermaid converter, an MCP server (stdio + HTTP), and a React Flow editor (Vite SPA). The MCP server bridges Claude and the browser-based editor via REST API polling.

**Tech Stack:** TypeScript, Node.js, `@modelcontextprotocol/sdk`, React, React Flow (xyflow), Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-software-design-mermaid-mcp-design.md`

---

## Chunk 1: Project Scaffolding + Shared Types + Mermaid Converter

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.base.json`
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `editor/package.json`
- Create: `editor/tsconfig.json`
- Create: `.gitignore`
- Create: `.gitattributes`

- [ ] **Step 1: Initialize root package.json with workspaces**

```json
{
  "name": "software-design-mermaid-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": ["shared", "editor"],
  "scripts": {
    "build": "npm run build:shared && npm run build:server && npm run build:editor",
    "build:shared": "cd shared && tsc",
    "build:server": "tsc -p tsconfig.json",
    "build:editor": "cd editor && npm run build",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev:editor": "cd editor && npm run dev"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.base.json (shared config)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create root tsconfig.json (server)**

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist/server",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [{ "path": "./shared" }]
}
```

- [ ] **Step 4: Create shared/package.json**

```json
{
  "name": "@software-design-mermaid-mcp/converter",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

- [ ] **Step 5: Create shared/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 6: Create editor/package.json**

```json
{
  "name": "@software-design-mermaid-mcp/editor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@software-design-mermaid-mcp/converter": "*",
    "@xyflow/react": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 7: Create editor/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 8: Create .gitignore**

```
node_modules/
dist/server/
shared/dist/
.superpowers/
*.tsbuildinfo
```

Note: `dist/editor/` is NOT ignored — it's committed for zero-build-step runtime.

- [ ] **Step 9: Create .gitattributes**

```
dist/editor/ linguist-generated=true
```

- [ ] **Step 10: Run npm install**

Run: `npm install`
Expected: Installs all workspace dependencies without errors.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json tsconfig.base.json shared/package.json shared/tsconfig.json editor/package.json editor/tsconfig.json .gitignore .gitattributes
git commit -m "chore: scaffold monorepo with npm workspaces"
```

---

### Task 2: Shared Types

**Files:**
- Create: `shared/src/index.ts`
- Create: `shared/src/types.ts`

- [ ] **Step 1: Create shared/src/types.ts**

```typescript
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
}

export interface FlowDiagram {
  direction: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  subgraphs?: Subgraph[];
}
```

- [ ] **Step 2: Create shared/src/index.ts (types-only barrel for now)**

```typescript
export * from "./types.js";
// Parser and serializer exports added in Tasks 3 and 4
```

- [ ] **Step 3: Build shared to verify types compile**

Run: `cd shared && npx tsc --noEmit`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add shared/src/types.ts shared/src/index.ts
git commit -m "feat: add shared FlowDiagram types"
```

---

### Task 3: Mermaid Parser

**Files:**
- Create: `shared/src/parser.ts`
- Create: `shared/src/__tests__/parser.test.ts`

- [ ] **Step 1: Write parser tests**

```typescript
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
    expect(result.nodes[0]).toMatchObject({
      id: "A",
      label: "Start",
      shape: "rect",
    });
  });

  it("parses rounded node (text)", () => {
    const result = parseMermaid("graph TD\n  A(Action)");
    expect(result.nodes[0]).toMatchObject({
      id: "A",
      label: "Action",
      shape: "rounded",
    });
  });

  it("parses diamond node {text}", () => {
    const result = parseMermaid("graph TD\n  A{Decision}");
    expect(result.nodes[0]).toMatchObject({
      id: "A",
      label: "Decision",
      shape: "diamond",
    });
  });

  it("parses circle node ((text))", () => {
    const result = parseMermaid("graph TD\n  A((End))");
    expect(result.nodes[0]).toMatchObject({
      id: "A",
      label: "End",
      shape: "circle",
    });
  });

  it("parses stadium node ([text])", () => {
    const result = parseMermaid("graph TD\n  A([Input])");
    expect(result.nodes[0]).toMatchObject({
      id: "A",
      label: "Input",
      shape: "stadium",
    });
  });

  it("parses arrow edge -->", () => {
    const result = parseMermaid("graph TD\n  A[Start] --> B[End]");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      source: "A",
      target: "B",
      type: "arrow",
    });
  });

  it("parses dotted edge -.->", () => {
    const result = parseMermaid("graph TD\n  A[Start] -.-> B[End]");
    expect(result.edges[0]).toMatchObject({
      source: "A",
      target: "B",
      type: "dotted",
    });
  });

  it("parses thick edge ==>", () => {
    const result = parseMermaid("graph TD\n  A[Start] ==> B[End]");
    expect(result.edges[0]).toMatchObject({
      source: "A",
      target: "B",
      type: "thick",
    });
  });

  it("parses edge with label -->|text|", () => {
    const result = parseMermaid("graph TD\n  A[Start] -->|Yes| B[End]");
    expect(result.edges[0]).toMatchObject({
      source: "A",
      target: "B",
      label: "Yes",
      type: "arrow",
    });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run shared/src/__tests__/parser.test.ts`
Expected: FAIL — module `../parser.js` not found.

- [ ] **Step 3: Implement the parser**

```typescript
import type { FlowDiagram, FlowNode, FlowEdge, Direction, NodeShape, EdgeType } from "./types.js";

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
  // Bare ID (no shape syntax)
  const bareMatch = token.match(/^([A-Za-z_][\w]*)$/);
  if (bareMatch) {
    return { id: bareMatch[1], label: bareMatch[1], shape: "rect" };
  }
  return null;
}

// Regex that matches any edge pattern (used for splitting chained edges)
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

/**
 * Split a line into alternating node-tokens and edge-tokens.
 * e.g. "A[Start] --> B[Mid] -.-> C((End))" → ["A[Start]", "-->", "B[Mid]", "-.->", "C((End))"]
 */
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

  function addNode(id: string, label: string, shape: NodeShape): void {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        label,
        shape,
        position: { x: 150 * (nodeOrder % 4), y: 100 * Math.floor(nodeOrder / 4) * 1.5 },
      });
      nodeOrder++;
    } else {
      const existing = nodeMap.get(id)!;
      if (label !== id) {
        existing.label = label;
        existing.shape = shape;
      }
    }
  }

  for (const line of lines) {
    const dirMatch = line.match(DIRECTION_REGEX);
    if (dirMatch) {
      direction = dirMatch[1] as Direction;
      continue;
    }

    if (line.startsWith("subgraph") || line === "end") {
      continue;
    }

    // Tokenize line into alternating node/edge tokens
    const tokens = tokenizeLine(line);

    if (tokens.length >= 3) {
      // Process chained edges: [node, edge, node, edge, node, ...]
      for (let i = 0; i < tokens.length - 2; i += 2) {
        const sourceToken = tokens[i];
        const edgeToken = tokens[i + 1];
        const targetToken = tokens[i + 2];

        const sourceNode = parseNodeFromToken(sourceToken);
        const targetNode = parseNodeFromToken(targetToken);
        const edgeInfo = parseEdgeToken(edgeToken);

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

    // Standalone node declaration
    const node = parseNodeFromToken(line);
    if (node) {
      addNode(node.id, node.label, node.shape);
    }
  }

  return {
    direction,
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run shared/src/__tests__/parser.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Update shared/src/index.ts to export parser**

Add to `shared/src/index.ts`:
```typescript
export { parseMermaid } from "./parser.js";
```

- [ ] **Step 6: Commit**

```bash
git add shared/src/parser.ts shared/src/__tests__/parser.test.ts shared/src/index.ts
git commit -m "feat: implement Mermaid flowchart parser with tests"
```

---

### Task 4: Mermaid Serializer

**Files:**
- Create: `shared/src/serializer.ts`
- Create: `shared/src/__tests__/serializer.test.ts`

- [ ] **Step 1: Write serializer tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run shared/src/__tests__/serializer.test.ts`
Expected: FAIL — module `../serializer.js` not found.

- [ ] **Step 3: Implement the serializer**

```typescript
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

function serializeEdge(edge: FlowEdge): string {
  const arrow = EDGE_ARROWS[edge.type] || "-->";
  if (edge.label) {
    return `${edge.source} ${arrow}|${edge.label}| ${edge.target}`;
  }
  return `${edge.source} ${arrow} ${edge.target}`;
}

export function toMermaid(diagram: FlowDiagram): string {
  const lines: string[] = [];
  lines.push(`graph ${diagram.direction}`);

  // Collect node IDs that appear in edges
  const nodesInEdges = new Set<string>();
  for (const edge of diagram.edges) {
    nodesInEdges.add(edge.source);
    nodesInEdges.add(edge.target);
  }

  // Standalone node declarations (not referenced in any edge)
  for (const node of diagram.nodes) {
    if (!nodesInEdges.has(node.id)) {
      lines.push(`  ${serializeNode(node)}`);
    }
  }

  // Build a node lookup for inline declarations
  const nodeMap = new Map<string, FlowNode>();
  for (const node of diagram.nodes) {
    nodeMap.set(node.id, node);
  }

  // Track which nodes have been declared inline
  const declared = new Set<string>();

  // Edges with inline node declarations
  for (const edge of diagram.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    const sourceStr = sourceNode && !declared.has(edge.source) ? serializeNode(sourceNode) : edge.source;
    const targetStr = targetNode && !declared.has(edge.target) ? serializeNode(targetNode) : edge.target;

    if (sourceNode) declared.add(edge.source);
    if (targetNode) declared.add(edge.target);

    const arrow = EDGE_ARROWS[edge.type] || "-->";
    if (edge.label) {
      lines.push(`  ${sourceStr} ${arrow}|${edge.label}| ${targetStr}`);
    } else {
      lines.push(`  ${sourceStr} ${arrow} ${targetStr}`);
    }
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run shared/src/__tests__/serializer.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Update shared/src/index.ts to export serializer**

Add to `shared/src/index.ts`:
```typescript
export { toMermaid } from "./serializer.js";
```

- [ ] **Step 6: Commit**

```bash
git add shared/src/serializer.ts shared/src/__tests__/serializer.test.ts shared/src/index.ts
git commit -m "feat: implement Mermaid flowchart serializer with tests"
```

---

### Task 5: Round-Trip Test

**Files:**
- Create: `shared/src/__tests__/roundtrip.test.ts`

- [ ] **Step 1: Write round-trip test**

```typescript
import { describe, it, expect } from "vitest";
import { parseMermaid } from "../parser.js";
import { toMermaid } from "../serializer.js";

describe("round-trip: parse → serialize → parse", () => {
  const testCases = [
    {
      name: "simple flowchart",
      input: `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C(Action)
  B -->|No| D((End))
  C --> D`,
    },
    {
      name: "LR direction with stadium",
      input: `graph LR
  A([Input]) --> B[Process] --> C((Output))`,
    },
    {
      name: "dotted and thick edges",
      input: `graph TD
  A[Start] -.-> B[Middle]
  B ==> C[End]`,
    },
  ];

  for (const { name, input } of testCases) {
    it(`round-trips: ${name}`, () => {
      const parsed1 = parseMermaid(input);
      const serialized = toMermaid(parsed1);
      const parsed2 = parseMermaid(serialized);

      // Nodes should match (ignoring positions)
      expect(parsed2.nodes.map((n) => ({ id: n.id, label: n.label, shape: n.shape }))).toEqual(
        parsed1.nodes.map((n) => ({ id: n.id, label: n.label, shape: n.shape }))
      );

      // Edges should match
      expect(parsed2.edges.map((e) => ({ source: e.source, target: e.target, label: e.label, type: e.type }))).toEqual(
        parsed1.edges.map((e) => ({ source: e.source, target: e.target, label: e.label, type: e.type }))
      );

      // Direction should match
      expect(parsed2.direction).toBe(parsed1.direction);
    });
  }
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run shared/src/__tests__/roundtrip.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Build the shared package**

Run: `npm run build:shared`
Expected: Compiles without errors, `shared/dist/` contains .js and .d.ts files.

- [ ] **Step 4: Commit**

```bash
git add shared/src/__tests__/roundtrip.test.ts
git commit -m "test: add round-trip tests for Mermaid converter"
```

---

## Chunk 2: MCP Server + HTTP Server

### Task 6: Diagram State Manager

**Files:**
- Create: `src/state.ts`
- Create: `src/__tests__/state.test.ts`

- [ ] **Step 1: Write state manager tests**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { DiagramState } from "../state.js";

describe("DiagramState", () => {
  let state: DiagramState;

  beforeEach(() => {
    state = new DiagramState();
  });

  it("starts with no active session", () => {
    expect(state.hasSession()).toBe(false);
  });

  it("creates session on showDiagram", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    expect(state.hasSession()).toBe(true);
    expect(state.getVersion()).toBe(1);
  });

  it("increments version on subsequent showDiagram", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    state.showDiagram("graph TD\n  A[Start] --> B[End]", "Test 2");
    expect(state.getVersion()).toBe(2);
  });

  it("returns pending when no submission", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    const feedback = state.getFeedback();
    expect(feedback.status).toBe("pending");
  });

  it("returns submitted feedback after submission", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    state.submitFeedback({
      nodes: [{ id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } }],
      edges: [],
      mermaid_code: "graph TD\n  A[Start]",
    });
    const feedback = state.getFeedback();
    expect(feedback.status).toBe("submitted");
  });

  it("clears submission after reading (one-shot)", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    state.submitFeedback({
      nodes: [{ id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } }],
      edges: [],
      mermaid_code: "graph TD\n  A[Start]",
    });
    state.getFeedback(); // first read
    const feedback2 = state.getFeedback(); // second read
    expect(feedback2.status).toBe("pending");
  });

  it("discards pending feedback on new showDiagram", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    state.submitFeedback({
      nodes: [{ id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } }],
      edges: [],
      mermaid_code: "graph TD\n  A[Start]",
    });
    state.showDiagram("graph TD\n  B[New]", "Test 2");
    const feedback = state.getFeedback();
    expect(feedback.status).toBe("pending");
  });

  it("computes changes_summary", () => {
    state.showDiagram("graph TD\n  A[Start] --> B[End]", "Test");
    state.submitFeedback({
      nodes: [
        { id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } },
        { id: "C", label: "New", shape: "rect", position: { x: 0, y: 100 } },
      ],
      edges: [{ id: "e0", source: "A", target: "C", type: "arrow" }],
      mermaid_code: "graph TD\n  A[Start] --> C[New]",
    });
    const feedback = state.getFeedback();
    if (feedback.status === "submitted") {
      expect(feedback.changes_summary.nodes_added).toContain("C");
      expect(feedback.changes_summary.nodes_removed).toContain("B");
    }
  });

  it("tracks editor connection", () => {
    expect(state.isEditorConnected()).toBe(false);
    state.recordEditorPoll();
    expect(state.isEditorConnected()).toBe(true);
  });

  it("returns final mermaid on close", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    state.submitFeedback({
      nodes: [{ id: "A", label: "Start", shape: "rect", position: { x: 0, y: 0 } }],
      edges: [],
      mermaid_code: "graph TD\n  A[Modified]",
    });
    // Read the submission to clear it
    state.getFeedback();
    const result = state.closeDiagram();
    expect(result.final_mermaid).toBe("graph TD\n  A[Modified]");
  });

  it("returns original mermaid on close if never submitted", () => {
    state.showDiagram("graph TD\n  A[Start]", "Test");
    const result = state.closeDiagram();
    expect(result.final_mermaid).toBe("graph TD\n  A[Start]");
  });

  it("returns error on close with no session", () => {
    const result = state.closeDiagram();
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/state.test.ts`
Expected: FAIL — module `../state.js` not found.

- [ ] **Step 3: Implement state manager**

```typescript
import { parseMermaid } from "@software-design-mermaid-mcp/converter";
import type { FlowNode, FlowEdge } from "@software-design-mermaid-mcp/converter";

interface Submission {
  nodes: FlowNode[];
  edges: FlowEdge[];
  mermaid_code: string;
  user_message?: string;
}

interface FeedbackSubmitted {
  status: "submitted";
  mermaid_code: string;
  user_message?: string;
  changes_summary: {
    nodes_added: string[];
    nodes_removed: string[];
    edges_added: { from: string; to: string }[];
    edges_removed: { from: string; to: string }[];
  };
}

interface FeedbackPending {
  status: "pending";
  message: string;
}

interface CloseResult {
  success: boolean;
  final_mermaid?: string;
  message: string;
}

export class DiagramState {
  private version = 0;
  private currentMermaid: string | null = null;
  private title: string | null = null;
  private description: string | null = null;
  private submission: Submission | null = null;
  private lastSubmittedMermaid: string | null = null;
  private lastEditorPoll = 0;
  private sessionActive = false;
  private sessionEnded = false;

  hasSession(): boolean {
    return this.sessionActive;
  }

  getVersion(): number {
    return this.version;
  }

  getCurrentDiagram(): { mermaid_code: string; title?: string; description?: string; version: number; session_ended: boolean } | null {
    if (this.sessionEnded) {
      return { mermaid_code: "", version: this.version, session_ended: true };
    }
    if (!this.sessionActive) {
      return null;
    }
    return {
      mermaid_code: this.currentMermaid!,
      title: this.title || undefined,
      description: this.description || undefined,
      version: this.version,
      session_ended: false,
    };
  }

  showDiagram(mermaidCode: string, title?: string, description?: string): void {
    this.currentMermaid = mermaidCode;
    this.title = title || null;
    this.description = description || null;
    this.submission = null;
    this.version++;
    this.sessionActive = true;
  }

  submitFeedback(submission: Submission): void {
    this.submission = submission;
    this.lastSubmittedMermaid = submission.mermaid_code;
  }

  getFeedback(): FeedbackSubmitted | FeedbackPending {
    if (!this.submission) {
      return { status: "pending", message: "User is still editing. Try again later." };
    }

    const baseline = parseMermaid(this.currentMermaid!);
    const baselineNodeIds = new Set(baseline.nodes.map((n) => n.id));
    const submittedNodeIds = new Set(this.submission.nodes.map((n) => n.id));
    const baselineEdgeKeys = new Set(baseline.edges.map((e) => `${e.source}->${e.target}`));
    const submittedEdgeKeys = new Set(this.submission.edges.map((e) => `${e.source}->${e.target}`));

    const nodes_added = [...submittedNodeIds].filter((id) => !baselineNodeIds.has(id));
    const nodes_removed = [...baselineNodeIds].filter((id) => !submittedNodeIds.has(id));
    const edges_added = this.submission.edges
      .filter((e) => !baselineEdgeKeys.has(`${e.source}->${e.target}`))
      .map((e) => ({ from: e.source, to: e.target }));
    const edges_removed = baseline.edges
      .filter((e) => !submittedEdgeKeys.has(`${e.source}->${e.target}`))
      .map((e) => ({ from: e.source, to: e.target }));

    const result: FeedbackSubmitted = {
      status: "submitted",
      mermaid_code: this.submission.mermaid_code,
      user_message: this.submission.user_message,
      changes_summary: { nodes_added, nodes_removed, edges_added, edges_removed },
    };

    // One-shot read: clear submission after reading
    this.submission = null;
    return result;
  }

  recordEditorPoll(): void {
    this.lastEditorPoll = Date.now();
  }

  isEditorConnected(): boolean {
    return Date.now() - this.lastEditorPoll < 5000;
  }

  closeDiagram(): CloseResult {
    if (!this.sessionActive) {
      return { success: false, message: "No active diagram session." };
    }
    const finalMermaid = this.lastSubmittedMermaid || this.currentMermaid!;
    // Mark session as ended but keep state readable so editor can poll one last time
    this.sessionActive = false;
    this.sessionEnded = true;
    this.submission = null;
    return { success: true, final_mermaid: finalMermaid, message: "Editor closed." };
  }

  isSessionEnded(): boolean {
    return this.sessionEnded;
  }

  /** Called after editor has polled and seen session_ended. Safe to fully clean up. */
  fullCleanup(): void {
    this.currentMermaid = null;
    this.lastSubmittedMermaid = null;
    this.version = 0;
    this.sessionEnded = false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/state.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.ts src/__tests__/state.test.ts
git commit -m "feat: implement DiagramState manager with tests"
```

---

### Task 7: HTTP Server

**Files:**
- Create: `src/server.ts`

- [ ] **Step 1: Implement HTTP server**

```typescript
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiagramState } from "./state.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const EDITOR_DIR = join(__dirname, "..", "editor");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function createHttpServer(state: DiagramState): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS for dev mode
    if (req.headers.origin?.includes("localhost")) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // API routes
    if (pathname === "/api/diagram" && req.method === "GET") {
      state.recordEditorPoll();
      const diagram = state.getCurrentDiagram();
      if (!diagram) {
        json(res, 200, { version: 0, session_ended: true });
        return;
      }
      // If session just ended, editor gets one last poll with session_ended: true,
      // then we clean up state on next poll
      if (diagram.session_ended) {
        json(res, 200, diagram);
        state.fullCleanup();
        return;
      }
      json(res, 200, diagram);
      return;
    }

    if (pathname === "/api/submission" && req.method === "POST") {
      const body = JSON.parse(await readBody(req));
      state.submitFeedback(body);
      json(res, 200, { success: true });
      return;
    }

    if (pathname === "/api/status" && req.method === "GET") {
      json(res, 200, {
        status: "ok",
        editor_connected: state.isEditorConnected(),
        has_session: state.hasSession(),
      });
      return;
    }

    // Static file serving
    let filePath = pathname === "/" ? "/index.html" : pathname;
    const fullPath = join(EDITOR_DIR, filePath);

    // Security: prevent path traversal
    if (!fullPath.startsWith(EDITOR_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const data = await readFile(fullPath);
      const ext = extname(fullPath);
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(data);
    } catch {
      // SPA fallback: serve index.html for client-side routing
      try {
        const indexData = await readFile(join(EDITOR_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(indexData);
      } catch {
        res.writeHead(404);
        res.end("Not Found");
      }
    }
  });

  return server;
}

export function startServer(state: DiagramState): Promise<{ port: number; url: string; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createHttpServer(state);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }
      const port = addr.port;
      const url = `http://localhost:${port}`;
      resolve({
        port,
        url,
        close: () => server.close(),
      });
    });
  });
}
```

- [ ] **Step 2: Verify server.ts compiles in isolation**

Run: `npx tsc --noEmit --isolatedModules src/server.ts`
Expected: No errors. Full project build will happen after tools.ts and index.ts are created in Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "feat: implement HTTP server with REST API and static file serving"
```

---

### Task 8: MCP Tool Definitions + Server Entry

**Files:**
- Create: `src/tools.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Implement MCP tool definitions**

```typescript
import { exec } from "node:child_process";
import type { DiagramState } from "./state.js";
import { startServer } from "./server.js";

interface ServerHandle {
  port: number;
  url: string;
  close: () => void;
}

export class DiagramTools {
  private state: DiagramState;
  private server: ServerHandle | null = null;

  constructor(state: DiagramState) {
    this.state = state;
  }

  async showDiagram(args: { mermaid_code: string; title?: string; description?: string }): Promise<unknown> {
    this.state.showDiagram(args.mermaid_code, args.title, args.description);

    // Start server if not running
    if (!this.server) {
      this.server = await startServer(this.state);
      // Open browser
      const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      exec(`${openCmd} ${this.server.url}`);
    }

    return {
      success: true,
      url: this.server.url,
      editor_connected: this.state.isEditorConnected(),
      message: "Diagram opened in browser. Call get_diagram_feedback() to get user's changes.",
    };
  }

  getDiagramFeedback(): unknown {
    if (!this.state.hasSession()) {
      return { status: "error", message: "No active diagram session." };
    }
    return this.state.getFeedback();
  }

  closeDiagram(): unknown {
    const result = this.state.closeDiagram();
    // Delay server shutdown to allow editor one last poll to see session_ended
    if (this.server) {
      const server = this.server;
      this.server = null;
      setTimeout(() => server.close(), 10000);
    }
    return result;
  }
}
```

- [ ] **Step 2: Implement MCP server entry**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DiagramState } from "./state.js";
import { DiagramTools } from "./tools.js";

const state = new DiagramState();
const tools = new DiagramTools(state);

const server = new McpServer({
  name: "software-design-mermaid",
  version: "0.1.0",
});

server.tool(
  "show_diagram",
  "Display a Mermaid flowchart in a visual drag-and-drop editor. Opens a browser-based editor where the user can visually edit the diagram. Call get_diagram_feedback() afterwards to retrieve the user's changes.",
  {
    mermaid_code: z.string().describe("Mermaid flowchart code (e.g., 'graph TD\\n  A[Start] --> B[End]')"),
    title: z.string().optional().describe("Title shown in the editor header"),
    description: z.string().optional().describe("Context description shown to the user"),
  },
  async (args) => {
    const result = await tools.showDiagram(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_diagram_feedback",
  "Poll for user's diagram edits. Returns 'submitted' with updated Mermaid code and a changes summary if the user has submitted, or 'pending' if they are still editing. Submission is one-shot: cleared after reading.",
  {},
  async () => {
    const result = tools.getDiagramFeedback();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "close_diagram",
  "Close the diagram editor session. Returns the final Mermaid code (last submitted version, or original if never submitted). Shuts down the local HTTP server.",
  {},
  async () => {
    const result = tools.closeDiagram();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

- [ ] **Step 3: Add zod dependency**

Run: `npm install zod`

- [ ] **Step 4: Build the server**

Run: `npm run build:shared && npm run build:server`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add src/tools.ts src/index.ts package.json package-lock.json
git commit -m "feat: implement MCP server with show_diagram, get_diagram_feedback, close_diagram tools"
```

---

## Chunk 3: React Flow Editor

### Task 9: Editor Scaffolding

**Files:**
- Create: `editor/index.html`
- Create: `editor/vite.config.ts`
- Create: `editor/src/main.tsx`
- Create: `editor/src/App.tsx`
- Create: `editor/src/api.ts`

- [ ] **Step 1: Create editor/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../dist/editor",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3456",
    },
  },
});
```

- [ ] **Step 2: Create editor/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Software Design — Mermaid Editor</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { width: 100%; height: 100%; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e2e8f0; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create editor/src/api.ts**

```typescript
const API_BASE = "";

export interface DiagramResponse {
  version: number;
  mermaid_code?: string;
  title?: string;
  description?: string;
  session_ended?: boolean;
}

export interface SubmissionPayload {
  nodes: Array<{ id: string; label: string; shape: string; position: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string; label?: string; type: string }>;
  mermaid_code: string;
  user_message?: string;
}

export async function fetchDiagram(): Promise<DiagramResponse> {
  const res = await fetch(`${API_BASE}/api/diagram`);
  return res.json();
}

export async function submitDiagram(payload: SubmissionPayload): Promise<void> {
  await fetch(`${API_BASE}/api/submission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 4: Create editor/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Create editor/src/App.tsx (minimal shell)**

```tsx
import { useState, useEffect, useCallback } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { fetchDiagram } from "./api.js";

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [title, setTitle] = useState("Software Design");
  const [version, setVersion] = useState(0);
  const [connected, setConnected] = useState(false);

  // Poll server for diagram updates
  useEffect(() => {
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const data = await fetchDiagram();
          setConnected(true);
          if (data.version > version && data.mermaid_code) {
            // TODO: parse mermaid and update nodes/edges
            setVersion(data.version);
            if (data.title) setTitle(data.title);
          }
        } catch {
          setConnected(false);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => { active = false; };
  }, [version]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title Bar */}
      <div style={{ padding: "8px 16px", background: "rgba(99,102,241,0.15)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#818cf8", fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: "0.75rem", color: connected ? "#34d399" : "#ef4444" }}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow nodes={nodes} edges={edges}>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Install editor dependencies and verify build**

Run: `cd editor && npm install && npm run build`
Expected: Builds successfully, output in `dist/editor/`.

- [ ] **Step 7: Commit**

```bash
git add editor/index.html editor/vite.config.ts editor/src/main.tsx editor/src/App.tsx editor/src/api.ts
git commit -m "feat: scaffold React Flow editor with polling and basic layout"
```

---

### Task 10: Custom Node Components

**Files:**
- Create: `editor/src/nodes/FlowchartNode.tsx`
- Create: `editor/src/nodes/index.ts`

- [ ] **Step 1: Create FlowchartNode component**

```tsx
import { memo, useState, useCallback, type ChangeEvent, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface FlowchartNodeData {
  label: string;
  shape: "rect" | "rounded" | "diamond" | "circle" | "stadium";
  [key: string]: unknown;
}

const SHAPE_STYLES: Record<string, React.CSSProperties> = {
  rect: { borderRadius: 4 },
  rounded: { borderRadius: 12 },
  diamond: { borderRadius: 4, transform: "rotate(45deg)", aspectRatio: "1/1" },
  circle: { borderRadius: "50%", aspectRatio: "1/1" },
  stadium: { borderRadius: 999 },
};

const SHAPE_COLORS: Record<string, string> = {
  rect: "#818cf8",
  rounded: "#10b981",
  diamond: "#f59e0b",
  circle: "#ec4899",
  stadium: "#8b5cf6",
};

function FlowchartNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowchartNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const shape = nodeData.shape || "rect";
  const color = SHAPE_COLORS[shape];
  const isDiamond = shape === "diamond";

  const handleDoubleClick = useCallback(() => setEditing(true), []);
  const handleBlur = useCallback(() => {
    setEditing(false);
    nodeData.label = label;
  }, [label, nodeData]);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      nodeData.label = label;
    }
    if (e.key === "Escape") {
      setLabel(nodeData.label);
      setEditing(false);
    }
  }, [label, nodeData]);

  const outerStyle: React.CSSProperties = {
    ...SHAPE_STYLES[shape],
    background: `${color}20`,
    border: `2px solid ${color}`,
    padding: isDiamond ? "20px" : "8px 16px",
    minWidth: isDiamond ? 60 : 80,
    minHeight: isDiamond ? 60 : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: selected ? `0 0 0 2px ${color}80` : undefined,
    cursor: "grab",
  };

  const textStyle: React.CSSProperties = isDiamond ? { transform: "rotate(-45deg)" } : {};

  return (
    <div style={outerStyle} onDoubleClick={handleDoubleClick}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={textStyle}>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              background: "transparent",
              border: "none",
              color: "#e2e8f0",
              fontSize: "0.85rem",
              textAlign: "center",
              width: Math.max(60, label.length * 9),
              outline: "none",
            }}
          />
        ) : (
          <span style={{ fontSize: "0.85rem", color: "#e2e8f0", userSelect: "none" }}>{label}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

export default memo(FlowchartNode);
```

- [ ] **Step 2: Create nodes/index.ts**

```typescript
import FlowchartNode from "./FlowchartNode.js";

export const nodeTypes = {
  flowchart: FlowchartNode,
};
```

- [ ] **Step 3: Commit**

```bash
git add editor/src/nodes/FlowchartNode.tsx editor/src/nodes/index.ts
git commit -m "feat: add custom FlowchartNode with 5 shapes and inline editing"
```

---

### Task 11: Toolbar Component

**Files:**
- Create: `editor/src/toolbar/Toolbar.tsx`

- [ ] **Step 1: Implement toolbar**

```tsx
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { NodeShape, Direction } from "@software-design-mermaid-mcp/converter";

interface ToolbarProps {
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  onTogglePreview: () => void;
  showPreview: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

let nodeIdCounter = 0;
function nextNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

export default function Toolbar({ direction, onDirectionChange, onTogglePreview, showPreview, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
  const { addNodes, getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const addNode = useCallback(
    (shape: NodeShape) => {
      const id = nextNodeId();
      addNodes({
        id,
        type: "flowchart",
        position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
        data: { label: `New ${shape}`, shape },
      });
    },
    [addNodes]
  );

  const deleteSelected = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes(nodes.filter((n) => !n.selected));
    setEdges(edges.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
  }, [getNodes, getEdges, setNodes, setEdges]);

  const btnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "#c8d6e5",
    padding: "4px 10px",
    borderRadius: 4,
    fontSize: "0.75rem",
    cursor: "pointer",
  };

  const sep = <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
      <button style={btnStyle} onClick={() => addNode("rect")}>+ Rect</button>
      <button style={btnStyle} onClick={() => addNode("rounded")}>+ Rounded</button>
      <button style={btnStyle} onClick={() => addNode("diamond")}>+ Diamond</button>
      <button style={btnStyle} onClick={() => addNode("circle")}>+ Circle</button>
      <button style={btnStyle} onClick={() => addNode("stadium")}>+ Stadium</button>
      {sep}
      <button style={btnStyle} onClick={deleteSelected}>Delete</button>
      <button style={{ ...btnStyle, opacity: canUndo ? 1 : 0.4 }} onClick={onUndo} disabled={!canUndo}>Undo</button>
      <button style={{ ...btnStyle, opacity: canRedo ? 1 : 0.4 }} onClick={onRedo} disabled={!canRedo}>Redo</button>
      {sep}
      <button style={{ ...btnStyle, background: direction === "TD" ? "rgba(99,102,241,0.3)" : undefined }} onClick={() => onDirectionChange("TD")}>TD ↕</button>
      <button style={{ ...btnStyle, background: direction === "LR" ? "rgba(99,102,241,0.3)" : undefined }} onClick={() => onDirectionChange("LR")}>LR →</button>
      <div style={{ flex: 1 }} />
      <button style={{ ...btnStyle, background: showPreview ? "rgba(99,102,241,0.3)" : undefined }} onClick={onTogglePreview}>
        Mermaid {showPreview ? "▾" : "▸"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add editor/src/toolbar/Toolbar.tsx
git commit -m "feat: add editor toolbar with node creation, delete, and direction toggle"
```

---

### Task 12: Mermaid Preview Panel

**Files:**
- Create: `editor/src/preview/MermaidPreview.tsx`

- [ ] **Step 1: Implement preview panel**

```tsx
interface MermaidPreviewProps {
  code: string;
}

export default function MermaidPreview({ code }: MermaidPreviewProps) {
  return (
    <div style={{ width: 260, background: "rgba(255,255,255,0.03)", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Live Mermaid Preview
      </div>
      <pre style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: "0.75rem", lineHeight: 1.6, color: "#94a3b8", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
        {code || "No diagram loaded"}
      </pre>
      <div style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 8, textAlign: "center" }}>
        Auto-updates as you edit
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add editor/src/preview/MermaidPreview.tsx
git commit -m "feat: add live Mermaid code preview panel"
```

---

### Task 12b: Custom Edge Component

**Files:**
- Create: `editor/src/edges/FlowchartEdge.tsx`
- Create: `editor/src/edges/index.ts`

- [ ] **Step 1: Create FlowchartEdge component**

```tsx
import { memo, useState, useCallback, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

export interface FlowchartEdgeData {
  edgeType: "arrow" | "dotted" | "thick";
  [key: string]: unknown;
}

function FlowchartEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label, selected } = props;
  const edgeData = data as FlowchartEdgeData | undefined;
  const edgeType = edgeData?.edgeType || "arrow";
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState((label as string) || "");

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const strokeDasharray = edgeType === "dotted" ? "5 5" : undefined;
  const strokeWidth = edgeType === "thick" ? 3 : 1.5;
  const strokeColor = selected ? "#818cf8" : "#64748b";

  const handleDoubleClick = useCallback(() => setEditing(true), []);
  const handleBlur = useCallback(() => {
    setEditing(false);
    if (edgeData) (edgeData as Record<string, unknown>)["__updatedLabel"] = editLabel;
  }, [editLabel, edgeData]);
  const handleKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      if (edgeData) (edgeData as Record<string, unknown>)["__updatedLabel"] = editLabel;
    }
    if (e.key === "Escape") {
      setEditLabel((label as string) || "");
      setEditing(false);
    }
  }, [editLabel, edgeData, label]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd="url(#arrow)" style={{ stroke: strokeColor, strokeWidth, strokeDasharray }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            cursor: "pointer",
          }}
          onDoubleClick={handleDoubleClick}
        >
          {editing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEditLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{ background: "#1e1e2e", border: "1px solid #818cf8", color: "#e2e8f0", fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4, textAlign: "center", width: Math.max(40, editLabel.length * 8), outline: "none" }}
            />
          ) : (
            (label || editLabel) && <span style={{ background: "#1e1e2e", color: "#94a3b8", fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4, border: selected ? "1px solid #818cf8" : "1px solid transparent" }}>{editLabel || label}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(FlowchartEdge);
```

- [ ] **Step 2: Create edges/index.ts**

```typescript
import FlowchartEdge from "./FlowchartEdge.js";

export const edgeTypes = {
  flowchart: FlowchartEdge,
};
```

- [ ] **Step 3: Commit**

```bash
git add editor/src/edges/FlowchartEdge.tsx editor/src/edges/index.ts
git commit -m "feat: add custom FlowchartEdge with dotted/thick styles and label editing"
```

---

### Task 12c: Undo/Redo Hook

**Files:**
- Create: `editor/src/hooks/useUndoRedo.ts`

- [ ] **Step 1: Implement undo/redo hook**

```typescript
import { useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

export function useUndoRedo(maxHistory = 50) {
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const skipRecording = useRef(false);

  const record = useCallback((nodes: Node[], edges: Edge[]) => {
    if (skipRecording.current) {
      skipRecording.current = false;
      return;
    }
    history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    if (history.current.length > maxHistory) history.current.shift();
    future.current = [];
  }, [maxHistory]);

  const undo = useCallback((
    currentNodes: Node[],
    currentEdges: Edge[],
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void
  ) => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push({ nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) });
    skipRecording.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, []);

  const redo = useCallback((
    currentNodes: Node[],
    currentEdges: Edge[],
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void
  ) => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push({ nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) });
    skipRecording.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
  }, []);

  const reset = useCallback(() => {
    history.current = [];
    future.current = [];
  }, []);

  const canUndo = useCallback(() => history.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { record, undo, redo, reset, canUndo, canRedo };
}
```

- [ ] **Step 2: Commit**

```bash
git add editor/src/hooks/useUndoRedo.ts
git commit -m "feat: add undo/redo hook for canvas state"
```

---

### Task 13: Full App Integration

**Files:**
- Modify: `editor/src/App.tsx`

- [ ] **Step 1: Integrate all components into App.tsx**

Replace `editor/src/App.tsx` with the full implementation that wires together: polling, Mermaid parsing, React Flow canvas with custom nodes, toolbar, preview panel, submit flow, and bottom bar with message input + Reset/Submit buttons.

Key integration points:
- On poll: if `version` increments, call `parseMermaid()` → convert to React Flow nodes/edges → update canvas
- On canvas change: call `toMermaid()` → update preview panel
- On submit: serialize current graph → `POST /api/submission`
- On reset: revert to last Claude-sent version
- Connect edge creation via `onConnect` callback
- Wire `onNodesChange` and `onEdgesChange` for drag/select/delete

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { parseMermaid, toMermaid, type FlowDiagram, type FlowNode, type FlowEdge } from "@software-design-mermaid-mcp/converter";
import { fetchDiagram, submitDiagram } from "./api.js";
import { nodeTypes } from "./nodes/index.js";
import { edgeTypes } from "./edges/index.js";
import Toolbar from "./toolbar/Toolbar.js";
import MermaidPreview from "./preview/MermaidPreview.js";
import { useUndoRedo } from "./hooks/useUndoRedo.js";
import type { Direction } from "@software-design-mermaid-mcp/converter";

function flowToReactFlow(diagram: FlowDiagram): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = diagram.nodes.map((n) => ({
    id: n.id,
    type: "flowchart",
    position: n.position,
    data: { label: n.label, shape: n.shape },
  }));
  const edges: Edge[] = diagram.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "flowchart",
    data: { edgeType: e.type },
  }));
  return { nodes, edges };
}

function reactFlowToFlow(nodes: Node[], edges: Edge[], direction: Direction): FlowDiagram {
  const flowNodes: FlowNode[] = nodes.map((n) => ({
    id: n.id,
    label: (n.data as { label: string }).label,
    shape: (n.data as { shape: string }).shape as FlowNode["shape"],
    position: n.position,
  }));
  const flowEdges: FlowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label as string | undefined,
    type: ((e.data as { edgeType?: string })?.edgeType as FlowEdge["type"]) || "arrow",
  }));
  return { direction, nodes: flowNodes, edges: flowEdges };
}

let edgeIdCounter = 0;

function EditorInner() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [title, setTitle] = useState("Software Design");
  const [direction, setDirection] = useState<Direction>("TD");
  const [version, setVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [mermaidCode, setMermaidCode] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitted">("idle");
  const [sessionEnded, setSessionEnded] = useState(false);

  const baselineRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const versionRef = useRef(0);
  const { record, undo, redo, reset: resetHistory, canUndo, canRedo } = useUndoRedo();

  // Poll server
  useEffect(() => {
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const data = await fetchDiagram();
          setConnected(true);
          if (data.session_ended) {
            setSessionEnded(true);
          } else if (data.version && data.version > versionRef.current && data.mermaid_code) {
            const diagram = parseMermaid(data.mermaid_code);
            const { nodes: newNodes, edges: newEdges } = flowToReactFlow(diagram);
            setNodes(newNodes);
            setEdges(newEdges);
            setDirection(diagram.direction);
            setVersion(data.version);
            versionRef.current = data.version;
            if (data.title) setTitle(data.title);
            baselineRef.current = { nodes: newNodes, edges: newEdges };
            resetHistory(); // Reset undo/redo on new diagram from Claude
            setSubmitStatus("idle");
            setSessionEnded(false);
          }
        } catch {
          setConnected(false);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => { active = false; };
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo(nodes, edges, setNodes, setEdges);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo(nodes, edges, setNodes, setEdges);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodes, edges, undo, redo]);

  // Update Mermaid preview on any change
  useEffect(() => {
    const diagram = reactFlowToFlow(nodes, edges, direction);
    setMermaidCode(toMermaid(diagram));
  }, [nodes, edges, direction]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      // Record for undo on position/remove changes
      if (changes.some((c) => c.type === "position" || c.type === "remove")) {
        record(nds, edges);
      }
      return updated;
    });
  }, [edges, record]);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      if (changes.some((c) => c.type === "remove")) {
        record(nodes, eds);
      }
      return updated;
    });
  }, [nodes, record]);
  const onConnect: OnConnect = useCallback(
    (params) => {
      record(nodes, edges);
      setEdges((eds) => addEdge({ ...params, id: `e_${++edgeIdCounter}`, type: "flowchart", data: { edgeType: "arrow" } }, eds));
    },
    [nodes, edges, record]
  );

  const handleSubmit = useCallback(async () => {
    const diagram = reactFlowToFlow(nodes, edges, direction);
    const code = toMermaid(diagram);
    await submitDiagram({
      nodes: diagram.nodes,
      edges: diagram.edges,
      mermaid_code: code,
      user_message: userMessage || undefined,
    });
    setSubmitStatus("submitted");
    setUserMessage("");
  }, [nodes, edges, direction, userMessage]);

  const handleReset = useCallback(() => {
    setNodes(baselineRef.current.nodes);
    setEdges(baselineRef.current.edges);
    setSubmitStatus("idle");
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title Bar */}
      <div style={{ padding: "8px 16px", background: "rgba(99,102,241,0.15)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#818cf8", fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: "0.75rem", color: connected ? "#34d399" : "#ef4444" }}>
          {sessionEnded ? "Session Ended" : connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar direction={direction} onDirectionChange={setDirection} onTogglePreview={() => setShowPreview((v) => !v)} showPreview={showPreview} onUndo={() => undo(nodes, edges, setNodes, setEdges)} onRedo={() => redo(nodes, edges, setNodes, setEdges)} canUndo={canUndo()} canRedo={canRedo()} />

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode="Delete"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        {showPreview && <MermaidPreview code={mermaidCode} />}
      </div>

      {/* Bottom Bar */}
      <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <input
          type="text"
          placeholder="Optional message for Claude..."
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          style={{ flex: 1, maxWidth: 400, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "6px 12px", fontSize: "0.8rem", color: "#e2e8f0", outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleReset} style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer" }}>
            Reset
          </button>
          <button onClick={handleSubmit} disabled={submitStatus === "submitted"} style={{ background: submitStatus === "submitted" ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.8)", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: submitStatus === "submitted" ? "default" : "pointer" }}>
            {submitStatus === "submitted" ? "Submitted — Waiting for Claude..." : "Submit to Claude"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 2: Build editor**

Run: `cd editor && npm run build`
Expected: Builds to `dist/editor/` without errors.

- [ ] **Step 3: Commit**

```bash
git add editor/src/App.tsx
git commit -m "feat: integrate full editor with polling, submit, reset, and Mermaid preview"
```

---

## Chunk 4: End-to-End Integration + Distribution

### Task 14: Build Pipeline + Entry Point

**Files:**
- Modify: `package.json` (add `bin` field and `start` script)

- [ ] **Step 1: Update package.json with bin entry**

Add to root `package.json`:
```json
{
  "bin": {
    "software-design-mermaid-mcp": "./dist/server/index.js"
  },
  "scripts": {
    "start": "node dist/server/index.js"
  }
}
```

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: Builds shared → server → editor all without errors.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add bin entry and start script for MCP server"
```

---

### Task 15: End-to-End Manual Test

- [ ] **Step 1: Test MCP server starts**

Run: `echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}},"id":1}' | node dist/server/index.js`
Expected: Returns JSON-RPC response with server info and tool list.

- [ ] **Step 2: Add installation instructions to README**

Create a minimal `README.md` with:
- What it does (one paragraph)
- Installation steps (`git clone`, `npm install`, `npm run build`)
- Usage: `claude mcp add software-design-mermaid node /path/to/dist/server/index.js`
- Available tools and their descriptions

- [ ] **Step 3: Commit**

```bash
git add README.md dist/editor/
git commit -m "chore: add README and pre-built editor for distribution"
```

---

### Task 16: Add .gitignore for dist/editor and final cleanup

- [ ] **Step 1: Verify .gitignore allows dist/editor/**

Check that `dist/editor/` is not in `.gitignore` (it shouldn't be — we want it committed).

- [ ] **Step 2: Run full test suite one more time**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and verify all tests pass"
```
