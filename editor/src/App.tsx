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
import { parseMermaid, toMermaid, type FlowDiagram, type FlowNode, type FlowEdge, type Subgraph } from "@software-design-mermaid-mcp/converter";
import { fetchDiagram, submitDiagram } from "./api.js";
import { nodeTypes } from "./nodes/index.js";
import { edgeTypes } from "./edges/index.js";
import Toolbar from "./toolbar/Toolbar.js";
import MermaidPreview from "./preview/MermaidPreview.js";
import { useUndoRedo } from "./hooks/useUndoRedo.js";
import { applyDagreLayout } from "./layout/dagre.js";
import type { Direction } from "@software-design-mermaid-mcp/converter";

function flowToReactFlow(diagram: FlowDiagram, direction: Direction): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = diagram.nodes.map((n) => ({
    id: n.id,
    type: "flowchart",
    position: n.position,
    data: { label: n.label, shape: n.shape, direction },
  }));
  const edges: Edge[] = diagram.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "flowchart",
    data: { edgeType: e.type },
  }));
  // Apply dagre layout
  const laidOutNodes = applyDagreLayout(nodes, edges, direction, diagram.subgraphs);
  return { nodes: laidOutNodes, edges };
}

function reactFlowToFlow(nodes: Node[], edges: Edge[], direction: Direction): FlowDiagram {
  // Reconstruct subgraphs from parentId relationships
  const subgraphMap = new Map<string, Subgraph>();
  const flowNodes: FlowNode[] = [];

  for (const n of nodes) {
    if (n.type === "subgraphGroup") {
      subgraphMap.set(n.id, {
        id: n.id,
        label: (n.data as { label: string }).label,
        nodeIds: [],
      });
      continue;
    }
    flowNodes.push({
      id: n.id,
      label: (n.data as { label: string }).label,
      shape: (n.data as { shape: string }).shape as FlowNode["shape"],
      position: n.position,
    });
    if (n.parentId && subgraphMap.has(n.parentId)) {
      subgraphMap.get(n.parentId)!.nodeIds.push(n.id);
    }
  }

  const flowEdges: FlowEdge[] = edges.map((e) => {
    const data = e.data as { edgeType?: string; __updatedLabel?: string } | undefined;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: data?.__updatedLabel ?? (e.label as string | undefined),
      type: (data?.edgeType as FlowEdge["type"]) || "arrow",
    };
  });

  const subgraphs = Array.from(subgraphMap.values()).filter((sg) => sg.nodeIds.length > 0);
  return { direction, nodes: flowNodes, edges: flowEdges, ...(subgraphs.length > 0 ? { subgraphs } : {}) };
}

let edgeIdCounter = 0;

function EditorInner() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [title, setTitle] = useState("Software Design");
  const [description, setDescription] = useState<string | null>(null);
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
            const { nodes: newNodes, edges: newEdges } = flowToReactFlow(diagram, diagram.direction);
            setNodes(newNodes);
            setEdges(newEdges);
            setDirection(diagram.direction);
            setVersion(data.version);
            versionRef.current = data.version;
            if (data.title) setTitle(data.title);
            setDescription(data.description || null);
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

  // Update direction in node data when direction changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.type === "flowchart"
          ? { ...n, data: { ...n.data, direction } }
          : n
      )
    );
  }, [direction]);

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

  const handleAutoLayout = useCallback(() => {
    record(nodes, edges);
    const regularNodes = nodes.filter((n) => n.type !== "subgraphGroup");
    const laidOut = applyDagreLayout(regularNodes, edges, direction);
    setNodes(laidOut);
  }, [nodes, edges, direction, record]);

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
        <div>
          <span style={{ color: "#818cf8", fontWeight: 600 }}>{title}</span>
          {description && <span style={{ color: "#94a3b8", fontSize: "0.75rem", marginLeft: 12 }}>{description}</span>}
        </div>
        <span style={{ fontSize: "0.75rem", color: connected ? "#34d399" : "#ef4444" }}>
          {sessionEnded ? "Session Ended" : connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar direction={direction} onDirectionChange={setDirection} onTogglePreview={() => setShowPreview((v) => !v)} showPreview={showPreview} onUndo={() => undo(nodes, edges, setNodes, setEdges)} onRedo={() => redo(nodes, edges, setNodes, setEdges)} canUndo={canUndo()} canRedo={canRedo()} onAutoLayout={handleAutoLayout} />

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
            {submitStatus === "submitted" ? "Submitted -- Waiting for Claude..." : "Submit to Claude"}
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
