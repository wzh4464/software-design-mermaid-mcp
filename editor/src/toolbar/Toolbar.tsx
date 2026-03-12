import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { NodeShape, Direction } from "@software-design-mermaid-mcp/converter";

interface ToolbarProps {
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  onTogglePreview: () => void;
  showPreview: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

let nodeIdCounter = 0;
function nextNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

export default function Toolbar({ direction, onDirectionChange, onTogglePreview, showPreview, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
  const { addNodes, getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const addNode = useCallback(
    (shape: NodeShape) => {
      const id = nextNodeId();
      addNodes({
        id,
        type: "flowchart",
        position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
        data: { label: `New ${shape}`, shape },
      });
    },
    [addNodes]
  );

  const deleteSelected = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes(nodes.filter((n) => !n.selected));
    setEdges(edges.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
  }, [getNodes, getEdges, setNodes, setEdges]);

  const btnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "#c8d6e5",
    padding: "4px 10px",
    borderRadius: 4,
    fontSize: "0.75rem",
    cursor: "pointer",
  };

  const sep = <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
      <button style={btnStyle} onClick={() => addNode("rect")}>+ Rect</button>
      <button style={btnStyle} onClick={() => addNode("rounded")}>+ Rounded</button>
      <button style={btnStyle} onClick={() => addNode("diamond")}>+ Diamond</button>
      <button style={btnStyle} onClick={() => addNode("circle")}>+ Circle</button>
      <button style={btnStyle} onClick={() => addNode("stadium")}>+ Stadium</button>
      {sep}
      <button style={btnStyle} onClick={deleteSelected}>Delete</button>
      <button style={{ ...btnStyle, opacity: canUndo ? 1 : 0.4 }} onClick={onUndo} disabled={!canUndo}>Undo</button>
      <button style={{ ...btnStyle, opacity: canRedo ? 1 : 0.4 }} onClick={onRedo} disabled={!canRedo}>Redo</button>
      {sep}
      <button style={{ ...btnStyle, background: direction === "TD" ? "rgba(99,102,241,0.3)" : undefined }} onClick={() => onDirectionChange("TD")}>TD</button>
      <button style={{ ...btnStyle, background: direction === "LR" ? "rgba(99,102,241,0.3)" : undefined }} onClick={() => onDirectionChange("LR")}>LR</button>
      <div style={{ flex: 1 }} />
      <button style={{ ...btnStyle, background: showPreview ? "rgba(99,102,241,0.3)" : undefined }} onClick={onTogglePreview}>
        Mermaid {showPreview ? "\u25BE" : "\u25B8"}
      </button>
    </div>
  );
}
