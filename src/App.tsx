import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Connection } from '@xyflow/react';
import { MobileWorkspaceLayout } from './components/layout/MobileWorkspaceLayout';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { CanvasPane } from './components/panes/CanvasPane';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { ToolbarPane } from './components/panes/ToolbarPane';
import { createNewGraphDocument } from './data/defaultGraph';
import { usePersistentLayoutState } from './hooks/usePersistentLayoutState';
import { usePersistentWorkspaceState } from './hooks/usePersistentWorkspaceState';
import { useResponsiveMode } from './hooks/useResponsiveMode';
import { useThemePreference } from './hooks/useThemePreference';
import type {
  CanvasViewportApi,
  GraphId,
  GraphReferenceRecord,
  KnowledgeEdge,
  KnowledgeNode,
  NoteId,
  NoteRecord,
  WorkspaceState,
} from './types/graph';
import type { MobilePaneTab } from './types/layout';
import {
  DEFAULT_NEW_GRAPH_TITLE,
  DEFAULT_NEW_MARKDOWN_TITLE,
  DEFAULT_NEW_NODE_POSITION,
  assignImportedGraphBundle,
  buildGraphReferenceIndex,
  buildNoteUsageIndex,
  clearGraphReferences,
  createDefaultNodeAtPosition,
  createDefaultNoteForNode,
  createEdgeId,
  createGraphId,
  createNodeId,
  createNoteId,
  exportCurrentGraphData,
  exportWorkspaceData,
  getUniqueMarkdownTitle,
  parseImportedData,
} from './utils/graph';

function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function getNextGraphIdAfterDeletion(
  graphOrder: GraphId[],
  deletingGraphId: GraphId,
): GraphId | null {
  const currentIndex = graphOrder.indexOf(deletingGraphId);
  const nextGraphId = graphOrder[currentIndex + 1];

  if (nextGraphId) {
    return nextGraphId;
  }

  return graphOrder[currentIndex - 1] ?? null;
}

function buildDeleteGraphMessage(
  graphTitle: string,
  records: GraphReferenceRecord[],
) {
  const referringTitles = [...new Set(records.map((record) => record.sourceGraphTitle))];

  if (referringTitles.length === 0) {
    return `确定要删除 graph「${graphTitle}」吗？`;
  }

  return [
    `以下 graph 正在引用「${graphTitle}」：`,
    ...referringTitles.map((title) => `- ${title}`),
    '',
    '删除后，这些跳转节点会失去目标 graph。',
    '确定继续删除吗？',
  ].join('\n');
}

