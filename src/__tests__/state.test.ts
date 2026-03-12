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
