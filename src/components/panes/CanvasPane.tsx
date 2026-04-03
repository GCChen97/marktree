import {
  type Connection,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import { useEffect, useMemo } from 'react';
import type {
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from '@xyflow/react';
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
  onConnectEdge: (connection: Connection) => void;
  onSelectNode: (nodeId: string | null) => void;
  onViewportApiReady: (api: CanvasViewportApi | null) => void;
  onEnterLinkedGraph: (targetGraphId: GraphId) => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterSelected: () => void;
  canCenterSelected: boolean;
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
  onConnectEdge,
  onSelectNode,
  onViewportApiReady,
  onEnterLinkedGraph,
  onFitView,
  onZoomIn,
  onZoomOut,
  onCenterSelected,
  canCenterSelected,
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

  const handleConnect: OnConnect = (connection) => {
    onConnectEdge(connection);
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
        <div className="canvas-controls" data-mobile={isMobile}>
          <button
            aria-label="Fit View"
            className="canvas-control-button"
            onClick={onFitView}
            title="Fit View"
            type="button"
          >
            <svg aria-hidden="true" className="canvas-control-button__icon" viewBox="0 0 16 16">
              <path
                d="M5 2.75H2.75V5M11 2.75h2.25V5M5 13.25H2.75V11M11 13.25h2.25V11"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.35"
              />
            </svg>
          </button>
          <button
            aria-label="Zoom In"
            className="canvas-control-button"
            onClick={onZoomIn}
            title="Zoom In"
            type="button"
          >
            <svg aria-hidden="true" className="canvas-control-button__icon" viewBox="0 0 16 16">
              <path
                d="M7.25 4.75v5.5M4.5 7.5H10M10.75 10.75l2.75 2.75M7.25 11.25a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.35"
              />
            </svg>
          </button>
          <button
            aria-label="Zoom Out"
            className="canvas-control-button"
            onClick={onZoomOut}
            title="Zoom Out"
            type="button"
          >
            <svg aria-hidden="true" className="canvas-control-button__icon" viewBox="0 0 16 16">
              <path
                d="M4.5 7.5H10M10.75 10.75l2.75 2.75M7.25 11.25a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.35"
              />
            </svg>
          </button>
          <button
            aria-label="Center Selected"
            className="canvas-control-button"
            disabled={!canCenterSelected}
            onClick={onCenterSelected}
            title="Center Selected"
            type="button"
          >
            <svg aria-hidden="true" className="canvas-control-button__icon" viewBox="0 0 16 16">
              <path
                d="M8 2.25v2M8 11.75v2M2.25 8h2M11.75 8h2M8 10.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.35"
              />
            </svg>
          </button>
        </div>
        <ReactFlow<KnowledgeNode, KnowledgeEdge>
          className="graph-canvas"
          data-testid="react-flow-canvas"
          edges={edges}
          fitView
          nodeTypes={nodeTypes}
          nodes={displayNodes}
          onConnect={handleConnect}
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
