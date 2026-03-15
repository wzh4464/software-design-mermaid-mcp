import { memo, useState, useCallback, Fragment, type ChangeEvent, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Direction } from "@software-design-mermaid-mcp/converter";

export interface FlowchartNodeData {
  label: string;
  shape: "rect" | "rounded" | "diamond" | "circle" | "stadium";
  direction?: Direction;
  [key: string]: unknown;
}

const SHAPE_STYLES: Record<string, React.CSSProperties> = {
  rect: { borderRadius: 4 },
  rounded: { borderRadius: 12 },
  diamond: { borderRadius: 4, transform: "rotate(45deg)", aspectRatio: "1/1" },
  circle: { borderRadius: "50%", aspectRatio: "1/1" },
  stadium: { borderRadius: 999 },
};

const SHAPE_COLORS: Record<string, string> = {
  rect: "#818cf8",
  rounded: "#10b981",
  diamond: "#f59e0b",
  circle: "#ec4899",
  stadium: "#8b5cf6",
};

function getHandlePositions(direction?: Direction): { target: Position; source: Position } {
  switch (direction) {
    case "LR": return { target: Position.Left, source: Position.Right };
    case "RL": return { target: Position.Right, source: Position.Left };
    case "BT": return { target: Position.Bottom, source: Position.Top };
    default: return { target: Position.Top, source: Position.Bottom };
  }
}

function renderLabel(label: string): React.ReactNode {
  const parts = label.split(/<br\s*\/?>/gi);
  if (parts.length === 1) return label;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <br />}
    </Fragment>
  ));
}

function FlowchartNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowchartNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const shape = nodeData.shape || "rect";
  const color = SHAPE_COLORS[shape];
  const isDiamond = shape === "diamond";
  const { target, source } = getHandlePositions(nodeData.direction);

  const handleDoubleClick = useCallback(() => setEditing(true), []);
  const handleBlur = useCallback(() => {
    setEditing(false);
    nodeData.label = label;
  }, [label, nodeData]);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      nodeData.label = label;
    }
    if (e.key === "Escape") {
      setLabel(nodeData.label);
      setEditing(false);
    }
  }, [label, nodeData]);

  const outerStyle: React.CSSProperties = {
    ...SHAPE_STYLES[shape],
    background: `${color}20`,
    border: `2px solid ${color}`,
    padding: isDiamond ? "20px" : "8px 16px",
    minWidth: isDiamond ? 60 : 80,
    minHeight: isDiamond ? 60 : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: selected ? `0 0 0 2px ${color}80` : undefined,
    cursor: "grab",
  };

  const textStyle: React.CSSProperties = isDiamond ? { transform: "rotate(-45deg)" } : {};

  return (
    <div style={outerStyle} onDoubleClick={handleDoubleClick}>
      <Handle type="target" position={target} style={{ background: color }} />
      <div style={textStyle}>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              background: "transparent",
              border: "none",
              color: "#e2e8f0",
              fontSize: "0.85rem",
              textAlign: "center",
              width: Math.max(60, label.length * 9),
              outline: "none",
            }}
          />
        ) : (
          <span style={{ fontSize: "0.85rem", color: "#e2e8f0", userSelect: "none", textAlign: "center", lineHeight: 1.4 }}>
            {renderLabel(label)}
          </span>
        )}
      </div>
      <Handle type="source" position={source} style={{ background: color }} />
    </div>
  );
}

export default memo(FlowchartNode);
