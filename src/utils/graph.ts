import {
  DEFAULT_WORKSPACE_GRAPH_ID,
  createDefaultWorkspaceState,
} from '../data/defaultGraph';
import type {
  ExportedGraphData,
  ExportedWorkspaceData,
  GraphDocument,
  GraphId,
  GraphReferenceIndex,
  GraphReferenceRecord,
  KnowledgeEdge,
  KnowledgeNode,
  LegacyGraphData,
  NoteRecord,
  WorkspaceState,
} from '../types/graph';

export const LEGACY_GRAPH_EXPORT_VERSION = 1 as const;
export const WORKSPACE_EXPORT_VERSION = 2 as const;

export const DEFAULT_NEW_NODE_POSITION = {
  x: 160,
  y: 120,
};

export const DEFAULT_NEW_NODE_TITLE = 'Untitled';
export const DEFAULT_NEW_GRAPH_TITLE = 'Untitled Graph';

export const DEFAULT_NEW_NOTE_CONTENT = `# Untitled

在这里写内容。
`;

let nodeCounter = 0;
let graphCounter = 0;

export function createNodeId() {
  nodeCounter += 1;
  return `node_${Date.now()}_${nodeCounter}`;
}

export function createGraphId() {
  graphCounter += 1;
  return `graph_${Date.now()}_${graphCounter}`;
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
      kind: 'default',
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function isValidNode(node: unknown): node is KnowledgeNode {
  if (!isPlainObject(node)) {
    return false;
  }

  const data = node.data;
  const position = node.position;
  const jumpLink = isPlainObject(data) ? data.jumpLink : undefined;

  return (
    typeof node.id === 'string' &&
    isPlainObject(position) &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    isPlainObject(data) &&
    typeof data.title === 'string' &&
    typeof data.noteId === 'string' &&
    (data.kind === undefined ||
      data.kind === 'default' ||
      data.kind === 'jump') &&
    (jumpLink === undefined ||
      (isPlainObject(jumpLink) &&
        (typeof jumpLink.targetGraphId === 'string' ||
          jumpLink.targetGraphId === null)))
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

function isValidGraphDocument(graph: unknown): graph is GraphDocument {
  if (!isPlainObject(graph)) {
    return false;
  }

  return (
    typeof graph.id === 'string' &&
    typeof graph.title === 'string' &&
    Array.isArray(graph.nodes) &&
    graph.nodes.every(isValidNode) &&
    Array.isArray(graph.edges) &&
    graph.edges.every(isValidEdge) &&
    isPlainObject(graph.notes) &&
    Object.values(graph.notes).every(isValidNoteRecord)
  );
}

function sanitizeGraphDocument(graph: GraphDocument): GraphDocument {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      data: {
        title: node.data.title,
        noteId: node.data.noteId,
        kind: node.data.kind ?? 'default',
        jumpLink:
          node.data.kind === 'jump' || node.data.jumpLink
            ? {
                targetGraphId: node.data.jumpLink?.targetGraphId ?? null,
              }
            : undefined,
      },
    })),
  };
}

function sanitizeWorkspaceState(workspace: WorkspaceState): WorkspaceState {
  const graphEntries = workspace.graphOrder
    .map((graphId) => {
      const graph = workspace.graphs[graphId];

      return graph ? [graphId, sanitizeGraphDocument(graph)] : null;
    })
    .filter(Boolean) as Array<[GraphId, GraphDocument]>;

  if (graphEntries.length === 0) {
    return createDefaultWorkspaceState();
  }

  const graphs = Object.fromEntries(graphEntries) as Record<GraphId, GraphDocument>;
  const graphOrder = graphEntries.map(([graphId]) => graphId);
  const currentGraphId = graphs[workspace.currentGraphId]
    ? workspace.currentGraphId
    : graphOrder[0];

  return {
    version: WORKSPACE_EXPORT_VERSION,
    graphs,
    graphOrder,
    currentGraphId,
  };
}

export function wrapLegacyGraphAsWorkspace(legacyGraph: LegacyGraphData): WorkspaceState {
  const wrappedGraph: GraphDocument = sanitizeGraphDocument({
    id: DEFAULT_WORKSPACE_GRAPH_ID,
    title: 'Main Graph',
    nodes: legacyGraph.nodes,
    edges: legacyGraph.edges,
    notes: legacyGraph.notes,
  });

  return {
    version: WORKSPACE_EXPORT_VERSION,
    graphs: {
      [wrappedGraph.id]: wrappedGraph,
    },
    graphOrder: [wrappedGraph.id],
    currentGraphId: wrappedGraph.id,
  };
}

export function exportCurrentGraphData(graph: GraphDocument): ExportedGraphData {
  return {
    version: WORKSPACE_EXPORT_VERSION,
    graph: sanitizeGraphDocument(graph),
  };
}

export function exportWorkspaceData(
  workspace: WorkspaceState,
): ExportedWorkspaceData {
  return sanitizeWorkspaceState(workspace);
}

