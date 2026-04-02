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
