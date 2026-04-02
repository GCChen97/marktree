import { useEffect, useState } from 'react';
import { createDefaultGraphState } from '../data/defaultGraph';
import type { GraphState } from '../types/graph';
import { exportGraphData, parseGraphDataString } from '../utils/graph';

export const GRAPH_STORAGE_KEY = 'mymind.phase4.graph';

function readStoredGraph(): GraphState {
  const fallbackGraph = createDefaultGraphState();

  if (typeof window === 'undefined') {
    return fallbackGraph;
  }

  const rawValue = window.localStorage.getItem(GRAPH_STORAGE_KEY);

  if (!rawValue) {
    return fallbackGraph;
  }

  const parsed = parseGraphDataString(rawValue);

  if (!parsed.data) {
    return fallbackGraph;
  }

  return {
    nodes: parsed.data.nodes,
    edges: parsed.data.edges,
    notes: parsed.data.notes,
    selectedNodeId: null,
  };
}

export function usePersistentGraphState() {
  const [graph, setGraph] = useState<GraphState>(() => readStoredGraph());

  useEffect(() => {
    window.localStorage.setItem(
      GRAPH_STORAGE_KEY,
      JSON.stringify(exportGraphData(graph)),
    );
  }, [graph.edges, graph.nodes, graph.notes]);

  return {
    graph,
    setGraph,
  };
}
