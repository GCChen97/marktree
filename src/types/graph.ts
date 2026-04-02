import type { Edge, Node } from '@xyflow/react';

export type KnowledgeNodeData = {
  title: string;
  noteId: string;
};

export type KnowledgeNode = Node<KnowledgeNodeData>;

export type KnowledgeEdge = Edge;

export type NoteRecord = {
  id: string;
  title: string;
  content: string;
};

export type GraphState = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  notes: Record<string, NoteRecord>;
  selectedNodeId: string | null;
};

export type PersistedGraphState = {
  version: 1;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  notes: Record<string, NoteRecord>;
};

export type ExportedGraphData = PersistedGraphState;

export type CanvasViewportApi = {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerOnNode: (node: KnowledgeNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
};
