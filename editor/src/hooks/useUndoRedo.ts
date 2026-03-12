import { useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

export function useUndoRedo(maxHistory = 50) {
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const skipRecording = useRef(false);

  const record = useCallback((nodes: Node[], edges: Edge[]) => {
    if (skipRecording.current) {
      skipRecording.current = false;
      return;
    }
    history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    if (history.current.length > maxHistory) history.current.shift();
    future.current = [];
  }, [maxHistory]);

  const undo = useCallback((
    currentNodes: Node[],
    currentEdges: Edge[],
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void
  ) => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push({ nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) });
    skipRecording.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, []);

  const redo = useCallback((
    currentNodes: Node[],
    currentEdges: Edge[],
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void
  ) => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push({ nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) });
    skipRecording.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
  }, []);

  const reset = useCallback(() => {
    history.current = [];
    future.current = [];
  }, []);

  const canUndo = useCallback(() => history.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { record, undo, redo, reset, canUndo, canRedo };
}
