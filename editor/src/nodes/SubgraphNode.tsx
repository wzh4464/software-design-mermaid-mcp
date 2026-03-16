import { type MouseEvent, memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";

function SubgraphNode({ id, data }: NodeProps) {
  const nodeData = data as { label: string; collapsed?: boolean };
  const collapsed = nodeData.collapsed ?? false;
  const { setNodes } = useReactFlow();

  const toggleCollapsed = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, collapsed: !collapsed } }
            : n,
        ),
      );
    },
    [id, collapsed, setNodes],
  );
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
          aria-label="Toggle subgraph visual collapse"
          aria-pressed={collapsed}
          onClick={toggleCollapsed}
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
