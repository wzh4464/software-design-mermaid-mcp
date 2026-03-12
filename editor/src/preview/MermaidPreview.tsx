interface MermaidPreviewProps {
  code: string;
}

export default function MermaidPreview({ code }: MermaidPreviewProps) {
  return (
    <div style={{ width: 260, background: "rgba(255,255,255,0.03)", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Live Mermaid Preview
      </div>
      <pre style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: "0.75rem", lineHeight: 1.6, color: "#94a3b8", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
        {code || "No diagram loaded"}
      </pre>
      <div style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 8, textAlign: "center" }}>
        Auto-updates as you edit
      </div>
    </div>
  );
}
