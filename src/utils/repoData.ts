import { createDefaultWorkspaceState } from '../data/defaultGraph';
import type {
  GraphDocument,
  GraphConnectionOrientation,
  GraphEdgeStyle,
  GraphId,
  GraphViewport,
  KnowledgeEdge,
  KnowledgeNode,
  LocalDataDirectoryState,
  NoteId,
  NoteRecord,
  RepoWorkspaceManifest,
  WorkspaceState,
} from '../types/graph';
import { createNoteId, getUniqueMarkdownTitle } from './graph';

export const REPO_MANIFEST_VERSION = 1 as const;
const DATA_DIRECTORY_NAME = 'data';
const GRAPHS_DIRECTORY_NAME = 'graphs';
const NOTES_DIRECTORY_NAME = 'notes';
const MANIFEST_FILE_NAME = 'manifest.json';
const DEFAULT_GRAPH_FILE_TITLE = 'Graph';
const DEFAULT_NOTE_FILE_TITLE = 'Markdown';

type SaveWorkspaceOptions = {
  removeAdditionalNoteFiles?: string[];
};

export type DirectoryNoteSyncResult = {
  workspace: WorkspaceState;
  manifest: RepoWorkspaceManifest;
  discoveredCount: number;
};

type DirectoryHandleWithEntries = FileSystemDirectoryHandle & {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};

function normalizeConnectionOrientation(
  orientation: unknown,
): GraphConnectionOrientation {
  return orientation === 'vertical' ? 'vertical' : 'horizontal';
}

function normalizeEdgeStyle(style: unknown): GraphEdgeStyle | undefined {
  if (style === 'curved' || style === 'elbow') {
    return style;
  }

  return undefined;
}

function normalizeViewport(viewport: unknown): GraphViewport | undefined {
  if (!isPlainObject(viewport)) {
    return undefined;
  }

  if (
    typeof viewport.x !== 'number' ||
    typeof viewport.y !== 'number' ||
    typeof viewport.zoom !== 'number'
  ) {
    return undefined;
  }

  return {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isHtmlDocumentContent(content: string) {
  const normalized = content.trimStart().slice(0, 256).toLocaleLowerCase();

  return (
    normalized.startsWith('<!doctype html') ||
    normalized.startsWith('<html') ||
    normalized.includes('<head>') ||
    normalized.includes('<body>')
  );
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, '/');
}

function resolveRepoDataPath(relativePath: string) {
  return `${import.meta.env.BASE_URL}${DATA_DIRECTORY_NAME}/${relativePath}`;
}

function sanitizeFileTitle(title: string, fallbackTitle: string) {
  const normalized = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim();

  return normalized || fallbackTitle;
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, '');
}

function deriveNoteTitleFromFileName(fileName: string) {
  const stem = stripExtension(fileName).trim();
  const titledStem = stem.match(/^(.*)--[a-z0-9-]+$/i)?.[1] ?? stem;

  return sanitizeFileTitle(titledStem, DEFAULT_NOTE_FILE_TITLE);
}

function buildShortId(id: string) {
  const shortId = id
    .replace(/^[a-z]+_/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-10);

  return shortId || id.replace(/[^a-z0-9]+/gi, '').slice(-8) || 'item';
}

function buildTitledFileName(
  title: string,
  id: string,
  existingFiles: string[],
  extension: 'json' | 'md',
  fallbackTitle: string,
) {
  const safeTitle = sanitizeFileTitle(title, fallbackTitle);
  const shortId = buildShortId(id);
  const lowerExistingFiles = existingFiles.map((file) => file.toLocaleLowerCase());
  let suffix = 1;

  while (true) {
    const titledStem =
      suffix === 1 ? safeTitle : `${safeTitle} (${suffix})`;
    const fileName = `${titledStem}--${shortId}.${extension}`;

    if (!lowerExistingFiles.includes(fileName.toLocaleLowerCase())) {
      return fileName;
    }

    suffix += 1;
  }
}

export function buildGraphFileName(
  title: string,
  graphId: GraphId,
  existingFiles: string[],
) {
  return buildTitledFileName(
    title,
    graphId,
    existingFiles,
    'json',
    DEFAULT_GRAPH_FILE_TITLE,
  );
}

export function buildNoteFileName(
  title: string,
  noteId: NoteId,
  existingFiles: string[],
) {
  return buildTitledFileName(
    title,
    noteId,
    existingFiles,
    'md',
    DEFAULT_NOTE_FILE_TITLE,
  );
}

function sanitizeNode(node: KnowledgeNode): KnowledgeNode {
  return {
    id: node.id,
    position: node.position,
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
    ...(node.type ? { type: node.type } : {}),
  };
}

