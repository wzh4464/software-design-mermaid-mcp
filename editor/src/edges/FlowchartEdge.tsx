import { memo, useState, useCallback, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

export interface FlowchartEdgeData {
  edgeType: "arrow" | "dotted" | "thick";
  [key: string]: unknown;
}

function FlowchartEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label, selected } = props;
  const edgeData = data as FlowchartEdgeData | undefined;
  const edgeType = edgeData?.edgeType || "arrow";
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState((label as string) || "");

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const strokeDasharray = edgeType === "dotted" ? "5 5" : undefined;
  const strokeWidth = edgeType === "thick" ? 3 : 1.5;
  const strokeColor = selected ? "#818cf8" : "#64748b";

  const handleDoubleClick = useCallback(() => setEditing(true), []);
  const handleBlur = useCallback(() => {
    setEditing(false);
    if (edgeData) (edgeData as Record<string, unknown>)["__updatedLabel"] = editLabel;
  }, [editLabel, edgeData]);
  const handleKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      if (edgeData) (edgeData as Record<string, unknown>)["__updatedLabel"] = editLabel;
    }
    if (e.key === "Escape") {
      setEditLabel((label as string) || "");
      setEditing(false);
    }
  }, [editLabel, edgeData, label]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd="url(#arrow)" style={{ stroke: strokeColor, strokeWidth, strokeDasharray }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            cursor: "pointer",
          }}
          onDoubleClick={handleDoubleClick}
        >
          {editing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEditLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{ background: "#1e1e2e", border: "1px solid #818cf8", color: "#e2e8f0", fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4, textAlign: "center", width: Math.max(40, editLabel.length * 8), outline: "none" }}
            />
          ) : (
            (label || editLabel) && <span style={{ background: "#1e1e2e", color: "#94a3b8", fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4, border: selected ? "1px solid #818cf8" : "1px solid transparent" }}>{editLabel || label}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(FlowchartEdge);
