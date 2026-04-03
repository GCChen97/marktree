import type { Edge, Node } from '@xyflow/react';

export type GraphId = string;

export type JumpLinkData = {
  targetGraphId: GraphId | null;
};

export type KnowledgeNodeData = {
  title: string;
  noteId: string;
  kind?: 'default' | 'jump';
  jumpLink?: JumpLinkData;
  label?: string;
  targetGraphTitle?: string | null;
  targetGraphMissing?: boolean;
  canEnterLinkedGraph?: boolean;
  onEnterLinkedGraph?: ((targetGraphId: GraphId) => void) | null;
};

export type KnowledgeNode = Node<KnowledgeNodeData>;

export type KnowledgeEdge = Edge;

export type NoteRecord = {
  id: string;
  title: string;
  content: string;
};

export type GraphDocument = {
  id: GraphId;
  title: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  notes: Record<string, NoteRecord>;
};

export type WorkspaceState = {
  version: 2;
  graphs: Record<GraphId, GraphDocument>;
  graphOrder: GraphId[];
  currentGraphId: GraphId;
};

export type AppState = {
  workspace: WorkspaceState;
  selectedNodeId: string | null;
};

export type LegacyGraphData = {
  version: 1;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  notes: Record<string, NoteRecord>;
};

export type ExportedGraphData = {
  version: 2;
  graph: GraphDocument;
};

export type ExportedWorkspaceData = WorkspaceState;

export type GraphReferenceRecord = {
  sourceGraphId: GraphId;
  sourceGraphTitle: string;
  nodeId: string;
  nodeTitle: string;
};

export type GraphReferenceIndex = Record<GraphId, GraphReferenceRecord[]>;

export type CanvasViewportApi = {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerOnNode: (node: KnowledgeNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
};
