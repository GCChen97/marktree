import {
  createDefaultWorkspaceState,
  createMarkdownNote,
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
  NoteId,
  NoteRecord,
  WorkspaceState,
} from '../types/graph';

export const WORKSPACE_EXPORT_VERSION = 3 as const;

export const DEFAULT_NEW_NODE_POSITION = {
  x: 160,
  y: 120,
};

export const DEFAULT_NEW_NODE_TITLE = 'Untitled';
export const DEFAULT_NEW_GRAPH_TITLE = 'Untitled Graph';
export const DEFAULT_NEW_MARKDOWN_TITLE = 'Untitled';

let nodeCounter = 0;
let graphCounter = 0;
let noteCounter = 0;

export function createNodeId() {
  nodeCounter += 1;
  return `node_${Date.now()}_${nodeCounter}`;
}

export function createGraphId() {
  graphCounter += 1;
  return `graph_${Date.now()}_${graphCounter}`;
}

export function createNoteId() {
  noteCounter += 1;
  return `note_${Date.now()}_${noteCounter}`;
}

export function createEdgeId(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
) {
  return [
    'edge',
    source,
    sourceHandle ?? 'default-source',
    target,
    targetHandle ?? 'default-target',
    Date.now(),
  ].join('_');
}

export function normalizeMarkdownTitle(title: string) {
  return title.trim().replace(/\s+/g, ' ');
}

function normalizeMarkdownTitleForCompare(title: string) {
  return normalizeMarkdownTitle(title).toLocaleLowerCase();
}

export function getUniqueMarkdownTitle(
  notes: Record<NoteId, NoteRecord>,
  noteOrder: NoteId[],
  desiredTitle: string,
  excludedNoteId?: NoteId | null,
): string {
  const baseTitle = normalizeMarkdownTitle(desiredTitle) || DEFAULT_NEW_MARKDOWN_TITLE;
  const existingNames = new Set(
    noteOrder
      .filter((noteId) => noteId !== excludedNoteId)
      .map((noteId) => notes[noteId])
      .filter(Boolean)
      .map((note) => normalizeMarkdownTitleForCompare(note.title)),
  );

  if (!existingNames.has(normalizeMarkdownTitleForCompare(baseTitle))) {
    return baseTitle;
  }

  let suffix = 2;

  while (
    existingNames.has(
      normalizeMarkdownTitleForCompare(`${baseTitle} (${suffix})`),
    )
  ) {
    suffix += 1;
  }

  return `${baseTitle} (${suffix})`;
}

export function findNoteIdByTitle(
  workspace: WorkspaceState,
  title: string,
): NoteId | null {
  const normalizedTitle = normalizeMarkdownTitleForCompare(title);

  if (!normalizedTitle) {
    return null;
  }

  for (const noteId of workspace.noteOrder) {
    const note = workspace.notes[noteId];

    if (
      note &&
      normalizeMarkdownTitleForCompare(note.title) === normalizedTitle
    ) {
      return noteId;
    }
  }

  return null;
}

export function createDefaultNoteForNode(noteId: NoteId, title: string) {
  return createMarkdownNote(noteId, title);
}

