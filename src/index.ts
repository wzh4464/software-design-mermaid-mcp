#!/usr/bin/env node
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
