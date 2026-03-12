import { parseMermaid } from "@software-design-mermaid-mcp/converter";
import type { FlowNode, FlowEdge } from "@software-design-mermaid-mcp/converter";

export interface Submission {
  nodes: FlowNode[];
  edges: FlowEdge[];
  mermaid_code: string;
  user_message?: string;
}

export interface FeedbackSubmitted {
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

export interface FeedbackPending {
  status: "pending";
  message: string;
}

export interface CloseResult {
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
    this.title = null;
    this.description = null;
    this.submission = null;
    this.lastSubmittedMermaid = null;
    this.lastEditorPoll = 0;
    this.version = 0;
    this.sessionActive = false;
    this.sessionEnded = false;
  }
}
