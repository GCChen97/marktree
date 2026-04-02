import type {
  ExportedGraphData,
  GraphState,
  KnowledgeEdge,
  KnowledgeNode,
  NoteRecord,
  PersistedGraphState,
} from '../types/graph';

export const GRAPH_EXPORT_VERSION = 1 as const;

export const DEFAULT_NEW_NODE_POSITION = {
  x: 160,
  y: 120,
};

export const DEFAULT_NEW_NODE_TITLE = 'Untitled';

export const DEFAULT_NEW_NOTE_CONTENT = `# Untitled

在这里写内容。
`;

let nodeCounter = 0;

export function createNodeId() {
  nodeCounter += 1;
  return `node_${Date.now()}_${nodeCounter}`;
}

export function createDefaultNoteForNode(nodeId: string): NoteRecord {
  return {
    id: nodeId,
    title: DEFAULT_NEW_NODE_TITLE,
    content: DEFAULT_NEW_NOTE_CONTENT,
  };
}

export function createDefaultNodeAtPosition(
  nodeId: string,
  position: { x: number; y: number },
): KnowledgeNode {
  return {
    id: nodeId,
    position,
    data: {
      title: DEFAULT_NEW_NODE_TITLE,
      noteId: nodeId,
    },
  };
}

export function exportGraphData(graph: GraphState): ExportedGraphData {
  return {
    version: GRAPH_EXPORT_VERSION,
    nodes: graph.nodes,
    edges: graph.edges,
    notes: graph.notes,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidNode(node: unknown): node is KnowledgeNode {
  if (!isPlainObject(node)) {
    return false;
  }

  const data = node.data;
  const position = node.position;

  return (
    typeof node.id === 'string' &&
    isPlainObject(position) &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    isPlainObject(data) &&
    typeof data.title === 'string' &&
    typeof data.noteId === 'string'
  );
}

function isValidEdge(edge: unknown): edge is KnowledgeEdge {
  if (!isPlainObject(edge)) {
    return false;
  }

  return (
    typeof edge.id === 'string' &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string'
  );
}

function isValidNoteRecord(note: unknown): note is NoteRecord {
  if (!isPlainObject(note)) {
    return false;
  }

  return (
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    typeof note.content === 'string'
  );
}

type GraphParseError =
  | 'invalid_json'
  | 'invalid_root'
  | 'unsupported_version'
  | 'invalid_nodes'
  | 'invalid_edges'
  | 'invalid_notes'
  | 'invalid_note_record';

function formatGraphParseError(error: GraphParseError): string {
  switch (error) {
    case 'invalid_json':
      return '导入失败：文件不是合法的 JSON。';
    case 'invalid_root':
      return '导入失败：根对象结构无效。';
    case 'unsupported_version':
      return '导入失败：仅支持 version 1 的图谱文件。';
    case 'invalid_nodes':
      return '导入失败：nodes 结构无效。';
    case 'invalid_edges':
      return '导入失败：edges 结构无效。';
    case 'invalid_notes':
      return '导入失败：notes 结构无效。';
    case 'invalid_note_record':
      return '导入失败：某些 note 数据无效。';
  }
}

function validateGraphData(
  parsed: unknown,
): { data: PersistedGraphState | null; error: GraphParseError | null } {
  if (!isPlainObject(parsed)) {
    return {
      data: null,
      error: 'invalid_root',
    };
  }

  if (parsed.version !== GRAPH_EXPORT_VERSION) {
    return {
      data: null,
      error: 'unsupported_version',
    };
  }

  if (!Array.isArray(parsed.nodes) || !parsed.nodes.every(isValidNode)) {
    return {
      data: null,
      error: 'invalid_nodes',
    };
  }

  if (!Array.isArray(parsed.edges) || !parsed.edges.every(isValidEdge)) {
    return {
      data: null,
      error: 'invalid_edges',
    };
  }

  if (!isPlainObject(parsed.notes)) {
    return {
      data: null,
      error: 'invalid_notes',
    };
  }

  const notesEntries = Object.entries(parsed.notes);

  if (!notesEntries.every(([, note]) => isValidNoteRecord(note))) {
    return {
      data: null,
      error: 'invalid_note_record',
    };
  }

  return {
    data: {
      version: GRAPH_EXPORT_VERSION,
      nodes: parsed.nodes,
      edges: parsed.edges,
      notes: parsed.notes as Record<string, NoteRecord>,
    },
    error: null,
  };
}

export function parseGraphDataString(
  raw: string,
): { data: PersistedGraphState | null; error: GraphParseError | null } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      data: null,
      error: 'invalid_json',
    };
  }

  return validateGraphData(parsed);
}

export function parseImportedGraph(
  raw: string,
): { data: ExportedGraphData | null; error: string | null } {
  const parsed = parseGraphDataString(raw);

  if (parsed.data) {
    return {
      data: parsed.data,
      error: null,
    };
  }

  return {
    data: null,
    error: formatGraphParseError(parsed.error ?? 'invalid_root'),
  };
}
