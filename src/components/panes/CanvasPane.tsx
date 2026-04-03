import {
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import { useEffect, useMemo } from 'react';
import type { NodeTypes, OnEdgesChange, OnNodesChange } from '@xyflow/react';
import { JumpNode } from '../canvas/JumpNode';
import type {
  CanvasViewportApi,
  GraphId,
  KnowledgeEdge,
  KnowledgeNode,
} from '../../types/graph';

type CanvasPaneProps = {
  currentGraphId: GraphId;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: KnowledgeNode[]) => void;
  onEdgesChange: (edges: KnowledgeEdge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  onViewportApiReady: (api: CanvasViewportApi | null) => void;
  onEnterLinkedGraph: (targetGraphId: GraphId) => void;
  isMobile?: boolean;
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

const nodeTypes: NodeTypes = {
  jump: JumpNode,
};

export function CanvasPane({
  currentGraphId,
  nodes,
  edges,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
  onViewportApiReady,
  onEnterLinkedGraph,
  isMobile = false,
}: CanvasPaneProps) {
  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const targetGraphId = node.data.jumpLink?.targetGraphId ?? null;

        return {
          ...node,
          type: node.data.kind === 'jump' ? 'jump' : node.type,
          data: {
            ...node.data,
            label: node.data.title,
            onEnterLinkedGraph,
          },
          selected: node.id === selectedNodeId,
          draggable: true,
          sourcePosition: node.sourcePosition ?? Position.Right,
          targetPosition: node.targetPosition ?? Position.Left,
          ...(node.data.kind === 'jump' && targetGraphId === currentGraphId
            ? {
                data: {
                  ...node.data,
                  label: node.data.title,
                  onEnterLinkedGraph,
                  targetGraphMissing: true,
                },
              }
            : {}),
        };
      }),
    [currentGraphId, nodes, onEnterLinkedGraph, selectedNodeId],
  );

  const handleNodesChange: OnNodesChange<KnowledgeNode> = (changes) => {
    onNodesChange(applyNodeChanges(changes, nodes));
  };

  const handleEdgesChange: OnEdgesChange<KnowledgeEdge> = (changes) => {
    onEdgesChange(applyEdgeChanges(changes, edges));
  };

  return (
    <div
      className="pane-content pane-content--canvas"
      data-mobile={isMobile}
    >
      <header
        className={`pane-header pane-header--compact${isMobile ? ' pane-header--mobile' : ''}`}
      >
        <p className="pane-eyebrow">Phase 6</p>
        <h2 className="pane-title">思维导图画布</h2>
        <p className="pane-description">
          当前 graph 的节点、跳转节点与引用关系都在这里呈现，支持跨 graph 进入。
        </p>
      </header>

      <div className="canvas-surface" data-testid="graph-canvas-surface">
        <ReactFlow<KnowledgeNode, KnowledgeEdge>
          className="graph-canvas"
          data-testid="react-flow-canvas"
          edges={edges}
          fitView
          nodeTypes={nodeTypes}
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
