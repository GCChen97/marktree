import { useCallback, useMemo, useState } from 'react';
import { CanvasPane } from './components/panes/CanvasPane';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { ToolbarPane } from './components/panes/ToolbarPane';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { createDefaultGraphState } from './data/defaultGraph';
import { usePersistentGraphState } from './hooks/usePersistentGraphState';
import { usePersistentLayoutState } from './hooks/usePersistentLayoutState';
import { useThemePreference } from './hooks/useThemePreference';
import type {
  CanvasViewportApi,
  KnowledgeEdge,
  KnowledgeNode,
  NoteRecord,
} from './types/graph';
import {
  DEFAULT_NEW_NODE_POSITION,
  createDefaultNodeAtPosition,
  createDefaultNoteForNode,
  createNodeId,
  exportGraphData,
  parseImportedGraph,
} from './utils/graph';

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();
  const { graph, setGraph } = usePersistentGraphState();
  const { theme, toggleTheme } = useThemePreference();
  const [canvasViewportApi, setCanvasViewportApi] =
    useState<CanvasViewportApi | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === graph.selectedNodeId) ?? null,
    [graph.nodes, graph.selectedNodeId],
  );
  const selectedNote = useMemo<NoteRecord | null>(() => {
    if (!selectedNode) {
      return null;
    }

    return graph.notes[selectedNode.data.noteId] ?? null;
  }, [graph.notes, selectedNode]);

  function handleNodesChange(nodes: KnowledgeNode[]) {
    setGraph((currentGraph) => ({
      ...currentGraph,
      nodes,
    }));
  }

  function handleEdgesChange(edges: KnowledgeEdge[]) {
    setGraph((currentGraph) => ({
      ...currentGraph,
      edges,
    }));
  }

  function handleSelectNode(nodeId: string | null) {
    setGraph((currentGraph) => ({
      ...currentGraph,
      selectedNodeId: nodeId,
    }));
  }

  function handleCreateNode() {
    const nodeId = createNodeId();
    const position =
      canvasViewportApi?.getCanvasCenterPosition() ?? DEFAULT_NEW_NODE_POSITION;
    const nextNode = createDefaultNodeAtPosition(nodeId, position);
    const nextNote = createDefaultNoteForNode(nodeId);

    setImportError(null);
    setGraph((currentGraph) => ({
      ...currentGraph,
      nodes: [...currentGraph.nodes, nextNode],
      notes: {
        ...currentGraph.notes,
        [nodeId]: nextNote,
      },
      selectedNodeId: nodeId,
    }));
  }

  function handleDeleteSelectedNode() {
    if (!graph.selectedNodeId) {
      return;
    }

    const selectedId = graph.selectedNodeId;
    const noteIdToDelete = selectedNode?.data.noteId ?? null;

    setImportError(null);
    setGraph((currentGraph) => {
      const nextNotes = { ...currentGraph.notes };

      if (noteIdToDelete) {
        delete nextNotes[noteIdToDelete];
      }

      return {
        ...currentGraph,
        nodes: currentGraph.nodes.filter((node) => node.id !== selectedId),
        edges: currentGraph.edges.filter(
          (edge) => edge.source !== selectedId && edge.target !== selectedId,
        ),
        notes: nextNotes,
        selectedNodeId: null,
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

  function handleExportGraph() {
    setImportError(null);

    const exportedData = exportGraphData(graph);
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'mymind-graph.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  const handleImportGraph = useCallback(async (file: File) => {
    const raw = await file.text();
    const parsed = parseImportedGraph(raw);

    if (!parsed.data) {
      setImportError(parsed.error);
      return;
    }

    setImportError(null);
    setGraph({
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
      notes: parsed.data.notes,
      selectedNodeId: null,
    });
  }, []);

  function handleResetGraph() {
    if (!window.confirm('确定要重置为默认图谱吗？当前内容会被覆盖。')) {
      return;
    }

    setImportError(null);
    setGraph(createDefaultGraphState());
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <ThreePaneLayout
        mode={mode}
        sizes={sizes}
        onSizesChange={setSizes}
        panes={{
          A: (
            <ToolbarPane
              mode={mode}
              onModeChange={setMode}
              onThemeToggle={toggleTheme}
              theme={theme}
              info={{
                nodeCount: graph.nodes.length,
                edgeCount: graph.edges.length,
                selectedNodeTitle: selectedNode?.data.title ?? null,
              }}
              canDeleteSelectedNode={Boolean(graph.selectedNodeId)}
              canCenterSelected={Boolean(graph.selectedNodeId)}
              importError={importError}
              onCenterSelected={handleCenterSelected}
              onCreateNode={handleCreateNode}
              onDeleteSelectedNode={handleDeleteSelectedNode}
              onExportGraph={handleExportGraph}
              onFitView={handleFitView}
              onImportGraph={handleImportGraph}
              onResetGraph={handleResetGraph}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          ),
          B: (
            <CanvasPane
              edges={graph.edges}
              nodes={graph.nodes}
              onEdgesChange={handleEdgesChange}
              onNodesChange={handleNodesChange}
              onSelectNode={handleSelectNode}
              onViewportApiReady={setCanvasViewportApi}
              selectedNodeId={graph.selectedNodeId}
            />
          ),
          C: (
            <MarkdownPane
              selectedNode={selectedNode}
              selectedNote={selectedNote}
            />
          ),
        }}
      />
    </div>
  );
}

export default App;
