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
