# Software Design Mermaid MCP

An MCP (Model Context Protocol) server that enables AI assistants to display Mermaid flowchart diagrams in an interactive, browser-based drag-and-drop editor. When the AI calls `show_diagram`, a local HTTP server launches and opens a React Flow editor in the browser where the user can visually rearrange nodes, edit labels, change shapes, add or remove elements, and submit their changes back to the AI.

## Installation

```bash
git clone https://github.com/anthropics/software-design-mermaid-mcp.git
cd software-design-mermaid-mcp
npm install
npm run build
```

## Usage with Claude Code

Register the MCP server with Claude Code:

```bash
claude mcp add software-design-mermaid node /absolute/path/to/software-design-mermaid-mcp/dist/server/index.js
```

Or run directly:

```bash
node dist/server/index.js
```

## Available Tools

### `show_diagram`

Display a Mermaid flowchart in a visual drag-and-drop editor. Opens a browser-based editor where the user can visually edit the diagram. Call `get_diagram_feedback()` afterwards to retrieve the user's changes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `mermaid_code` | string | Yes | Mermaid flowchart code (e.g., `graph TD\n  A[Start] --> B[End]`) |
| `title` | string | No | Title shown in the editor header |
| `description` | string | No | Context description shown to the user |

### `get_diagram_feedback`

Poll for user's diagram edits. Returns `submitted` with updated Mermaid code and a changes summary if the user has submitted, or `pending` if they are still editing. Submission is one-shot: cleared after reading.

**Parameters:** None

### `close_diagram`

Close the diagram editor session. Returns the final Mermaid code (last submitted version, or original if never submitted). Shuts down the local HTTP server.

**Parameters:** None

## Architecture

This is a TypeScript monorepo with npm workspaces:

- **`shared/`** -- Mermaid flowchart parser and serializer (converts between Mermaid code and a structured node/edge graph)
- **`src/`** -- MCP server with stdio transport, HTTP server for the editor, and diagram state management
- **`editor/`** -- React Flow-based visual diagram editor (pre-built output in `dist/editor/`)

## Development

```bash
# Run tests
npm test

# Build all workspaces
npm run build

# Dev mode for editor (with hot reload)
npm run dev:editor
```

## License

MIT
