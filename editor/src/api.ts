const API_BASE = "";

export interface DiagramResponse {
  version: number;
  mermaid_code?: string;
  title?: string;
  description?: string;
  session_ended?: boolean;
}

export interface SubmissionPayload {
  nodes: Array<{ id: string; label: string; shape: string; position: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string; label?: string; type: string }>;
  mermaid_code: string;
  user_message?: string;
}

export async function fetchDiagram(): Promise<DiagramResponse> {
  const res = await fetch(`${API_BASE}/api/diagram`);
  return res.json();
}

export async function submitDiagram(payload: SubmissionPayload): Promise<void> {
  await fetch(`${API_BASE}/api/submission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
