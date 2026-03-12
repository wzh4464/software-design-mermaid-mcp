# Software Design Mermaid MCP — Design Spec

## Overview

An MCP server that provides a visual drag-and-drop flowchart editor during Claude Code planning sessions. Claude sends Mermaid diagram code, the MCP opens a local web-based editor where the user can visually edit the diagram, and the updated Mermaid code is returned to Claude for multi-round iteration.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tech stack | TypeScript / Node.js | Best MCP SDK support, npm ecosystem, Mermaid.js is JS-native |
| Editor library | React Flow (xyflow) | Purpose-built for node diagrams, lightweight (~200KB), built-in drag/connect/zoom |
| Feedback mechanism | Polling | MCP tools are request-response; `get_diagram_feedback()` polls for user submissions |
| Diagram types (MVP) | Flowchart only | Covers 90% of software architecture design; bounded scope |
| Output format | Mermaid code | Compact, Claude-native, pasteable into plan documents |
| Distribution | GitHub clone + local run | `claude mcp add ./path` after cloning |
| Interaction model | Multi-round iteration | Claude sends → user edits → submit → Claude updates → repeat |

## Architecture

### System Components

```
┌─────────────┐     stdio      ┌─────────────┐    HTTP     ┌─────────────┐
│  Claude Code │◄──────────────►│  MCP Server  │◄──────────►│  Web Editor  │
│  (plan mode) │  MCP protocol  │  (Node.js)   │  REST API  │ (React Flow) │
└─────────────┘                └─────────────┘            └─────────────┘
                                      │                          │
                                      └──────────┬───────────────┘
                                                 │
                                          ┌──────┴──────┐
                                          │   Mermaid    │
                                          │  Converter   │
                                          │ (shared lib) │
                                          └─────────────┘
```

### 1. MCP Server (`src/index.ts`)

- Communicates with Claude Code via stdio (MCP protocol)
- Exposes 3 tools (see Tool API below)
- Spawns the HTTP server on first `show_diagram` call

### 2. HTTP Server (`src/server.ts`)

- Dynamic port (auto-assigned, avoids conflicts)
- Serves the pre-built React Flow editor as static files from `dist/editor/`
- REST API endpoints:
  - `GET /api/diagram` — returns current diagram state + version counter
  - `POST /api/diagram` — receives user's edited diagram
  - `GET /api/status` — health check

### 3. Web Editor (`editor/`)

- React + React Flow + Vite
- Pre-built and committed to `dist/editor/` (no build step needed at runtime)
- Polls `GET /api/diagram` every 2s for Claude's updates (version-gated)

### 4. Mermaid Converter (`src/converter/`)

- Shared module used by both server and editor
- `parseMermaid(code: string): FlowDiagram` — Mermaid flowchart → internal model
- `toMermaid(diagram: FlowDiagram): string` — internal model → Mermaid code

## MCP Tool API

### `show_diagram`

```typescript
// Input
{
  mermaid_code: string;    // Mermaid flowchart code
  title?: string;          // Shown in editor header
  description?: string;    // Context for the user
}

// Output
{
  success: true;
  url: string;             // e.g. "http://localhost:54321"
  message: "Diagram opened in browser. Call get_diagram_feedback() to get user's changes.";
}
```

**Behavior:** First call opens browser automatically. Subsequent calls update the diagram in-place (editor detects via version counter on its polling endpoint).

### `get_diagram_feedback`

```typescript
// Input: (none)

// Output (user submitted)
{
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

// Output (user still editing)
{
  status: "pending";
  message: "User is still editing. Try again later.";
}
```

### `close_diagram`

```typescript
// Input: (none)

// Output
{
  success: true;
  final_mermaid: string;
  message: "Editor closed.";
}
```

## Internal Data Model

```typescript
interface FlowNode {
  id: string;
  label: string;
  shape: "rect" | "rounded" | "diamond" | "circle" | "stadium";
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: "arrow" | "dotted" | "thick";
}

interface FlowDiagram {
  direction: "TD" | "LR" | "BT" | "RL";
  nodes: FlowNode[];
  edges: FlowEdge[];
  subgraphs?: Subgraph[];
}

interface Subgraph {
  id: string;
  label: string;
  nodeIds: string[];
}
```

## Mermaid Parser — Supported Syntax

**Node shapes:**

| Mermaid Syntax | Shape | Rendering |
|---|---|---|
| `A[text]` | rect | Rectangle |
| `A(text)` | rounded | Rounded rectangle |
| `A{text}` | diamond | Diamond (1:1 aspect ratio) |
| `A((text))` | circle | Circle |
| `A([text])` | stadium | Stadium/pill shape |

