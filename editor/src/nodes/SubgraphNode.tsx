import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";

function SubgraphNode({ data }: NodeProps) {
  const nodeData = data as { label: string };
  // Collapsed currently only affects visual styling (opacity, border, background).
  // Full child hiding would require propagating collapsed state to the graph model
  // so that child nodes/edges can be removed from the ReactFlow render tree.
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: collapsed ? "rgba(250, 204, 21, 0.03)" : "rgba(250, 204, 21, 0.08)",
        border: `1.5px dashed rgba(250, 204, 21, ${collapsed ? "0.2" : "0.4"})`,
        borderRadius: 8,
        position: "relative",
        opacity: collapsed ? 0.6 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -10,
          left: 12,
          background: "#1e1e2e",
          padding: "0 6px",
          fontSize: "0.7rem",
          color: "#facc15",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <button
          type="button"
          aria-label="Toggle subgraph"
          aria-expanded={!collapsed}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#facc15",
            cursor: "pointer",
            padding: 0,
            fontSize: "0.6rem",
            lineHeight: 1,
          }}
          title={collapsed ? "Expand subgraph" : "Collapse subgraph"}
        >
          {collapsed ? "\u25B6" : "\u25BC"}
        </button>
        {nodeData.label}
      </div>
    </div>
  );
}

export default memo(SubgraphNode);