function sanitizeEdge(edge: KnowledgeEdge): KnowledgeEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
    ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
  };
}

function sanitizeGraphDocument(graph: GraphDocument): GraphDocument {
  return {
    id: graph.id,
    title: graph.title,
    connectionOrientation: normalizeConnectionOrientation(
      graph.connectionOrientation,
    ),
    edgeStyle: normalizeEdgeStyle(graph.edgeStyle),
    viewport: normalizeViewport(graph.viewport),
    nodes: graph.nodes.map(sanitizeNode),
    edges: graph.edges.map(sanitizeEdge),
  };
}

function parseManifest(parsed: unknown): RepoWorkspaceManifest | null {
  if (!isPlainObject(parsed) || parsed.version !== REPO_MANIFEST_VERSION) {
    return null;
  }

  if (
    typeof parsed.currentGraphId !== 'string' ||
    !Array.isArray(parsed.graphOrder) ||
    !parsed.graphOrder.every((graphId) => typeof graphId === 'string') ||
    !Array.isArray(parsed.noteOrder) ||
    !parsed.noteOrder.every((noteId) => typeof noteId === 'string') ||
    !isPlainObject(parsed.graphs) ||
    !isPlainObject(parsed.notes)
  ) {
    return null;
  }

  const graphEntries = Object.entries(parsed.graphs);
  const noteEntries = Object.entries(parsed.notes);

  if (
    !graphEntries.every(
      ([, value]) =>
        isPlainObject(value) &&
        typeof value.title === 'string' &&
        typeof value.file === 'string',
    ) ||
    !noteEntries.every(
      ([, value]) =>
        isPlainObject(value) &&
        typeof value.title === 'string' &&
        typeof value.file === 'string',
    )
  ) {
    return null;
  }

  return {
    version: REPO_MANIFEST_VERSION,
    currentGraphId: parsed.currentGraphId,
    graphOrder: parsed.graphOrder as GraphId[],
    noteOrder: parsed.noteOrder as NoteId[],
    graphs: parsed.graphs as RepoWorkspaceManifest['graphs'],
    notes: parsed.notes as RepoWorkspaceManifest['notes'],
  };
}

function parseGraphDocument(parsed: unknown): GraphDocument | null {
  if (!isPlainObject(parsed)) {
    return null;
  }

  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.title !== 'string' ||
    (parsed.connectionOrientation !== undefined &&
      parsed.connectionOrientation !== 'horizontal' &&
      parsed.connectionOrientation !== 'vertical') ||
    (parsed.edgeStyle !== undefined &&
      parsed.edgeStyle !== 'curved' &&
      parsed.edgeStyle !== 'elbow') ||
    !Array.isArray(parsed.nodes) ||
    !Array.isArray(parsed.edges)
  ) {
    return null;
  }

  const nodes = parsed.nodes.filter((node): node is KnowledgeNode => {
    if (!isPlainObject(node) || !isPlainObject(node.position) || !isPlainObject(node.data)) {
      return false;
    }

    return (
      typeof node.id === 'string' &&
      typeof node.position.x === 'number' &&
      typeof node.position.y === 'number' &&
      typeof node.data.title === 'string' &&
      (typeof node.data.noteId === 'string' || node.data.noteId === null) &&
      (node.data.kind === undefined ||
        node.data.kind === 'default' ||
        node.data.kind === 'jump')
    );
  });

  const edges = parsed.edges.filter((edge): edge is KnowledgeEdge => {
    if (!isPlainObject(edge)) {
      return false;
    }

    return (
      typeof edge.id === 'string' &&
      typeof edge.source === 'string' &&
      typeof edge.target === 'string'
    );
  });

  return {
    id: parsed.id,
    title: parsed.title,
    connectionOrientation: normalizeConnectionOrientation(
      parsed.connectionOrientation,
    ),
    edgeStyle: normalizeEdgeStyle(parsed.edgeStyle),
    viewport: normalizeViewport(parsed.viewport),
    nodes: nodes.map(sanitizeNode),
    edges: edges.map(sanitizeEdge),
  };
}

