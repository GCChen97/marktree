import type { Connection, Edge, Node } from '@xyflow/react';

export type GraphId = string;
export type NoteId = string;

export type JumpLinkData = {
  targetGraphId: GraphId | null;
};

export type KnowledgeNodeData = {
  title: string;
  noteId: NoteId | null;
  kind?: 'default' | 'jump';
  jumpLink?: JumpLinkData;
  label?: string;
  targetGraphTitle?: string | null;
  targetGraphMissing?: boolean;
  canEnterLinkedGraph?: boolean;
  onEnterLinkedGraph?: ((targetGraphId: GraphId) => void) | null;
  isEditingTitle?: boolean;
  onStartTitleEdit?: ((nodeId: string) => void) | null;
  onCommitTitleEdit?: ((nodeId: string, title: string) => void) | null;
  onCancelTitleEdit?: (() => void) | null;
};

export type KnowledgeNode = Node<KnowledgeNodeData>;

export type KnowledgeEdge = Edge;

export type NoteRecord = {
  id: NoteId;
  title: string;
  content: string;
};

export type GraphDocument = {
  id: GraphId;
  title: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

export type WorkspaceState = {
  version: 3;
  graphs: Record<GraphId, GraphDocument>;
  notes: Record<NoteId, NoteRecord>;
  graphOrder: GraphId[];
  noteOrder: NoteId[];
  currentGraphId: GraphId;
};

export type AppState = {
  workspace: WorkspaceState;
  selectedNodeId: string | null;
};

export type ExportedGraphData = {
  version: 3;
  graph: GraphDocument;
  notes: Record<NoteId, NoteRecord>;
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

export type EdgeConnection = Connection;
