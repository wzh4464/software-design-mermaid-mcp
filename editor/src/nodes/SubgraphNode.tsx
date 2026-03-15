import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

function SubgraphNode({ data }: NodeProps) {
  const nodeData = data as { label: string };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(250, 204, 21, 0.08)",
        border: "1.5px dashed rgba(250, 204, 21, 0.4)",
        borderRadius: 8,
        position: "relative",
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
        }}
      >
        {nodeData.label}
      </div>
    </div>
  );
}

export default memo(SubgraphNode);