export function createManifestFromWorkspace(
  workspace: WorkspaceState,
): RepoWorkspaceManifest {
  const graphFiles: string[] = [];
  const noteFiles: string[] = [];
  const graphs = Object.fromEntries(
    workspace.graphOrder
      .map((graphId) => {
        const graph = workspace.graphs[graphId];

        if (!graph) {
          return null;
        }

        const file = buildGraphFileName(graph.title, graphId, graphFiles);
        graphFiles.push(file);

        return [graphId, { title: graph.title, file }];
      })
      .filter(Boolean) as Array<[GraphId, { title: string; file: string }]>,
  );

  const notes = Object.fromEntries(
    workspace.noteOrder
      .map((noteId) => {
        const note = workspace.notes[noteId];

        if (!note) {
          return null;
        }

        const file = buildNoteFileName(note.title, noteId, noteFiles);
        noteFiles.push(file);

        return [noteId, { title: note.title, file }];
      })
      .filter(Boolean) as Array<[NoteId, { title: string; file: string }]>,
  );

  return {
    version: REPO_MANIFEST_VERSION,
    currentGraphId:
      workspace.graphs[workspace.currentGraphId] !== undefined
        ? workspace.currentGraphId
        : workspace.graphOrder[0],
    graphOrder: workspace.graphOrder.filter((graphId) => graphs[graphId]),
    noteOrder: workspace.noteOrder.filter((noteId) => notes[noteId]),
    graphs,
    notes,
  };
}

export async function loadRepoWorkspace(): Promise<{
  workspace: WorkspaceState;
  manifest: RepoWorkspaceManifest;
}> {
  if (import.meta.env.MODE === 'test') {
    const workspace = createDefaultWorkspaceState();

    return {
      workspace,
      manifest: createManifestFromWorkspace(workspace),
    };
  }

  const manifestResponse = await fetch(resolveRepoDataPath(MANIFEST_FILE_NAME));

  if (!manifestResponse.ok) {
    throw new Error('加载 manifest.json 失败。');
  }

  const manifestJson = parseJson(await manifestResponse.text());
  const manifest = parseManifest(manifestJson);

  if (!manifest) {
    throw new Error('manifest.json 结构无效。');
  }

  const graphEntries = await Promise.all(
    manifest.graphOrder.map(async (graphId) => {
      const graphMeta = manifest.graphs[graphId];

      if (!graphMeta) {
        throw new Error(`manifest 缺少 graph「${graphId}」的文件映射。`);
      }

      const response = await fetch(
        resolveRepoDataPath(`${GRAPHS_DIRECTORY_NAME}/${encodePathSegment(graphMeta.file)}`),
      );

      if (!response.ok) {
        throw new Error(`加载 graph 文件失败：${graphMeta.file}`);
      }

      const graph = parseGraphDocument(parseJson(await response.text()));

      if (!graph) {
        throw new Error(`graph 文件结构无效：${graphMeta.file}`);
      }

      return [graphId, graph] as const;
    }),
  );

  const noteEntries = await Promise.all(
    manifest.noteOrder.map(async (noteId) => {
      const noteMeta = manifest.notes[noteId];

      if (!noteMeta) {
        throw new Error(`manifest 缺少 note「${noteId}」的文件映射。`);
      }

      const response = await fetch(
        resolveRepoDataPath(`${NOTES_DIRECTORY_NAME}/${encodePathSegment(noteMeta.file)}`),
      );

      if (!response.ok) {
        throw new Error(`加载 note 文件失败：${noteMeta.file}`);
      }

      const content = await response.text();

      if (isHtmlDocumentContent(content)) {
        throw new Error(
          `note 文件不是有效的 Markdown，返回了 HTML 页面：${noteMeta.file}`,
        );
      }

      return [
        noteId,
        {
          id: noteId,
          title: noteMeta.title,
          content,
        },
      ] as const;
    }),
  );

  const workspace: WorkspaceState = {
    version: 3,
    graphs: Object.fromEntries(graphEntries) as Record<GraphId, GraphDocument>,
    notes: Object.fromEntries(noteEntries) as Record<NoteId, NoteRecord>,
    graphOrder: manifest.graphOrder,
    noteOrder: manifest.noteOrder,
    currentGraphId:
      manifest.graphOrder.includes(manifest.currentGraphId)
        ? manifest.currentGraphId
        : manifest.graphOrder[0],
  };

  return {
    workspace,
    manifest,
  };
}

async function writeTextFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  await writable.write(content);
  await writable.close();
}

async function writeJsonFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  data: unknown,
) {
  await writeTextFile(directoryHandle, fileName, JSON.stringify(data, null, 2));
}

async function removeFileIfExists(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
) {
  try {
    await directoryHandle.removeEntry(fileName);
  } catch {
    // Ignore missing files and permission edge cases here; write path will surface actual save errors.
  }
}