export function createDefaultNodeAtPosition(
  nodeId: string,
  noteId: NoteId | null,
  position: { x: number; y: number },
): KnowledgeNode {
  return {
    id: nodeId,
    position,
    type: 'mind',
    data: {
      title: DEFAULT_NEW_NODE_TITLE,
      noteId,
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
    (typeof data.noteId === 'string' || data.noteId === null) &&
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
    graph.edges.every(isValidEdge)
  );
}

function sanitizeGraphDocument(graph: GraphDocument): GraphDocument {
  return {
    id: graph.id,
    title: graph.title,
    nodes: graph.nodes.map((node) => ({
      ...node,
      type: node.data.kind === 'jump' ? 'jump' : 'mind',
      data: {
        title: node.data.title,
        noteId: node.data.noteId ?? null,
        kind: node.data.kind ?? 'default',
        jumpLink:
          node.data.kind === 'jump' || node.data.jumpLink
            ? {
                targetGraphId: node.data.jumpLink?.targetGraphId ?? null,
              }
            : undefined,
      },
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
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

  const noteEntries = workspace.noteOrder
    .map((noteId) => {
      const note = workspace.notes[noteId];

      return note
        ? [
            noteId,
            {
              id: note.id,
              title: normalizeMarkdownTitle(note.title) || DEFAULT_NEW_MARKDOWN_TITLE,
              content: note.content,
            },
          ]
        : null;
    })
    .filter(Boolean) as Array<[NoteId, NoteRecord]>;

  if (graphEntries.length === 0) {
    return createDefaultWorkspaceState();
  }

  const graphs = Object.fromEntries(graphEntries) as Record<GraphId, GraphDocument>;
  const graphOrder = graphEntries.map(([graphId]) => graphId);
  const notes = Object.fromEntries(noteEntries) as Record<NoteId, NoteRecord>;
  const noteOrder = noteEntries.map(([noteId]) => noteId);
  const currentGraphId = graphs[workspace.currentGraphId]
    ? workspace.currentGraphId
    : graphOrder[0];

  return {
    version: WORKSPACE_EXPORT_VERSION,
    graphs,
    notes,
    graphOrder,
    noteOrder,
    currentGraphId,
  };
}

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseStoredWorkspaceString(raw: string): WorkspaceState | null {
  const parsed = parseJson(raw);

  if (!isPlainObject(parsed) || parsed.version !== WORKSPACE_EXPORT_VERSION) {
    return null;
  }

  if (
    !isPlainObject(parsed.graphs) ||
    !isPlainObject(parsed.notes) ||
    !Array.isArray(parsed.graphOrder) ||
    !Array.isArray(parsed.noteOrder) ||
    !parsed.graphOrder.every((graphId) => typeof graphId === 'string') ||
    !parsed.noteOrder.every((noteId) => typeof noteId === 'string') ||
    typeof parsed.currentGraphId !== 'string'
  ) {
    return null;
  }

  const graphEntries = Object.entries(parsed.graphs);
  const noteEntries = Object.entries(parsed.notes);

  if (!graphEntries.every(([, graph]) => isValidGraphDocument(graph))) {
    return null;
  }

  if (!noteEntries.every(([, note]) => isValidNoteRecord(note))) {
    return null;
  }

  return sanitizeWorkspaceState({
    version: WORKSPACE_EXPORT_VERSION,
    graphs: parsed.graphs as Record<GraphId, GraphDocument>,
    notes: parsed.notes as Record<NoteId, NoteRecord>,
    graphOrder: parsed.graphOrder as GraphId[],
    noteOrder: parsed.noteOrder as NoteId[],
    currentGraphId: parsed.currentGraphId,
  });
}

type ParsedImportResult =
  | { kind: 'workspace'; data: WorkspaceState }
  | { kind: 'graph'; data: { graph: GraphDocument; notes: Record<NoteId, NoteRecord> } };

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

  if (
    isPlainObject(parsed) &&
    parsed.version === WORKSPACE_EXPORT_VERSION &&
    'graph' in parsed &&
    isValidGraphDocument(parsed.graph) &&
    'notes' in parsed &&
    isPlainObject(parsed.notes) &&
    Object.values(parsed.notes).every(isValidNoteRecord)
  ) {
    return {
      data: {
        kind: 'graph',
        data: {
          graph: sanitizeGraphDocument(parsed.graph),
          notes: Object.fromEntries(
            Object.entries(parsed.notes as Record<string, NoteRecord>).map(([noteId, note]) => [
              noteId,
              {
                id: note.id,
                title:
                  normalizeMarkdownTitle(note.title) || DEFAULT_NEW_MARKDOWN_TITLE,
                content: note.content,
              },
            ]),
          ) as Record<NoteId, NoteRecord>,
        },
      },
      error: null,
    };
  }

  return {
    data: null,
    error: '导入失败：文件结构无效。',
  };
}

export function exportCurrentGraphData(
  graph: GraphDocument,
  notes: Record<NoteId, NoteRecord>,
): ExportedGraphData {
  const referencedNotes = Object.fromEntries(
    collectReferencedNoteIds(graph)
      .map((noteId) => notes[noteId])
      .filter(Boolean)
      .map((note) => [note.id, note]),
  ) as Record<NoteId, NoteRecord>;

  return {
    version: WORKSPACE_EXPORT_VERSION,
    graph: sanitizeGraphDocument(graph),
    notes: referencedNotes,
  };
}

export function exportWorkspaceData(
  workspace: WorkspaceState,
): ExportedWorkspaceData {
  return sanitizeWorkspaceState(workspace);
}

export function collectReferencedNoteIds(graph: GraphDocument): NoteId[] {
  return Array.from(
    new Set(
      graph.nodes
        .map((node) => node.data.noteId)
        .filter((noteId): noteId is NoteId => Boolean(noteId)),
    ),
  );
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

export function buildNoteUsageIndex(workspace: WorkspaceState) {
  const usage: Record<
    NoteId,
    Array<{
      graphId: GraphId;
      graphTitle: string;
      nodeId: string;
      nodeTitle: string;
    }>
  > = {};

  for (const graphId of workspace.graphOrder) {
    const graph = workspace.graphs[graphId];

    if (!graph) {
      continue;
    }

    for (const node of graph.nodes) {
      const noteId = node.data.noteId;

      if (!noteId || !workspace.notes[noteId]) {
        continue;
      }

      usage[noteId] = [
        ...(usage[noteId] ?? []),
        {
          graphId,
          graphTitle: graph.title,
          nodeId: node.id,
          nodeTitle: node.data.title,
        },
      ];
    }
  }

  return usage;
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

export function assignImportedGraphBundle(
  workspace: WorkspaceState,
  importedGraph: GraphDocument,
  importedNotes: Record<NoteId, NoteRecord>,
) {
  const nextGraphId = workspace.graphs[importedGraph.id]
    ? createGraphId()
    : importedGraph.id;
  const nextNotes: Record<NoteId, NoteRecord> = {};
  const nextNoteOrder: NoteId[] = [];
  const noteIdMap = new Map<NoteId, NoteId | null>();

  for (const [importedNoteId, importedNote] of Object.entries(importedNotes)) {
    const nextNoteId = workspace.notes[importedNoteId] || nextNotes[importedNoteId]
      ? createNoteId()
      : importedNoteId;
    const nextTitle = getUniqueMarkdownTitle(
      {
        ...workspace.notes,
        ...nextNotes,
      },
      [...workspace.noteOrder, ...nextNoteOrder],
      importedNote.title,
    );

    noteIdMap.set(importedNoteId, nextNoteId);
    nextNotes[nextNoteId] = {
      id: nextNoteId,
      title: nextTitle,
      content: importedNote.content,
    };
    nextNoteOrder.push(nextNoteId);
  }

  const graph = sanitizeGraphDocument({
    ...importedGraph,
    id: nextGraphId,
    nodes: importedGraph.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        noteId: node.data.noteId
          ? noteIdMap.get(node.data.noteId) ?? null
          : null,
        jumpLink:
          node.data.kind === 'jump' &&
          node.data.jumpLink?.targetGraphId === importedGraph.id
            ? {
                targetGraphId: nextGraphId,
              }
            : node.data.jumpLink,
      },
    })),
  });

  return {
    graph,
    notes: nextNotes,
    noteOrder: nextNoteOrder,
  };
}