type ParsedImportResult =
  | { kind: 'workspace'; data: WorkspaceState }
  | { kind: 'graph'; data: GraphDocument };

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseStoredWorkspaceString(raw: string): WorkspaceState | null {
  const parsed = parseJson(raw);

  if (!isPlainObject(parsed)) {
    return null;
  }

  if (parsed.version === LEGACY_GRAPH_EXPORT_VERSION) {
    const legacy = parseLegacyGraph(parsed);
    return legacy ? wrapLegacyGraphAsWorkspace(legacy) : null;
  }

  if (parsed.version !== WORKSPACE_EXPORT_VERSION) {
    return null;
  }

  if (
    !isPlainObject(parsed.graphs) ||
    !Array.isArray(parsed.graphOrder) ||
    !parsed.graphOrder.every((graphId) => typeof graphId === 'string') ||
    typeof parsed.currentGraphId !== 'string'
  ) {
    return null;
  }

  const graphEntries = Object.entries(parsed.graphs);

  if (!graphEntries.every(([, graph]) => isValidGraphDocument(graph))) {
    return null;
  }

  return sanitizeWorkspaceState({
    version: WORKSPACE_EXPORT_VERSION,
    graphs: parsed.graphs as Record<GraphId, GraphDocument>,
    graphOrder: parsed.graphOrder as GraphId[],
    currentGraphId: parsed.currentGraphId,
  });
}

function parseLegacyGraph(parsed: unknown): LegacyGraphData | null {
  if (!isPlainObject(parsed)) {
    return null;
  }

  if (
    parsed.version !== LEGACY_GRAPH_EXPORT_VERSION ||
    !Array.isArray(parsed.nodes) ||
    !parsed.nodes.every(isValidNode) ||
    !Array.isArray(parsed.edges) ||
    !parsed.edges.every(isValidEdge) ||
    !isPlainObject(parsed.notes) ||
    !Object.values(parsed.notes).every(isValidNoteRecord)
  ) {
    return null;
  }

  return {
    version: LEGACY_GRAPH_EXPORT_VERSION,
    nodes: parsed.nodes,
    edges: parsed.edges,
    notes: parsed.notes as Record<string, NoteRecord>,
  };
}

export function parseImportedData(raw: string): {
  data: ParsedImportResult | null;
  error: string | null;
} {
  const parsed = parseJson(raw);

  if (parsed === null) {
    return {
      data: null,
      error: '导入失败：文件不是合法的 JSON。',
    };
  }

  const workspace = parseStoredWorkspaceString(raw);

  if (workspace) {
    return {
      data: {
        kind: 'workspace',
        data: workspace,
      },
      error: null,
    };
  }

  if (isPlainObject(parsed) && parsed.version === WORKSPACE_EXPORT_VERSION) {
    if ('graph' in parsed && isValidGraphDocument(parsed.graph)) {
      return {
        data: {
          kind: 'graph',
          data: sanitizeGraphDocument(parsed.graph),
        },
        error: null,
      };
    }
  }

  const legacyGraph = parseLegacyGraph(parsed);

  if (legacyGraph) {
    return {
      data: {
        kind: 'graph',
        data: sanitizeGraphDocument({
          id: createGraphId(),
          title: DEFAULT_NEW_GRAPH_TITLE,
          nodes: legacyGraph.nodes,
          edges: legacyGraph.edges,
          notes: legacyGraph.notes,
        }),
      },
      error: null,
    };
  }

  return {
    data: null,
    error: '导入失败：文件结构无效。',
  };
}

export function buildGraphReferenceIndex(
  workspace: WorkspaceState,
): GraphReferenceIndex {
  const references: GraphReferenceIndex = {};

  for (const graphId of workspace.graphOrder) {
    const graph = workspace.graphs[graphId];

    if (!graph) {
      continue;
    }

    for (const node of graph.nodes) {
      if (node.data.kind !== 'jump') {
        continue;
      }

      const targetGraphId = node.data.jumpLink?.targetGraphId;

      if (
        !targetGraphId ||
        targetGraphId === graphId ||
        !workspace.graphs[targetGraphId]
      ) {
        continue;
      }

      const record: GraphReferenceRecord = {
        sourceGraphId: graph.id,
        sourceGraphTitle: graph.title,
        nodeId: node.id,
        nodeTitle: node.data.title,
      };

      references[targetGraphId] = [...(references[targetGraphId] ?? []), record];
    }
  }

  return references;
}

export function clearGraphReferences(
  workspace: WorkspaceState,
  targetGraphId: GraphId,
): WorkspaceState {
  const nextGraphs = Object.fromEntries(
    Object.entries(workspace.graphs).map(([graphId, graph]) => [
      graphId,
      {
        ...graph,
        nodes: graph.nodes.map((node) => {
          if (node.data.kind !== 'jump') {
            return node;
          }

          if (node.data.jumpLink?.targetGraphId !== targetGraphId) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              jumpLink: {
                targetGraphId: null,
              },
            },
          };
        }),
      },
    ]),
  ) as Record<GraphId, GraphDocument>;

  return {
    ...workspace,
    graphs: nextGraphs,
  };
}

export function assignImportedGraphId(
  workspace: WorkspaceState,
  graph: GraphDocument,
): GraphDocument {
  if (!workspace.graphs[graph.id]) {
    return sanitizeGraphDocument(graph);
  }

  const nextGraphId = createGraphId();

  return sanitizeGraphDocument({
    ...graph,
    id: nextGraphId,
    nodes: graph.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        jumpLink:
          node.data.kind === 'jump' &&
          node.data.jumpLink?.targetGraphId === graph.id
            ? {
                targetGraphId: nextGraphId,
              }
            : node.data.jumpLink,
      },
    })),
  });
}