export async function saveWorkspaceToDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  workspace: WorkspaceState,
  previousManifest: RepoWorkspaceManifest | null,
  options: SaveWorkspaceOptions = {},
) {
  const nextManifest = createManifestFromWorkspace(workspace);
  const graphsDirectoryHandle = await directoryHandle.getDirectoryHandle(
    GRAPHS_DIRECTORY_NAME,
    { create: true },
  );
  const notesDirectoryHandle = await directoryHandle.getDirectoryHandle(
    NOTES_DIRECTORY_NAME,
    { create: true },
  );

  await Promise.all(
    nextManifest.graphOrder.map(async (graphId) => {
      const graph = workspace.graphs[graphId];
      const graphMeta = nextManifest.graphs[graphId];

      if (!graph || !graphMeta) {
        return;
      }

      await writeJsonFile(
        graphsDirectoryHandle,
        graphMeta.file,
        sanitizeGraphDocument(graph),
      );
    }),
  );

  await Promise.all(
    nextManifest.noteOrder.map(async (noteId) => {
      const note = workspace.notes[noteId];
      const noteMeta = nextManifest.notes[noteId];
      const previousNoteMeta = previousManifest?.notes[noteId];

      if (!note || !noteMeta) {
        return;
      }

      if (!previousNoteMeta || previousNoteMeta.file !== noteMeta.file) {
        await writeTextFile(notesDirectoryHandle, noteMeta.file, note.content);
      }
    }),
  );

  const previousGraphFiles = previousManifest
    ? Object.values(previousManifest.graphs).map((graph) => graph.file)
    : [];
  const previousNoteFiles = previousManifest
    ? Object.values(previousManifest.notes).map((note) => note.file)
    : [];
  const nextGraphFiles = new Set(
    Object.values(nextManifest.graphs).map((graph) => graph.file),
  );
  const nextNoteFiles = new Set(
    Object.values(nextManifest.notes).map((note) => note.file),
  );

  await Promise.all(
    previousGraphFiles
      .filter((fileName) => !nextGraphFiles.has(fileName))
      .map((fileName) => removeFileIfExists(graphsDirectoryHandle, fileName)),
  );
  await Promise.all(
    previousNoteFiles
      .filter((fileName) => !nextNoteFiles.has(fileName))
      .map((fileName) => removeFileIfExists(notesDirectoryHandle, fileName)),
  );
  await Promise.all(
    (options.removeAdditionalNoteFiles ?? []).map((fileName) =>
      removeFileIfExists(notesDirectoryHandle, fileName),
    ),
  );

  await writeJsonFile(directoryHandle, MANIFEST_FILE_NAME, nextManifest);

  return nextManifest;
}

export async function syncDiscoveredNotesFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  workspace: WorkspaceState,
  manifest: RepoWorkspaceManifest | null,
): Promise<DirectoryNoteSyncResult> {
  const notesDirectoryHandle = (await directoryHandle.getDirectoryHandle(
    NOTES_DIRECTORY_NAME,
    { create: true },
  )) as DirectoryHandleWithEntries;
  const knownNoteFiles = new Set(
    Object.values(manifest?.notes ?? {}).map((note) => note.file.toLocaleLowerCase()),
  );
  const extraNoteFilesToRemove: string[] = [];
  let nextWorkspace = workspace;
  let discoveredCount = 0;

  for await (const [fileName, handle] of notesDirectoryHandle.entries()) {
    if (
      handle.kind !== 'file' ||
      !fileName.toLocaleLowerCase().endsWith('.md') ||
      knownNoteFiles.has(fileName.toLocaleLowerCase())
    ) {
      continue;
    }

    const file = await (handle as FileSystemFileHandle).getFile();
    const content = await file.text();

    if (isHtmlDocumentContent(content)) {
      continue;
    }

    const noteId = createNoteId();
    const title = getUniqueMarkdownTitle(
      nextWorkspace.notes,
      nextWorkspace.noteOrder,
      deriveNoteTitleFromFileName(fileName),
    );

    nextWorkspace = {
      ...nextWorkspace,
      notes: {
        ...nextWorkspace.notes,
        [noteId]: {
          id: noteId,
          title,
          content,
        },
      },
      noteOrder: [...nextWorkspace.noteOrder, noteId],
    };
    extraNoteFilesToRemove.push(fileName);
    discoveredCount += 1;
  }

  if (discoveredCount === 0) {
    return {
      workspace,
      manifest: manifest ?? createManifestFromWorkspace(workspace),
      discoveredCount: 0,
    };
  }

  const nextManifest = await saveWorkspaceToDirectory(
    directoryHandle,
    nextWorkspace,
    manifest,
    { removeAdditionalNoteFiles: extraNoteFilesToRemove },
  );

  return {
    workspace: nextWorkspace,
    manifest: nextManifest,
    discoveredCount,
  };
}

export function getDefaultLocalDataDirectoryState(): LocalDataDirectoryState {
  return {
    hasWritableDirectory: false,
    directoryName: null,
    lastError: null,
    lastSyncMessage: null,
  };
}
