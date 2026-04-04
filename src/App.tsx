import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Connection } from '@xyflow/react';
import { MobileWorkspaceLayout } from './components/layout/MobileWorkspaceLayout';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { CanvasPane } from './components/panes/CanvasPane';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { ToolbarPane } from './components/panes/ToolbarPane';
import {
  createDefaultWorkspaceState,
  createNewGraphDocument,
} from './data/defaultGraph';
import { usePersistentLayoutState } from './hooks/usePersistentLayoutState';
import { usePersistentWorkspaceState } from './hooks/usePersistentWorkspaceState';
import { useResponsiveMode } from './hooks/useResponsiveMode';
import { useThemePreference } from './hooks/useThemePreference';
import type {
  CanvasViewportApi,
  GraphDocument,
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

function setGraphSelectedNodes(graph: GraphDocument, nodeIds: string[]) {
  const selectedNodeIdSet = new Set(nodeIds);

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      selected: selectedNodeIdSet.has(node.id),
    })),
  };
}

function clearGraphSelectedNodes(graph: GraphDocument) {
  return setGraphSelectedNodes(graph, []);
}

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();
  const {
    workspace,
    setWorkspace,
    isLoading,
    loadError,
    dataMode,
    isReadOnly,
    localDataDirectoryState,
    selectDataDirectory,
    saveWorkspaceNow,
  } = usePersistentWorkspaceState();
  const { viewportMode, isMobile } = useResponsiveMode();
  const { theme, toggleTheme } = useThemePreference();
  const [canvasViewportApi, setCanvasViewportApi] =
    useState<CanvasViewportApi | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [activeMarkdownId, setActiveMarkdownId] = useState<NoteId | null>(null);
  const [editingGraphId, setEditingGraphId] = useState<GraphId | null>(null);
  const [editingMarkdownId, setEditingMarkdownId] = useState<NoteId | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] =
    useState<MobilePaneTab>('canvas');
  const workspaceState = useMemo(
    () => workspace ?? createDefaultWorkspaceState(),
    [workspace],
  );

  const currentGraph =
    workspaceState.graphs[workspaceState.currentGraphId] ??
    workspaceState.graphs[workspaceState.graphOrder[0]];

  const referenceIndex = useMemo(
    () => buildGraphReferenceIndex(workspaceState),
    [workspaceState],
  );

  const noteUsageIndex = useMemo(
    () => buildNoteUsageIndex(workspaceState),
    [workspaceState],
  );

  const selectedNodeIds = useMemo(
    () => currentGraph?.nodes.filter((node) => Boolean(node.selected)).map((node) => node.id) ?? [],
    [currentGraph],
  );

  const primarySelectedNodeId =
    selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  const selectedNode = useMemo(
    () =>
      currentGraph?.nodes.find((node) => node.id === primarySelectedNodeId) ??
      null,
    [currentGraph, primarySelectedNodeId],
  );

  const selectedNote = useMemo<NoteRecord | null>(() => {
    const noteId = selectedNode?.data.noteId;

    if (!noteId) {
      return null;
    }

    return workspaceState.notes[noteId] ?? null;
  }, [selectedNode, workspaceState.notes]);

  const graphItems = useMemo(
    () =>
      workspaceState.graphOrder.map((graphId) => ({
        id: graphId,
        title: workspaceState.graphs[graphId]?.title ?? graphId,
        isCurrent: graphId === workspaceState.currentGraphId,
        incomingReferenceCount: referenceIndex[graphId]?.length ?? 0,
      })),
    [
      referenceIndex,
      workspaceState.currentGraphId,
      workspaceState.graphOrder,
      workspaceState.graphs,
    ],
  );

  const markdownItems = useMemo(
    () =>
      workspaceState.noteOrder.map((noteId) => ({
        id: noteId,
        title: workspaceState.notes[noteId]?.title ?? noteId,
        usageCount: noteUsageIndex[noteId]?.length ?? 0,
        isActive: noteId === activeMarkdownId,
        isLinkedToSelectedNode: noteId === (selectedNode?.data.noteId ?? null),
      })),
    [
      activeMarkdownId,
      noteUsageIndex,
      selectedNode,
      workspaceState.noteOrder,
      workspaceState.notes,
    ],
  );

  const availableJumpTargetGraphs = useMemo(
    () =>
      workspaceState.graphOrder
        .filter((graphId) => graphId !== workspaceState.currentGraphId)
        .map((graphId) => ({
          id: graphId,
          title: workspaceState.graphs[graphId]?.title ?? graphId,
        })),
    [
      workspaceState.currentGraphId,
      workspaceState.graphOrder,
      workspaceState.graphs,
    ],
  );

  const selectedJumpTargetGraphId =
    selectedNode?.data.kind === 'jump'
      ? selectedNode.data.jumpLink?.targetGraphId ?? null
      : null;

  const applyWorkspaceMutation = useCallback(
    (
      updater: (currentWorkspace: WorkspaceState) => WorkspaceState,
      nextUiState?: {
        editingNodeId?: string | null;
        activeMarkdownId?: NoteId | null;
      },
    ) => {
      if (isReadOnly) {
        return;
      }

      setWorkspace((currentWorkspace) => updater(currentWorkspace));

      if (nextUiState && 'editingNodeId' in nextUiState) {
        setEditingNodeId(nextUiState.editingNodeId ?? null);
      }

      if (nextUiState && 'activeMarkdownId' in nextUiState) {
        setActiveMarkdownId(nextUiState.activeMarkdownId ?? null);
      }
    },
    [isReadOnly, setWorkspace],
  );

  useEffect(() => {
    if (viewportMode === 'mobile') {
      setMobileActiveTab('canvas');
    }
  }, [viewportMode]);

  useEffect(() => {
    const availableNodeIds = new Set(currentGraph?.nodes.map((node) => node.id) ?? []);

    if (editingNodeId && !availableNodeIds.has(editingNodeId)) {
      setEditingNodeId(null);
    }
  }, [currentGraph, editingNodeId, selectedNodeIds]);

  useEffect(() => {
    if (selectedNode) {
      setActiveMarkdownId(selectedNode.data.noteId ?? null);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (activeMarkdownId && !workspaceState.notes[activeMarkdownId]) {
      setActiveMarkdownId(null);
    }
  }, [activeMarkdownId, workspaceState.notes]);

  if (isLoading) {
    return (
      <div className="app-shell" data-theme={theme} data-viewport-mode={viewportMode}>
        <div className="pane-content">
          <p className="pane-eyebrow">Loading</p>
          <h1 className="pane-title">正在加载仓库数据</h1>
          <p className="pane-description">稍等一下，正在读取 `public/data` 下的 graph 和 markdown 文件。</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-shell" data-theme={theme} data-viewport-mode={viewportMode}>
        <div className="pane-content">
          <p className="pane-eyebrow">Repo Data</p>
          <h1 className="pane-title">无法加载仓库数据</h1>
          <p className="pane-description">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="app-shell" data-theme={theme} data-viewport-mode={viewportMode}>
        <div className="pane-content">
          <p className="pane-eyebrow">Repo Data</p>
          <h1 className="pane-title">仓库数据为空</h1>
          <p className="pane-description">
            没有成功解析出可用的 workspace。请检查 `public/data/manifest.json`
            和对应的 graph / note 文件是否存在且结构正确。
          </p>
        </div>
      </div>
    );
  }

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

  function handleStartNodeTitleEdit(nodeId: string) {
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
            [graph.id]: setGraphSelectedNodes(graph, [nodeId]),
          },
        };
      },
      {
        editingNodeId: nodeId,
      },
    );
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
        editingNodeId: null,
      },
    );
  }

  function handleCancelNodeTitleEdit() {
    setEditingNodeId(null);
  }

  function handleSelectGraph(graphId: GraphId) {
    setImportError(null);
    setEditingNodeId(null);
    setEditingGraphId(null);
    setWorkspace((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      return {
        ...currentWorkspace,
        currentGraphId: graphId,
        graphs: graph
          ? {
              ...currentWorkspace.graphs,
              [graph.id]: clearGraphSelectedNodes(graph),
            }
          : currentWorkspace.graphs,
      };
    });
  }

  function handleCreateGraph() {
    const graphId = createGraphId();
    const rootNodeId = createNodeId();

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const nextGraph = createNewGraphDocument(
          graphId,
          DEFAULT_NEW_GRAPH_TITLE,
          rootNodeId,
        );

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graphId]: nextGraph,
          },
          graphOrder: [...currentWorkspace.graphOrder, graphId],
          currentGraphId: graphId,
        };
      },
      {
        editingNodeId: null,
        activeMarkdownId: null,
      },
    );
    setImportError(null);
  }

  function handleCommitGraphRename(graphId: GraphId, title: string) {
    if (isReadOnly) {
      return;
    }

    const nextTitle = title.trim();

    if (!nextTitle) {
      setEditingGraphId(null);
      return;
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      graphs: {
        ...currentWorkspace.graphs,
        [graphId]: {
          ...currentWorkspace.graphs[graphId],
          title: nextTitle.trim(),
        },
      },
    }));
    setEditingGraphId(null);
  }

  function handleDeleteCurrentGraph() {
    if (!currentGraph || workspaceState.graphOrder.length <= 1 || isReadOnly) {
      return;
    }

    const incomingReferences = referenceIndex[currentGraph.id] ?? [];

    if (!window.confirm(buildDeleteGraphMessage(currentGraph.title, incomingReferences))) {
      return;
    }

    setImportError(null);
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

    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        const node = createDefaultNodeAtPosition(nodeId, null, position);

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: [
                ...graph.nodes.map((currentNode) => ({
                  ...currentNode,
                  selected: false,
                })),
                {
                  ...node,
                  selected: true,
                },
              ],
            },
          },
        };
      },
      {
        editingNodeId: nodeId,
        activeMarkdownId: null,
      },
    );
    setImportError(null);
  }

  function handleCreateChildNodeFromSelection() {
    if (!selectedNode || !currentGraph) {
      return;
    }

    const nodeId = createNodeId();
    applyWorkspaceMutation(
      (currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        const node = createDefaultNodeAtPosition(nodeId, null, {
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
              nodes: [
                ...graph.nodes.map((currentNode) => ({
                  ...currentNode,
                  selected: false,
                })),
                {
                  ...node,
                  selected: true,
                },
              ],
              edges: [...graph.edges, nextEdge],
            },
          },
        };
      },
      {
        editingNodeId: nodeId,
        activeMarkdownId: null,
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

        const node = createDefaultNodeAtPosition(nodeId, null, nextPosition);

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: {
              ...graph,
              nodes: [
                ...graph.nodes.map((currentNode) => ({
                  ...currentNode,
                  selected: false,
                })),
                {
                  ...node,
                  selected: true,
                },
              ],
              edges: nextEdge ? [...graph.edges, nextEdge] : graph.edges,
            },
          },
        };
      },
      {
        editingNodeId: nodeId,
        activeMarkdownId: null,
      },
    );
    setImportError(null);
  }

  function handleDeleteSelectedNodes() {
    if (selectedNodeIds.length === 0 || !currentGraph) {
      return;
    }

    const nodeIdsToDelete = new Set(selectedNodeIds);

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
              nodes: graph.nodes.filter((node) => !nodeIdsToDelete.has(node.id)),
              edges: graph.edges.filter(
                (edge) =>
                  !nodeIdsToDelete.has(edge.source) &&
                  !nodeIdsToDelete.has(edge.target),
              ),
            },
          },
        };
      },
      {
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
    if (!workspaceState.graphs[targetGraphId]) {
      return;
    }

    setEditingNodeId(null);
    setWorkspace((currentWorkspace) => {
      const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

      return {
        ...currentWorkspace,
        currentGraphId: targetGraphId,
        graphs: graph
          ? {
              ...currentWorkspace.graphs,
              [graph.id]: clearGraphSelectedNodes(graph),
            }
          : currentWorkspace.graphs,
      };
    });
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
      exportCurrentGraphData(currentGraph, workspaceState.notes),
      `${currentGraph.id}.json`,
    );
  }

  function handleExportWorkspace() {
    setImportError(null);
    downloadJson(exportWorkspaceData(workspaceState), 'mymind-workspace.json');
  }

  async function handleImportData(file: File) {
    if (isReadOnly) {
      return;
    }

    const raw = await file.text();
    const parsed = parseImportedData(raw);
    const importedData = parsed.data;

    if (!importedData) {
      setImportError(parsed.error);
      return;
    }

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
  }

  function handleSelectMarkdown(noteId: NoteId) {
    setEditingMarkdownId(null);
    setActiveMarkdownId(noteId);
  }

  function handleCreateMarkdown() {
    if (isReadOnly) {
      return;
    }

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

  function handleCommitMarkdownRename(noteId: NoteId, title: string) {
    if (!workspaceState.notes[noteId] || isReadOnly) {
      return;
    }

    const nextTitleInput = title.trim();

    if (!nextTitleInput) {
      setEditingMarkdownId(null);
      return;
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      notes: {
        ...currentWorkspace.notes,
        [noteId]: {
          ...currentWorkspace.notes[noteId],
          title: getUniqueMarkdownTitle(
            currentWorkspace.notes,
            currentWorkspace.noteOrder,
            nextTitleInput,
            noteId,
          ),
        },
      },
    }));
    setEditingMarkdownId(null);
  }

  function handleDeleteActiveMarkdown() {
    if (!activeMarkdownId || !workspaceState.notes[activeMarkdownId] || isReadOnly) {
      return;
    }

    const note = workspaceState.notes[activeMarkdownId];
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
      canSaveDataFiles={Boolean(
        dataMode === 'author-local' && localDataDirectoryState.hasWritableDirectory,
      )}
      canConvertSelectedNodeToJump={Boolean(
        selectedNode && selectedNode.data.kind !== 'jump',
      )}
      canDeleteActiveMarkdown={Boolean(
        activeMarkdownId && workspaceState.notes[activeMarkdownId],
      )}
      canDeleteCurrentGraph={workspaceState.graphOrder.length > 1}
      canDeleteSelectedNode={selectedNodeIds.length > 0}
      canRenameActiveMarkdown={Boolean(
        activeMarkdownId && workspaceState.notes[activeMarkdownId],
      )}
      canUnsetSelectedJumpNode={selectedNode?.data.kind === 'jump'}
      dataMode={dataMode}
      directoryError={localDataDirectoryState.lastError}
      directoryName={localDataDirectoryState.directoryName}
      graphItems={graphItems}
      importError={importError}
      info={{
        currentGraphTitle: currentGraph.title,
        nodeCount: currentGraph.nodes.length,
        edgeCount: currentGraph.edges.length,
        selectedNodeTitle: selectedNode?.data.title ?? null,
      }}
      isReadOnly={isReadOnly}
      isMobile={isMobile}
      markdownItems={markdownItems}
      mode={mode}
      editingGraphId={editingGraphId}
      editingMarkdownId={editingMarkdownId}
      onCommitGraphRename={handleCommitGraphRename}
      onCommitMarkdownRename={handleCommitMarkdownRename}
      onConvertSelectedNodeToJump={handleConvertSelectedNodeToJump}
      onCreateGraph={handleCreateGraph}
      onCreateMarkdown={handleCreateMarkdown}
      onCreateNode={handleCreateNode}
      onDeleteActiveMarkdown={handleDeleteActiveMarkdown}
      onDeleteCurrentGraph={handleDeleteCurrentGraph}
      onDeleteSelectedNode={handleDeleteSelectedNodes}
      onExportCurrentGraph={handleExportCurrentGraph}
      onExportWorkspace={handleExportWorkspace}
      onImportData={handleImportData}
      onModeChange={setMode}
      onStartGraphRename={setEditingGraphId}
      onStartMarkdownRename={setEditingMarkdownId}
      onSaveDataFiles={() => {
        void saveWorkspaceNow();
      }}
      onSelectGraph={handleSelectGraph}
      onSelectDataDirectory={() => {
        void selectDataDirectory();
      }}
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
      isReadOnly={isReadOnly}
      isMobile={isMobile}
      nodes={currentGraph.nodes.map((node) => {
        const targetGraphId = node.data.jumpLink?.targetGraphId ?? null;

        return {
          ...node,
          type: node.data.kind === 'jump' ? 'jump' : 'mind',
          data: {
            ...node.data,
            targetGraphTitle: targetGraphId
              ? workspaceState.graphs[targetGraphId]?.title ?? null
              : null,
            targetGraphMissing: Boolean(
              targetGraphId && !workspaceState.graphs[targetGraphId],
            ),
            canEnterLinkedGraph: Boolean(
              node.data.kind === 'jump' &&
                targetGraphId &&
                workspaceState.graphs[targetGraphId],
            ),
          },
        };
      })}
      onCenterSelected={handleCenterSelected}
      onCommitNodeTitleEdit={handleCommitNodeTitleEdit}
      onConnectEdge={handleConnectEdge}
      onCreateNode={handleCreateNode}
      onCreateChildNodeFromSelection={handleCreateChildNodeFromSelection}
      onCreateSiblingNodeFromSelection={handleCreateSiblingNodeFromSelection}
      onDeleteSelectedNodesByShortcut={handleDeleteSelectedNodes}
      onEdgesChange={handleEdgesChange}
      onEnterLinkedGraph={handleEnterLinkedGraph}
      onFitView={handleFitView}
      onNodesChange={handleNodesChange}
      onStartNodeTitleEdit={handleStartNodeTitleEdit}
      onCancelNodeTitleEdit={handleCancelNodeTitleEdit}
      onViewportApiReady={setCanvasViewportApi}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
    />
  );

  const markdownPane = (
    <MarkdownPane
      hasMultipleSelection={selectedNodeIds.length > 1}
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
