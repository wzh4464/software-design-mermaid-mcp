import { useState, useEffect } from "react";
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
