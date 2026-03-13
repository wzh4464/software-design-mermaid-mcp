# Software Design Mermaid MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP server that brings **interactive visual diagram editing** to Claude Code. When Claude generates a Mermaid flowchart, it opens a browser-based drag-and-drop editor where you can rearrange nodes, edit labels, add/remove elements, and submit changes back — enabling multi-round visual collaboration.

## Features

- **Drag-and-drop editor** — Full React Flow canvas with zoom, pan, minimap, and grid snapping
- **5 node shapes** — Rectangle, rounded, diamond, circle, stadium — each with distinct colors
- **3 edge types** — Arrow, dotted, thick — with inline label editing
- **Live Mermaid preview** — See the Mermaid code update as you edit
- **Multi-round iteration** — Submit edits to Claude, get an updated diagram, repeat
- **Undo/redo** — Ctrl+Z / Ctrl+Y with full history
- **Zero config** — Starts a local HTTP server on a random port, opens browser automatically

## Quick Start

### Claude Code

```bash
# Clone and build
git clone https://github.com/wzh4464/software-design-mermaid-mcp.git
cd software-design-mermaid-mcp
npm install && npm run build

# Register with Claude Code
claude mcp add software-design-mermaid node $(pwd)/dist/server/index.js
```

### VS Code with Claude Extension

Add to your VS Code settings JSON:

```json
{
  "claude.mcpServers": {
    "software-design-mermaid": {
      "command": "node",
      "args": ["/absolute/path/to/software-design-mermaid-mcp/dist/server/index.js"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "software-design-mermaid": {
      "command": "node",
      "args": ["/absolute/path/to/software-design-mermaid-mcp/dist/server/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `show_diagram` | Display a Mermaid flowchart in the visual editor. Opens the browser automatically. | `mermaid_code` (required), `title`, `description` |
| `get_diagram_feedback` | Poll for user's edits. Returns `submitted` with updated Mermaid code and changes summary, or `pending`. One-shot read semantics. | None |
| `close_diagram` | Close the editor session. Returns final Mermaid code. | None |

## How It Works

```
Claude                    MCP Server                 Browser Editor
  │                          │                            │
  │── show_diagram() ───────>│                            │
  │                          │── starts HTTP server ─────>│
  │                          │── opens browser ──────────>│
  │<── { url, success } ─────│                            │
  │                          │<── polls /api/diagram ─────│
  │                          │── returns mermaid code ───>│
  │                          │                            │ user edits...
  │                          │<── POST /api/submission ───│
  │── get_diagram_feedback()>│                            │
  │<── { mermaid, changes } ─│                            │
  │                          │                            │
  │── show_diagram() ───────>│  (iterate with new code)   │
  │   ...repeat...           │                            │
```

## Architecture

TypeScript monorepo with npm workspaces:

- **`shared/`** — Mermaid parser & serializer (bidirectional `FlowDiagram` ↔ Mermaid code)
- **`src/`** — MCP server (stdio), HTTP server (REST API), diagram state management
- **`editor/`** — React Flow visual editor (pre-built in `dist/editor/`)

## Development

```bash
npm install          # Install all workspace dependencies
npm test             # Run all tests (42 tests across 4 suites)
npm run build        # Build shared → server → editor
npm run dev:editor   # Editor dev mode with hot reload
```

## License

[MIT](LICENSE)