**Edge types:**

| Mermaid Syntax | Type |
|---|---|
| `-->` | arrow |
| `-.->` | dotted |
| `==>` | thick |
| `--\|label\|` | arrow with label |

**Other:**
- `graph TD` / `graph LR` / `graph BT` / `graph RL` — direction
- `subgraph name ... end` — node grouping

## Web Editor UI

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Title Bar: "Software Design — {title}"      [Connected ●]  │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: [+Rect][+Rounded][+Diamond][+Circle][+Stadium]    │
│          | [Delete][Undo][Redo] | [TD↕][LR→] | [Preview▾]  │
├───────────────────────────────────────────┬──────────────────┤
│                                           │ Live Mermaid     │
│           React Flow Canvas               │ Preview          │
│      (drag, connect, edit nodes)          │ (auto-updates)   │
│                                           │                  │
│                              [Minimap]    │                  │
├───────────────────────────────────────────┴──────────────────┤
│ [Message for Claude...                ] [Reset] [Submit ▶]   │
└─────────────────────────────────────────────────────────────┘
```

### User Interactions

**Canvas:**
- Click toolbar button → add new node at center
- Drag node → reposition
- Double-click node → edit label inline
- Drag from node handle → create new edge
- Click edge → select; double-click → edit label
- Select + Delete key → remove node/edge
- Scroll → zoom in/out
- Drag canvas → pan
- Ctrl+Z / Ctrl+Y → undo / redo

**Submit flow:**
1. User edits diagram
2. (Optional) types a message for Claude
3. Clicks "Submit to Claude"
4. Editor serializes graph → Mermaid code
5. `POST /api/diagram` to server
6. Button shows "Submitted — Waiting for Claude..."
7. Editor polls `GET /api/diagram` for Claude's next update
8. "Reset" reverts to last Claude-sent version

### Node Shape Rendering

- Diamond nodes render with **1:1 aspect ratio** (square rotated 45°)
- All nodes have colored borders matching their type
- Selected nodes show a highlight glow

## Data Flow

```
Round 1:
  Claude → show_diagram(mermaid) → MCP Server → opens browser → Web Editor
  User drags, edits, connects...
  Web Editor → POST /api/diagram → MCP Server (stores pending feedback)
  Claude → get_diagram_feedback() → MCP Server → returns updated mermaid

Round 2:
  Claude → show_diagram(updated_mermaid) → MCP Server → editor polls, picks up new version
  User edits again...
  (repeat)

End:
  Claude → close_diagram() → MCP Server → returns final mermaid, shuts down HTTP server
```

## Editor ↔ Server Communication

- **Editor → Server:** `POST /api/diagram` with `{ nodes, edges, mermaid_code, user_message? }`
- **Server → Editor:** `GET /api/diagram` polled every 2s, response includes `version` counter
- Editor only updates canvas when `version` increments (i.e., Claude sent a new diagram)

## Project Structure

```
software-design-mermaid-mcp/
├── package.json              # MCP server entry + scripts
├── tsconfig.json
├── src/
│   ├── index.ts              # MCP server entry (stdio)
│   ├── server.ts             # HTTP server (serves editor + REST API)
│   ├── tools.ts              # MCP tool definitions
│   ├── state.ts              # Diagram state management
│   └── converter/
│       ├── parser.ts         # Mermaid code → nodes/edges
│       └── serializer.ts     # nodes/edges → Mermaid code
├── editor/                   # React Flow editor (Vite project)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx           # Main editor layout
│       ├── nodes/            # Custom node components
│       ├── edges/            # Custom edge components
│       ├── toolbar/          # Toolbar (add, delete, undo/redo)
│       ├── preview/          # Live Mermaid code preview
│       └── api.ts            # HTTP client for server communication
└── dist/                     # Pre-built editor (committed to repo)
    └── editor/               # Static files served by HTTP server
```

## Installation

```bash
git clone <repo-url> software-design-mermaid-mcp
cd software-design-mermaid-mcp
npm install
npm run build
claude mcp add software-design-mermaid ./dist/index.js
```

## Testing Strategy

- **Mermaid converter:** Unit tests for parser and serializer (round-trip: parse → serialize → parse should be idempotent)
- **MCP tools:** Integration tests with mock MCP client
- **HTTP API:** Integration tests for REST endpoints
- **Editor:** Manual testing for drag-and-drop interactions

## Error Handling

- **Port conflict:** Auto-retry with next available port
- **Invalid Mermaid input:** Return parse error with line number to Claude
- **Browser fails to open:** Return URL in tool response, user can open manually
- **Editor disconnected:** Show reconnection banner, auto-reconnect on next poll
