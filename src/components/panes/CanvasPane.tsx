import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import { useEffect } from 'react';
import type { OnEdgesChange, OnNodesChange } from '@xyflow/react';
import type {
  CanvasViewportApi,
  KnowledgeEdge,
  KnowledgeNode,
} from '../../types/graph';

type CanvasPaneProps = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: KnowledgeNode[]) => void;
  onEdgesChange: (edges: KnowledgeEdge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  onViewportApiReady: (api: CanvasViewportApi | null) => void;
};

function CanvasViewportBridge({
  onViewportApiReady,
}: {
  onViewportApiReady: (api: CanvasViewportApi | null) => void;
}) {
  const reactFlow = useReactFlow<KnowledgeNode, KnowledgeEdge>();

  useEffect(() => {
    onViewportApiReady({
      fitView: () => {
        void reactFlow.fitView({ padding: 0.2 });
      },
      zoomIn: () => {
        void reactFlow.zoomIn({ duration: 180 });
      },
      zoomOut: () => {
        void reactFlow.zoomOut({ duration: 180 });
      },
      centerOnNode: (node) => {
        const internalNode = reactFlow.getInternalNode(node.id);
        const baseX =
          internalNode?.internals.positionAbsolute.x ?? node.position.x;
        const baseY =
          internalNode?.internals.positionAbsolute.y ?? node.position.y;
        const nodeWidth =
          internalNode?.measured.width ?? node.measured?.width ?? node.width ?? 0;
        const nodeHeight =
          internalNode?.measured.height ??
          node.measured?.height ??
          node.height ??
          0;

        void reactFlow.setCenter(baseX + nodeWidth / 2, baseY + nodeHeight / 2, {
          duration: 220,
          zoom: Math.max(reactFlow.getZoom(), 1),
        });
      },
      getCanvasCenterPosition: () => {
        const pane = document.querySelector(
          '.graph-canvas .react-flow__renderer',
        ) as HTMLElement | null;

        if (!pane) {
          return { x: 160, y: 120 };
        }

        const rect = pane.getBoundingClientRect();

        return reactFlow.screenToFlowPosition({
          x: rect.left + pane.clientWidth / 2,
          y: rect.top + pane.clientHeight / 2,
        });
      },
    });

    return () => onViewportApiReady(null);
  }, [onViewportApiReady, reactFlow]);

  return null;
}

export function CanvasPane({
  nodes,
  edges,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
  onViewportApiReady,
}: CanvasPaneProps) {
  const displayNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      label: node.data.title,
    },
    selected: node.id === selectedNodeId,
  }));

  const handleNodesChange: OnNodesChange<KnowledgeNode> = (changes) => {
    onNodesChange(applyNodeChanges(changes, nodes));
  };

  const handleEdgesChange: OnEdgesChange<KnowledgeEdge> = (changes) => {
    onEdgesChange(applyEdgeChanges(changes, edges));
  };

  return (
    <div className="pane-content pane-content--canvas">
      <header className="pane-header pane-header--compact">
        <p className="pane-eyebrow">Phase 4</p>
        <h2 className="pane-title">思维导图画布</h2>
        <p className="pane-description">
          React Flow 已接入，当前支持拖拽、缩放、平移、节点选中与工具栏视图控制。
        </p>
      </header>

      <div className="canvas-surface" data-testid="graph-canvas-surface">
        <ReactFlow<KnowledgeNode, KnowledgeEdge>
          className="graph-canvas"
          data-testid="react-flow-canvas"
          edges={edges}
          fitView
          nodes={displayNodes}
          onEdgesChange={handleEdgesChange}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onNodesChange={handleNodesChange}
          onPaneClick={() => onSelectNode(null)}
          proOptions={{ hideAttribution: true }}
        >
          <CanvasViewportBridge onViewportApiReady={onViewportApiReady} />
        </ReactFlow>
      </div>
    </div>
  );
}
