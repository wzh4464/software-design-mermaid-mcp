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
  - `GET /api/diagram` — returns current diagram state + version counter (editor polls this)
  - `POST /api/submission` — receives user's edited diagram submission
  - `GET /api/status` — health check + connection tracking (editor considered connected if polled within last 5s)

**CORS:** Not needed in production — the editor is served as static files from the same origin. During development (Vite dev server on a different port), the HTTP server enables CORS for `localhost:*`.

### 3. Web Editor (`editor/`)

- React + React Flow + Vite
- Pre-built and committed to `dist/editor/` (no build step needed at runtime)
- Polls `GET /api/diagram` every 2s for Claude's updates (version-gated)

### 4. Mermaid Converter (`shared/converter/`)

- Lives in `shared/converter/` as a workspace package (`@software-design-mermaid-mcp/converter`)
- Consumed by both the MCP server and the editor via npm workspaces
- The monorepo uses npm workspaces with three packages: `server` (root), `editor/`, and `shared/`
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
  url: string;              // e.g. "http://localhost:54321"
  editor_connected: boolean; // false on first call (browser not yet open), true on subsequent calls if editor is polling
  message: "Diagram opened in browser. Call get_diagram_feedback() to get user's changes.";
}
```

**Behavior:** First call opens browser automatically. Subsequent calls update the diagram in-place (editor detects via version counter on its polling endpoint). If a previous session has pending (unread) user feedback, it is discarded and replaced by the new diagram. Only one diagram session is active at a time (single-session model for MVP).

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
  final_mermaid: string;    // last submitted version, or original if never submitted
  message: "Editor closed.";
}

// Output (no active session)
{
  success: false;
  message: "No active diagram session.";
}
```

**Behavior:** Returns the last submitted Mermaid code. If the user never submitted, returns the original diagram from the last `show_diagram()` call. The browser is notified via the next poll and shows a "Session ended" message. The HTTP server shuts down.

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
  subgraphs?: Subgraph[];  // post-MVP: not supported in editor UI for v1
}

// Post-MVP: parser recognizes subgraphs but editor renders them as flat nodes in v1
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
- Ctrl+Z / Ctrl+Y → undo / redo (local to current editing session; reset when Claude sends a new diagram; lost on page refresh)

**Submit flow:**
1. User edits diagram
2. (Optional) types a message for Claude
3. Clicks "Submit to Claude"
4. Editor serializes graph → Mermaid code
5. `POST /api/submission` to server
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
  Web Editor → POST /api/submission → MCP Server (stores pending feedback)
  Claude → get_diagram_feedback() → MCP Server → returns updated mermaid

Round 2:
  Claude → show_diagram(updated_mermaid) → MCP Server → editor polls, picks up new version
  User edits again...
  (repeat)

End:
  Claude → close_diagram() → MCP Server → returns final mermaid, shuts down HTTP server
```

## State Management

### Session Lifecycle

- Only **one diagram session** is active at a time (single-session model for MVP)
- `show_diagram()` creates or replaces the current session. Any pending user feedback from the previous session is discarded.
- The `version` counter starts at 1 and increments each time Claude calls `show_diagram()`.
- `get_diagram_feedback()` returns `"pending"` if no submission exists, or `"submitted"` with the user's changes. After being read, the submission is cleared (one-shot read).
- `close_diagram()` returns the last submitted Mermaid code (or the original if user never submitted). If no session is active, returns an error.

### Changes Summary Computation

- The **server** computes `changes_summary` by diffing the user's submitted graph against the last diagram Claude sent via `show_diagram()`.
- Diff is computed by **node `id`** and **edge `id`** comparison. Node identity is the `id` string, not the label.
- This baseline is always the most recent `show_diagram()` input.

### Connection Tracking

- The server tracks the timestamp of the editor's last `GET /api/diagram` poll.
- The editor is considered **connected** if it polled within the last 5 seconds.
- The `show_diagram()` tool response includes `editor_connected: boolean`.

## Editor ↔ Server Communication

- **Editor → Server:** `POST /api/submission` with `{ nodes, edges, mermaid_code, user_message? }`
- **Server → Editor:** `GET /api/diagram` polled every 2s, response includes `version` counter
- Editor only updates canvas when `version` increments (i.e., Claude sent a new diagram)
- Claude's diagram updates flow through in-memory state (MCP server writes directly to state, not via HTTP API)

## Project Structure

```
software-design-mermaid-mcp/
├── package.json              # Root: npm workspaces, MCP server entry + scripts
├── tsconfig.json
├── src/                      # MCP server source
│   ├── index.ts              # MCP server entry (stdio)
│   ├── server.ts             # HTTP server (serves editor + REST API)
│   ├── tools.ts              # MCP tool definitions
│   └── state.ts              # Diagram state management
├── shared/                   # Shared workspace package (@software-design-mermaid-mcp/converter)
│   ├── package.json
│   └── converter/
│       ├── parser.ts         # Mermaid code → nodes/edges
│       ├── serializer.ts     # nodes/edges → Mermaid code
│       └── types.ts          # FlowNode, FlowEdge, FlowDiagram interfaces
├── editor/                   # React Flow editor (Vite project, workspace package)
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

**Note:** Build artifacts in `dist/` are committed for zero-build-step runtime. A `postinstall` script (`npm run build:editor`) is provided as an alternative. Add `.gitattributes` with `dist/ linguist-generated=true` to keep diffs clean.

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