function buildDeleteMarkdownMessage(
  noteTitle: string,
  records: Array<{ graphTitle: string; nodeTitle: string }>,
) {
  if (records.length === 0) {
    return `确定要删除 Markdown「${noteTitle}」吗？`;
  }

  return [
    `Markdown「${noteTitle}」当前仍被以下节点使用：`,
    ...records.map((record) => `- ${record.graphTitle} / ${record.nodeTitle}`),
    '',
    '删除后，这些节点会失去 markdown 关联。',
    '确定继续删除吗？',
  ].join('\n');
}

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();
  const { workspace, setWorkspace } = usePersistentWorkspaceState();
  const { viewportMode, isMobile } = useResponsiveMode();
  const { theme, toggleTheme } = useThemePreference();
  const [canvasViewportApi, setCanvasViewportApi] =
    useState<CanvasViewportApi | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [activeMarkdownId, setActiveMarkdownId] = useState<NoteId | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] =
    useState<MobilePaneTab>('canvas');

  const currentGraph =
    workspace.graphs[workspace.currentGraphId] ??
    workspace.graphs[workspace.graphOrder[0]];

  const referenceIndex = useMemo(
    () => buildGraphReferenceIndex(workspace),
    [workspace],
  );

  const noteUsageIndex = useMemo(
    () => buildNoteUsageIndex(workspace),
    [workspace],
  );

  const selectedNode = useMemo(
    () => currentGraph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [currentGraph, selectedNodeId],
  );

  const selectedNote = useMemo<NoteRecord | null>(() => {
    const noteId = selectedNode?.data.noteId;

    if (!noteId) {
      return null;
    }

    return workspace.notes[noteId] ?? null;
  }, [selectedNode, workspace.notes]);

  const graphItems = useMemo(
    () =>
      workspace.graphOrder.map((graphId) => ({
        id: graphId,
        title: workspace.graphs[graphId]?.title ?? graphId,
        isCurrent: graphId === workspace.currentGraphId,
        incomingReferenceCount: referenceIndex[graphId]?.length ?? 0,
      })),
    [referenceIndex, workspace.currentGraphId, workspace.graphOrder, workspace.graphs],
  );

  const markdownItems = useMemo(
    () =>
      workspace.noteOrder.map((noteId) => ({
        id: noteId,
        title: workspace.notes[noteId]?.title ?? noteId,
        usageCount: noteUsageIndex[noteId]?.length ?? 0,
        isActive: noteId === activeMarkdownId,
        isLinkedToSelectedNode: noteId === (selectedNode?.data.noteId ?? null),
      })),
    [
      activeMarkdownId,
      noteUsageIndex,
      selectedNode,
      workspace.noteOrder,
      workspace.notes,
    ],
  );

  const availableJumpTargetGraphs = useMemo(
    () =>
      workspace.graphOrder
        .filter((graphId) => graphId !== workspace.currentGraphId)
        .map((graphId) => ({
          id: graphId,
          title: workspace.graphs[graphId]?.title ?? graphId,
        })),
    [workspace.currentGraphId, workspace.graphOrder, workspace.graphs],
  );

  const selectedJumpTargetGraphId =
    selectedNode?.data.kind === 'jump'
      ? selectedNode.data.jumpLink?.targetGraphId ?? null
      : null;

  const applyWorkspaceMutation = useCallback(
    (
      updater: (currentWorkspace: WorkspaceState) => WorkspaceState,
      nextUiState?: {
        selectedNodeId?: string | null;
        editingNodeId?: string | null;
        activeMarkdownId?: NoteId | null;
      },
    ) => {
      setWorkspace((currentWorkspace) => updater(currentWorkspace));

      if (nextUiState && 'selectedNodeId' in nextUiState) {
        setSelectedNodeId(nextUiState.selectedNodeId ?? null);
      }

      if (nextUiState && 'editingNodeId' in nextUiState) {
        setEditingNodeId(nextUiState.editingNodeId ?? null);
      }

      if (nextUiState && 'activeMarkdownId' in nextUiState) {
        setActiveMarkdownId(nextUiState.activeMarkdownId ?? null);
      }
    },
    [setWorkspace],
  );

  useEffect(() => {
    if (viewportMode === 'mobile') {
      setMobileActiveTab('canvas');
    }
  }, [viewportMode]);

  useEffect(() => {
    if (
      selectedNodeId &&
      !currentGraph?.nodes.some((node) => node.id === selectedNodeId)
    ) {
      setSelectedNodeId(null);
      setEditingNodeId(null);
    }
  }, [currentGraph, selectedNodeId]);

  useEffect(() => {
    if (selectedNode) {
      setActiveMarkdownId(selectedNode.data.noteId ?? null);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (activeMarkdownId && !workspace.notes[activeMarkdownId]) {
      setActiveMarkdownId(null);
    }
  }, [activeMarkdownId, workspace.notes]);

  function updateCurrentGraphNodes(nodes: KnowledgeNode[]) {
    applyWorkspaceMutation((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      if (!graph) {
        return currentWorkspace;
      }

      return {
        ...currentWorkspace,
        graphs: {
          ...currentWorkspace.graphs,
          [graph.id]: {
            ...graph,
            nodes,
          },
        },
      };
    });
  }

  function updateCurrentGraphEdges(edges: KnowledgeEdge[]) {
    applyWorkspaceMutation((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      if (!graph) {
        return currentWorkspace;
      }

      return {
        ...currentWorkspace,
        graphs: {
          ...currentWorkspace.graphs,
          [graph.id]: {
            ...graph,
            edges,
          },
        },
      };
    });
  }

  function handleNodesChange(nodes: KnowledgeNode[]) {
    updateCurrentGraphNodes(nodes);
  }

  function handleEdgesChange(edges: KnowledgeEdge[]) {
    updateCurrentGraphEdges(edges);
  }

  function handleConnectEdge(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }

    const nextEdge: KnowledgeEdge = {
      id: createEdgeId(
        connection.source,
        connection.target,
        connection.sourceHandle,
        connection.targetHandle,
      ),
      source: connection.source,
      target: connection.target,
      ...(connection.sourceHandle ? { sourceHandle: connection.sourceHandle } : {}),
      ...(connection.targetHandle ? { targetHandle: connection.targetHandle } : {}),
    };

    applyWorkspaceMutation((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      if (!graph) {
        return currentWorkspace;
      }

      return {
        ...currentWorkspace,
        graphs: {
          ...currentWorkspace.graphs,
          [graph.id]: {
            ...graph,
            edges: [...graph.edges, nextEdge],
          },
        },
      };
    });
  }

  function handleSelectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);

    if (nodeId !== editingNodeId) {
      setEditingNodeId(null);
    }
  }

  function handleStartNodeTitleEdit(nodeId: string) {
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
  }

  function handleCommitNodeTitleEdit(nodeId: string, title: string) {
    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: graph.nodes.map((node) =>
                node.id === nodeId
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        title,
                      },
                    }
                  : node,
              ),
            },
          },
        };
      },
      {
        selectedNodeId: nodeId,
        editingNodeId: null,
      },
    );
  }

  function handleCancelNodeTitleEdit() {
    setEditingNodeId(null);
  }

  function handleSelectGraph(graphId: GraphId) {
    setImportError(null);
    setSelectedNodeId(null);
    setEditingNodeId(null);
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      currentGraphId: graphId,
    }));
  }

  function handleCreateGraph() {
    const graphId = createGraphId();
    const rootNodeId = createNodeId();
    const rootNoteId = createNoteId();

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const rootNoteTitle = getUniqueMarkdownTitle(
          currentWorkspace.notes,
          currentWorkspace.noteOrder,
          'Start',
        );
        const nextGraph = createNewGraphDocument(
          graphId,
          DEFAULT_NEW_GRAPH_TITLE,
          rootNodeId,
          rootNoteId,
        );
        const nextNote = createDefaultNoteForNode(rootNoteId, rootNoteTitle);

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graphId]: nextGraph,
          },
          notes: {
            ...currentWorkspace.notes,
            [rootNoteId]: nextNote,
          },
          graphOrder: [...currentWorkspace.graphOrder, graphId],
          noteOrder: [...currentWorkspace.noteOrder, rootNoteId],
          currentGraphId: graphId,
        };
      },
      {
        selectedNodeId: null,
        editingNodeId: null,
        activeMarkdownId: rootNoteId,
      },
    );
    setImportError(null);
  }

  function handleRenameCurrentGraph() {
    if (!currentGraph) {
      return;
    }

    const nextTitle = window.prompt(
      '请输入新的 graph 名称',
      currentGraph.title,
    );

    if (!nextTitle?.trim()) {
      return;
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      graphs: {
        ...currentWorkspace.graphs,
        [currentWorkspace.currentGraphId]: {
          ...currentWorkspace.graphs[currentWorkspace.currentGraphId],
          title: nextTitle.trim(),
        },
      },
    }));
  }

  function handleDeleteCurrentGraph() {
    if (!currentGraph || workspace.graphOrder.length <= 1) {
      return;
    }

    const incomingReferences = referenceIndex[currentGraph.id] ?? [];

    if (!window.confirm(buildDeleteGraphMessage(currentGraph.title, incomingReferences))) {
      return;
    }

    setImportError(null);
    setSelectedNodeId(null);
    setEditingNodeId(null);
    setWorkspace((currentWorkspace) => {
      const cleanedWorkspace = clearGraphReferences(
        currentWorkspace,
        currentGraph.id,
      );
      const nextGraphs = { ...cleanedWorkspace.graphs };
      const nextGraphOrder = cleanedWorkspace.graphOrder.filter(
        (graphId) => graphId !== currentGraph.id,
      );

      delete nextGraphs[currentGraph.id];

      const nextCurrentGraphId =
        getNextGraphIdAfterDeletion(cleanedWorkspace.graphOrder, currentGraph.id) ??
        nextGraphOrder[0];

      return {
        ...cleanedWorkspace,
        graphs: nextGraphs,
        graphOrder: nextGraphOrder,
        currentGraphId: nextCurrentGraphId,
      };
    });
  }

  function handleCreateNode() {
    const position =
      canvasViewportApi?.getCanvasCenterPosition() ?? DEFAULT_NEW_NODE_POSITION;
    const nodeId = createNodeId();
    const noteId = createNoteId();

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        const noteTitle = getUniqueMarkdownTitle(
          currentWorkspace.notes,
          currentWorkspace.noteOrder,
          DEFAULT_NEW_MARKDOWN_TITLE,
        );
        const note = createDefaultNoteForNode(noteId, noteTitle);
        const node = createDefaultNodeAtPosition(nodeId, noteId, position);

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: [...graph.nodes, node],
            },
          },
          notes: {
            ...currentWorkspace.notes,
            [noteId]: note,
          },
          noteOrder: [...currentWorkspace.noteOrder, noteId],
        };
      },
      {
        selectedNodeId: nodeId,
        activeMarkdownId: noteId,
      },
    );
    setImportError(null);
  }

  function handleCreateChildNodeFromSelection() {
    if (!selectedNode || !currentGraph) {
      return;
    }

    const nodeId = createNodeId();
    const noteId = createNoteId();

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        const noteTitle = getUniqueMarkdownTitle(
          currentWorkspace.notes,
          currentWorkspace.noteOrder,
          DEFAULT_NEW_MARKDOWN_TITLE,
        );
        const note = createDefaultNoteForNode(noteId, noteTitle);
        const node = createDefaultNodeAtPosition(nodeId, noteId, {
          x: selectedNode.position.x + 240,
          y: selectedNode.position.y + 120,
        });
        const nextEdge: KnowledgeEdge = {
          id: createEdgeId(selectedNode.id, nodeId),
          source: selectedNode.id,
          target: nodeId,
        };

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: [...graph.nodes, node],
              edges: [...graph.edges, nextEdge],
            },
          },
          notes: {
            ...currentWorkspace.notes,
            [noteId]: note,
          },
          noteOrder: [...currentWorkspace.noteOrder, noteId],
        };
      },
      {
        selectedNodeId: nodeId,
        editingNodeId: nodeId,
        activeMarkdownId: noteId,
      },
    );
    setImportError(null);
  }

  function handleCreateSiblingNodeFromSelection() {
    if (!selectedNode || !currentGraph) {
      return;
    }

    const parentEdges = currentGraph.edges.filter(
      (edge) => edge.target === selectedNode.id,
    );
    const nodeId = createNodeId();
    const noteId = createNoteId();
    const siblingPosition = {
      x: selectedNode.position.x,
      y: selectedNode.position.y + 120,
    };
    const childPosition = {
      x: selectedNode.position.x + 240,
      y: selectedNode.position.y + 120,
    };

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        const noteTitle = getUniqueMarkdownTitle(
          currentWorkspace.notes,
          currentWorkspace.noteOrder,
          DEFAULT_NEW_MARKDOWN_TITLE,
        );
        const note = createDefaultNoteForNode(noteId, noteTitle);
        let nextPosition = siblingPosition;
        let nextEdge: KnowledgeEdge | null = null;

        if (parentEdges.length === 0) {
          nextPosition = childPosition;
          nextEdge = {
            id: createEdgeId(selectedNode.id, nodeId),
            source: selectedNode.id,
            target: nodeId,
          };
        } else if (parentEdges.length === 1) {
          nextEdge = {
            id: createEdgeId(parentEdges[0].source, nodeId),
            source: parentEdges[0].source,
            target: nodeId,
          };
        }

        const node = createDefaultNodeAtPosition(nodeId, noteId, nextPosition);

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: [...graph.nodes, node],
              edges: nextEdge ? [...graph.edges, nextEdge] : graph.edges,
            },
          },
          notes: {
            ...currentWorkspace.notes,
            [noteId]: note,
          },
          noteOrder: [...currentWorkspace.noteOrder, noteId],
        };
      },
      {
        selectedNodeId: nodeId,
        editingNodeId: nodeId,
        activeMarkdownId: noteId,
      },
    );
    setImportError(null);
  }

  function handleDeleteSelectedNode() {
    if (!selectedNodeId || !currentGraph) {
      return;
    }

    setImportError(null);
    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: graph.nodes.filter((node) => node.id !== selectedNodeId),
              edges: graph.edges.filter(
                (edge) =>
                  edge.source !== selectedNodeId && edge.target !== selectedNodeId,
              ),
            },
          },
        };
      },
      {
        selectedNodeId: null,
        editingNodeId: null,
      },
    );
  }

  function handleConvertSelectedNodeToJump() {
    if (!selectedNode || selectedNode.data.kind === 'jump') {
      return;
    }

    applyWorkspaceMutation((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      if (!graph) {
        return currentWorkspace;
      }

      return {
        ...currentWorkspace,
        graphs: {
          ...currentWorkspace.graphs,
          [graph.id]: {
            ...graph,
            nodes: graph.nodes.map((node) =>
              node.id === selectedNode.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      kind: 'jump',
                      jumpLink: {
                        targetGraphId: null,
                      },
                    },
                  }
                : node,
            ),
          },
        },
      };
    });
  }

  function handleUnsetSelectedJumpNode() {
    if (!selectedNode || selectedNode.data.kind !== 'jump') {
      return;
    }

    applyWorkspaceMutation((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      if (!graph) {
        return currentWorkspace;
      }

      return {
        ...currentWorkspace,
        graphs: {
          ...currentWorkspace.graphs,
          [graph.id]: {
            ...graph,
            nodes: graph.nodes.map((node) =>
              node.id === selectedNode.id
                ? {
                    ...node,
                    data: {
                      title: node.data.title,
                      noteId: node.data.noteId,
                      kind: 'default',
                    },
                  }
                : node,
            ),
          },
        },
      };
    });
  }

  function handleSetSelectedJumpTargetGraph(targetGraphId: GraphId | null) {
    if (!selectedNode || selectedNode.data.kind !== 'jump') {
      return;
    }

    applyWorkspaceMutation((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      if (!graph) {
        return currentWorkspace;
      }

      return {
        ...currentWorkspace,
        graphs: {
          ...currentWorkspace.graphs,
          [graph.id]: {
            ...graph,
            nodes: graph.nodes.map((node) =>
              node.id === selectedNode.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      kind: 'jump',
                      jumpLink: {
                        targetGraphId,
                      },
                    },
                  }
                : node,
            ),
          },
        },
      };
    });
  }

  function handleEnterLinkedGraph(targetGraphId: GraphId) {
    if (!workspace.graphs[targetGraphId]) {
      return;
    }

    setSelectedNodeId(null);
    setEditingNodeId(null);
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      currentGraphId: targetGraphId,
    }));
  }

  function handleFitView() {
    setImportError(null);
    canvasViewportApi?.fitView();
  }

  function handleZoomIn() {
    setImportError(null);
    canvasViewportApi?.zoomIn();
  }

  function handleZoomOut() {
    setImportError(null);
    canvasViewportApi?.zoomOut();
  }

  function handleCenterSelected() {
    if (!selectedNode) {
      return;
    }

    setImportError(null);
    canvasViewportApi?.centerOnNode(selectedNode);
  }

  function handleExportCurrentGraph() {
    if (!currentGraph) {
      return;
    }

    setImportError(null);
    downloadJson(
      exportCurrentGraphData(currentGraph, workspace.notes),
      `${currentGraph.id}.json`,
    );
  }

  function handleExportWorkspace() {
    setImportError(null);
    downloadJson(exportWorkspaceData(workspace), 'mymind-workspace.json');
  }

  const handleImportData = useCallback(
    async (file: File) => {
      const raw = await file.text();
      const parsed = parseImportedData(raw);
      const importedData = parsed.data;

      if (!importedData) {
        setImportError(parsed.error);
        return;
      }

      setSelectedNodeId(null);
      setEditingNodeId(null);
      setActiveMarkdownId(null);
      setImportError(null);

      if (importedData.kind === 'workspace') {
        setWorkspace(importedData.data);
        return;
      }

      setWorkspace((currentWorkspace) => {
        const nextBundle = assignImportedGraphBundle(
          currentWorkspace,
          importedData.data.graph,
          importedData.data.notes,
        );

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [nextBundle.graph.id]: nextBundle.graph,
          },
          notes: {
            ...currentWorkspace.notes,
            ...nextBundle.notes,
          },
          graphOrder: [...currentWorkspace.graphOrder, nextBundle.graph.id],
          noteOrder: [...currentWorkspace.noteOrder, ...nextBundle.noteOrder],
          currentGraphId: nextBundle.graph.id,
        };
      });
    },
    [setWorkspace],
  );

  function handleSelectMarkdown(noteId: NoteId) {
    setActiveMarkdownId(noteId);
  }

  function handleCreateMarkdown() {
    const nextTitleInput = window.prompt(
      '请输入新的 Markdown 名称',
      DEFAULT_NEW_MARKDOWN_TITLE,
    );

    if (!nextTitleInput?.trim()) {
      return;
    }

    const noteId = createNoteId();

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const noteTitle = getUniqueMarkdownTitle(
          currentWorkspace.notes,
          currentWorkspace.noteOrder,
          nextTitleInput,
        );
        const note = createDefaultNoteForNode(noteId, noteTitle);

        return {
          ...currentWorkspace,
          notes: {
            ...currentWorkspace.notes,
            [noteId]: note,
          },
          noteOrder: [...currentWorkspace.noteOrder, noteId],
        };
      },
      {
        activeMarkdownId: noteId,
      },
    );
  }

  function handleRenameActiveMarkdown() {
    if (!activeMarkdownId || !workspace.notes[activeMarkdownId]) {
      return;
    }

    const nextTitleInput = window.prompt(
      '请输入新的 Markdown 名称',
      workspace.notes[activeMarkdownId].title,
    );

    if (!nextTitleInput?.trim()) {
      return;
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      notes: {
        ...currentWorkspace.notes,
        [activeMarkdownId]: {
          ...currentWorkspace.notes[activeMarkdownId],
          title: getUniqueMarkdownTitle(
            currentWorkspace.notes,
            currentWorkspace.noteOrder,
            nextTitleInput,
            activeMarkdownId,
          ),
        },
      },
    }));
  }

  function handleDeleteActiveMarkdown() {
    if (!activeMarkdownId || !workspace.notes[activeMarkdownId]) {
      return;
    }

    const note = workspace.notes[activeMarkdownId];
    const usageRecords = noteUsageIndex[activeMarkdownId] ?? [];

    if (
      !window.confirm(
        buildDeleteMarkdownMessage(
          note.title,
          usageRecords.map((record) => ({
            graphTitle: record.graphTitle,
            nodeTitle: record.nodeTitle,
          })),
        ),
      )
    ) {
      return;
    }

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const nextNotes = { ...currentWorkspace.notes };

        delete nextNotes[activeMarkdownId];

        return {
          ...currentWorkspace,
          notes: nextNotes,
          noteOrder: currentWorkspace.noteOrder.filter(
            (noteId) => noteId !== activeMarkdownId,
          ),
          graphs: Object.fromEntries(
            Object.entries(currentWorkspace.graphs).map(([graphId, graph]) => [
              graphId,
              {
                ...graph,
                nodes: graph.nodes.map((node) =>
                  node.data.noteId === activeMarkdownId
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          noteId: null,
                        },
                      }
                    : node,
                ),
              },
            ]),
          ) as WorkspaceState['graphs'],
        };
      },
      {
        activeMarkdownId: null,
      },
    );
  }

  if (!currentGraph) {
    return null;
  }

  const toolbarPane = (
    <ToolbarPane
      availableJumpTargetGraphs={availableJumpTargetGraphs}
      canConvertSelectedNodeToJump={Boolean(
        selectedNode && selectedNode.data.kind !== 'jump',
      )}
      canDeleteActiveMarkdown={Boolean(activeMarkdownId && workspace.notes[activeMarkdownId])}
      canDeleteCurrentGraph={workspace.graphOrder.length > 1}
      canDeleteSelectedNode={Boolean(selectedNode)}
      canRenameActiveMarkdown={Boolean(activeMarkdownId && workspace.notes[activeMarkdownId])}
      canUnsetSelectedJumpNode={selectedNode?.data.kind === 'jump'}
      graphItems={graphItems}
      importError={importError}
      info={{
        currentGraphTitle: currentGraph.title,
        nodeCount: currentGraph.nodes.length,
        edgeCount: currentGraph.edges.length,
        selectedNodeTitle: selectedNode?.data.title ?? null,
      }}
      isMobile={isMobile}
      markdownItems={markdownItems}
      mode={mode}
      onConvertSelectedNodeToJump={handleConvertSelectedNodeToJump}
      onCreateGraph={handleCreateGraph}
      onCreateMarkdown={handleCreateMarkdown}
      onCreateNode={handleCreateNode}
      onDeleteActiveMarkdown={handleDeleteActiveMarkdown}
      onDeleteCurrentGraph={handleDeleteCurrentGraph}
      onDeleteSelectedNode={handleDeleteSelectedNode}
      onExportCurrentGraph={handleExportCurrentGraph}
      onExportWorkspace={handleExportWorkspace}
      onImportData={handleImportData}
      onModeChange={setMode}
      onRenameActiveMarkdown={handleRenameActiveMarkdown}
      onRenameCurrentGraph={handleRenameCurrentGraph}
      onSelectGraph={handleSelectGraph}
      onSelectMarkdown={handleSelectMarkdown}
      onSetSelectedJumpTargetGraph={handleSetSelectedJumpTargetGraph}
      onThemeToggle={toggleTheme}
      onUnsetSelectedJumpNode={handleUnsetSelectedJumpNode}
      selectedJumpTargetGraphId={selectedJumpTargetGraphId}
      theme={theme}
    />
  );

  const canvasPane = (
    <CanvasPane
      canCenterSelected={Boolean(selectedNode)}
      currentGraphId={currentGraph.id}
      editingNodeId={editingNodeId}
      edges={currentGraph.edges}
      isMobile={isMobile}
      nodes={currentGraph.nodes.map((node) => {
        const targetGraphId = node.data.jumpLink?.targetGraphId ?? null;

        return {
          ...node,
          type: node.data.kind === 'jump' ? 'jump' : 'mind',
          data: {
            ...node.data,
            targetGraphTitle: targetGraphId
              ? workspace.graphs[targetGraphId]?.title ?? null
              : null,
            targetGraphMissing: Boolean(
              targetGraphId && !workspace.graphs[targetGraphId],
            ),
            canEnterLinkedGraph: Boolean(
              node.data.kind === 'jump' &&
                targetGraphId &&
                workspace.graphs[targetGraphId],
            ),
          },
        };
      })}
      onCenterSelected={handleCenterSelected}
      onCommitNodeTitleEdit={handleCommitNodeTitleEdit}
      onConnectEdge={handleConnectEdge}
      onCreateChildNodeFromSelection={handleCreateChildNodeFromSelection}
      onCreateSiblingNodeFromSelection={handleCreateSiblingNodeFromSelection}
      onDeleteSelectedNodeByShortcut={handleDeleteSelectedNode}
      onEdgesChange={handleEdgesChange}
      onEnterLinkedGraph={handleEnterLinkedGraph}
      onFitView={handleFitView}
      onNodesChange={handleNodesChange}
      onSelectNode={handleSelectNode}
      onStartNodeTitleEdit={handleStartNodeTitleEdit}
      onCancelNodeTitleEdit={handleCancelNodeTitleEdit}
      onViewportApiReady={setCanvasViewportApi}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      selectedNodeId={selectedNodeId}
    />
  );

  const markdownPane = (
    <MarkdownPane
      isMobile={isMobile}
      selectedNode={selectedNode}
      selectedNote={selectedNote}
    />
  );

  return (
    <div className="app-shell" data-theme={theme} data-viewport-mode={viewportMode}>
      {isMobile ? (
        <MobileWorkspaceLayout
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
          panes={{
            canvas: canvasPane,
            markdown: markdownPane,
            toolbar: toolbarPane,
          }}
        />
      ) : (
        <ThreePaneLayout
          mode={mode}
          sizes={sizes}
          onSizesChange={setSizes}
          panes={{
            A: toolbarPane,
            B: canvasPane,
            C: markdownPane,
          }}
        />
      )}
    </div>
  );
}

export default App;
