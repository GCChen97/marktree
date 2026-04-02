import { useMemo, useState } from 'react';
import { CanvasPane } from './components/panes/CanvasPane';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { ToolbarPane } from './components/panes/ToolbarPane';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { createDefaultGraphState } from './data/defaultGraph';
import { usePersistentLayoutState } from './hooks/usePersistentLayoutState';
import { useThemePreference } from './hooks/useThemePreference';
import type { KnowledgeEdge, KnowledgeNode } from './types/graph';

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();
  const { theme, toggleTheme } = useThemePreference();
  const [graph, setGraph] = useState(() => createDefaultGraphState());

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === graph.selectedNodeId) ?? null,
    [graph.nodes, graph.selectedNodeId],
  );

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
            />
          ),
          B: (
            <CanvasPane
              edges={graph.edges}
              nodes={graph.nodes}
              onEdgesChange={handleEdgesChange}
              onNodesChange={handleNodesChange}
              onSelectNode={handleSelectNode}
              selectedNodeId={graph.selectedNodeId}
            />
          ),
          C: <MarkdownPane selectedNode={selectedNode} />,
        }}
      />
    </div>
  );
}

export default App;
