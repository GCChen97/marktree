import { useCallback, useEffect, useMemo, useState } from 'react';
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
  NoteRecord,
} from './types/graph';
import type { MobilePaneTab } from './types/layout';
import {
  DEFAULT_NEW_GRAPH_TITLE,
  DEFAULT_NEW_NODE_POSITION,
  assignImportedGraphId,
  buildGraphReferenceIndex,
  clearGraphReferences,
  createDefaultNodeAtPosition,
  createDefaultNoteForNode,
  createGraphId,
  createNodeId,
  exportCurrentGraphData,
  exportWorkspaceData,
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

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();
  const { workspace, setWorkspace } = usePersistentWorkspaceState();
  const { viewportMode, isMobile } = useResponsiveMode();
  const { theme, toggleTheme } = useThemePreference();
  const [canvasViewportApi, setCanvasViewportApi] =
    useState<CanvasViewportApi | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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

  const selectedNode = useMemo(
    () => currentGraph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [currentGraph, selectedNodeId],
  );
  const selectedNote = useMemo<NoteRecord | null>(() => {
    if (!selectedNode || !currentGraph) {
      return null;
    }

    return currentGraph.notes[selectedNode.data.noteId] ?? null;
  }, [currentGraph, selectedNode]);

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

  const jumpTargetStatus = useMemo(() => {
    if (selectedNode?.data.kind !== 'jump') {
      return null;
    }

    const targetGraphId = selectedNode.data.jumpLink?.targetGraphId ?? null;

    if (!targetGraphId) {
      return '未设置目标 graph';
    }

    if (workspace.graphs[targetGraphId]) {
      return `当前指向：${workspace.graphs[targetGraphId].title}`;
    }

    return '目标 graph 不存在';
  }, [selectedNode, workspace.graphs]);

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
    }
  }, [currentGraph, selectedNodeId]);

  const updateCurrentGraph = useCallback(
    (
      updater: (graph: typeof currentGraph) => typeof currentGraph,
      nextSelectedNodeId?: string | null,
    ) => {
      if (!currentGraph) {
        return;
      }

      setWorkspace((currentWorkspace) => {
        const graph = currentWorkspace.graphs[currentWorkspace.currentGraphId];

        if (!graph) {
          return currentWorkspace;
        }

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [graph.id]: updater(graph),
          },
        };
      });

      if (nextSelectedNodeId !== undefined) {
        setSelectedNodeId(nextSelectedNodeId);
      }
    },
    [currentGraph, setWorkspace],
  );

  function handleNodesChange(nodes: KnowledgeNode[]) {
    updateCurrentGraph((graph) => ({
      ...graph,
      nodes,
    }));
  }

  function handleEdgesChange(edges: KnowledgeEdge[]) {
    updateCurrentGraph((graph) => ({
      ...graph,
      edges,
    }));
  }

  function handleSelectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
  }

  function handleSelectGraph(graphId: GraphId) {
    setImportError(null);
    setSelectedNodeId(null);
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      currentGraphId: graphId,
    }));
  }

  function handleCreateGraph() {
    const graphId = createGraphId();
    const rootNodeId = createNodeId();
    const nextGraph = createNewGraphDocument(
      graphId,
      DEFAULT_NEW_GRAPH_TITLE,
      rootNodeId,
    );

    setImportError(null);
    setSelectedNodeId(null);
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      graphs: {
        ...currentWorkspace.graphs,
        [graphId]: nextGraph,
      },
      graphOrder: [...currentWorkspace.graphOrder, graphId],
      currentGraphId: graphId,
    }));
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

  function buildDeleteGraphMessage(records: GraphReferenceRecord[]) {
    const referringTitles = [...new Set(records.map((record) => record.sourceGraphTitle))];

    if (referringTitles.length === 0 || !currentGraph) {
      return `确定要删除 graph「${currentGraph?.title ?? ''}」吗？`;
    }

    return [
      `以下 graph 正在引用「${currentGraph.title}」：`,
      ...referringTitles.map((title) => `- ${title}`),
      '',
      '删除后，这些跳转节点会失去目标 graph。',
      '确定继续删除吗？',
    ].join('\n');
  }

  function handleDeleteCurrentGraph() {
    if (!currentGraph || workspace.graphOrder.length <= 1) {
      return;
    }

    const incomingReferences = referenceIndex[currentGraph.id] ?? [];

    if (!window.confirm(buildDeleteGraphMessage(incomingReferences))) {
      return;
    }

    setImportError(null);
    setSelectedNodeId(null);
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
    const nodeId = createNodeId();
    const position =
      canvasViewportApi?.getCanvasCenterPosition() ?? DEFAULT_NEW_NODE_POSITION;
    const nextNode = createDefaultNodeAtPosition(nodeId, position);
    const nextNote = createDefaultNoteForNode(nodeId);

    setImportError(null);
    updateCurrentGraph(
      (graph) => ({
        ...graph,
        nodes: [...graph.nodes, nextNode],
        notes: {
          ...graph.notes,
          [nodeId]: nextNote,
        },
      }),
      nodeId,
    );
  }

  function handleDeleteSelectedNode() {
    if (!selectedNodeId || !currentGraph) {
      return;
    }

    const noteIdToDelete = selectedNode?.data.noteId ?? null;

    setImportError(null);
    updateCurrentGraph(
      (graph) => {
        const nextNotes = { ...graph.notes };

        if (noteIdToDelete) {
          delete nextNotes[noteIdToDelete];
        }

        return {
          ...graph,
          nodes: graph.nodes.filter((node) => node.id !== selectedNodeId),
          edges: graph.edges.filter(
            (edge) =>
              edge.source !== selectedNodeId && edge.target !== selectedNodeId,
          ),
          notes: nextNotes,
        };
      },
      null,
    );
  }

  function handleConvertSelectedNodeToJump() {
    if (!selectedNode || selectedNode.data.kind === 'jump') {
      return;
    }

    updateCurrentGraph((graph) => ({
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
    }));
  }

  function handleUnsetSelectedJumpNode() {
    if (!selectedNode || selectedNode.data.kind !== 'jump') {
      return;
    }

    updateCurrentGraph((graph) => ({
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
    }));
  }

  function handleSetSelectedJumpTargetGraph(targetGraphId: GraphId | null) {
    if (!selectedNode || selectedNode.data.kind !== 'jump') {
      return;
    }

    updateCurrentGraph((graph) => ({
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
    }));
  }

  function handleEnterLinkedGraph(targetGraphId: GraphId) {
    if (!workspace.graphs[targetGraphId]) {
      return;
    }

    setSelectedNodeId(null);
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
    downloadJson(exportCurrentGraphData(currentGraph), `${currentGraph.id}.json`);
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
      setImportError(null);

      if (importedData.kind === 'workspace') {
        setWorkspace(importedData.data);
        return;
      }

      setWorkspace((currentWorkspace) => {
        const nextGraph = assignImportedGraphId(
          currentWorkspace,
          importedData.data,
        );

        return {
          ...currentWorkspace,
          graphs: {
            ...currentWorkspace.graphs,
            [nextGraph.id]: nextGraph,
          },
          graphOrder: [...currentWorkspace.graphOrder, nextGraph.id],
          currentGraphId: nextGraph.id,
        };
      });
    },
    [setWorkspace],
  );

  if (!currentGraph) {
    return null;
  }

  const toolbarPane = (
    <ToolbarPane
      availableJumpTargetGraphs={availableJumpTargetGraphs}
      canCenterSelected={Boolean(selectedNode)}
      canConvertSelectedNodeToJump={Boolean(
        selectedNode && selectedNode.data.kind !== 'jump',
      )}
      canDeleteCurrentGraph={workspace.graphOrder.length > 1}
      canDeleteSelectedNode={Boolean(selectedNode)}
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
      jumpTargetStatus={jumpTargetStatus}
      mode={mode}
      onCenterSelected={handleCenterSelected}
      onConvertSelectedNodeToJump={handleConvertSelectedNodeToJump}
      onCreateGraph={handleCreateGraph}
      onCreateNode={handleCreateNode}
      onDeleteCurrentGraph={handleDeleteCurrentGraph}
      onDeleteSelectedNode={handleDeleteSelectedNode}
      onExportCurrentGraph={handleExportCurrentGraph}
      onExportWorkspace={handleExportWorkspace}
      onFitView={handleFitView}
      onImportData={handleImportData}
      onModeChange={setMode}
      onRenameCurrentGraph={handleRenameCurrentGraph}
      onSelectGraph={handleSelectGraph}
      onSetSelectedJumpTargetGraph={handleSetSelectedJumpTargetGraph}
      onThemeToggle={toggleTheme}
      onUnsetSelectedJumpNode={handleUnsetSelectedJumpNode}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      selectedJumpNodeTitle={
        selectedNode?.data.kind === 'jump' ? selectedNode.data.title : null
      }
      selectedJumpTargetGraphId={selectedJumpTargetGraphId}
      theme={theme}
    />
  );

  const canvasPane = (
    <CanvasPane
      currentGraphId={currentGraph.id}
      edges={currentGraph.edges}
      isMobile={isMobile}
      nodes={currentGraph.nodes.map((node) => {
        const targetGraphId = node.data.jumpLink?.targetGraphId ?? null;

        return {
          ...node,
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
      onEdgesChange={handleEdgesChange}
      onEnterLinkedGraph={handleEnterLinkedGraph}
      onNodesChange={handleNodesChange}
      onSelectNode={handleSelectNode}
      onViewportApiReady={setCanvasViewportApi}
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
