import {
  type Connection,
  Position,
  ReactFlow,
  SelectionMode,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type {
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from '@xyflow/react';
import { MindNode } from '../canvas/MindNode';
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
  isReadOnly: boolean;
  editingNodeId: string | null;
  onNodesChange: (nodes: KnowledgeNode[]) => void;
  onEdgesChange: (edges: KnowledgeEdge[]) => void;
  onConnectEdge: (connection: Connection) => void;
  onCreateNode: () => void;
  onStartNodeTitleEdit: (nodeId: string) => void;
  onCommitNodeTitleEdit: (nodeId: string, title: string) => void;
  onCancelNodeTitleEdit: () => void;
  onCreateSiblingNodeFromSelection: () => void;
  onCreateChildNodeFromSelection: () => void;
  onDeleteSelectedNodesByShortcut: () => void;
  onViewportApiReady: (api: CanvasViewportApi | null) => void;
  onEnterLinkedGraph: (targetGraphId: GraphId) => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterSelected: () => void;
  canCenterSelected: boolean;
  isMobile?: boolean;
};

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

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
  mind: MindNode,
  jump: MindNode,
};

export function CanvasPane({
  currentGraphId,
  nodes,
  edges,
  isReadOnly,
  editingNodeId,
  onNodesChange,
  onEdgesChange,
  onConnectEdge,
  onCreateNode,
  onStartNodeTitleEdit,
  onCommitNodeTitleEdit,
  onCancelNodeTitleEdit,
  onCreateSiblingNodeFromSelection,
  onCreateChildNodeFromSelection,
  onDeleteSelectedNodesByShortcut,
  onViewportApiReady,
  onEnterLinkedGraph,
  onFitView,
  onZoomIn,
  onZoomOut,
  onCenterSelected,
  canCenterSelected,
  isMobile = false,
}: CanvasPaneProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const previousEditingNodeIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!editingNodeId) {
      return;
    }

    const focusEditor = () => {
      const editor = document.querySelector(
        `input[data-node-id="${editingNodeId}"]`,
      ) as HTMLInputElement | null;

      editor?.focus();
      editor?.select();
    };

    focusEditor();
    const frameId = requestAnimationFrame(focusEditor);

    return () => cancelAnimationFrame(frameId);
  }, [editingNodeId, nodes]);

  useLayoutEffect(() => {
    if (previousEditingNodeIdRef.current && !editingNodeId) {
      surfaceRef.current?.focus();
    }

    previousEditingNodeIdRef.current = editingNodeId;
  }, [editingNodeId]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const targetGraphId = node.data.jumpLink?.targetGraphId ?? null;

        return {
          ...node,
          type: node.data.kind === 'jump' ? 'jump' : 'mind',
          data: {
            ...node.data,
            label: node.data.title,
            isEditingTitle: editingNodeId === node.id,
            onStartTitleEdit: isReadOnly ? null : onStartNodeTitleEdit,
            onCommitTitleEdit: isReadOnly ? null : onCommitNodeTitleEdit,
            onCancelTitleEdit: isReadOnly ? null : onCancelNodeTitleEdit,
            onEnterLinkedGraph,
          },
          selected: Boolean(node.selected),
          draggable: !isReadOnly,
          sourcePosition: node.sourcePosition ?? Position.Right,
          targetPosition: node.targetPosition ?? Position.Left,
          ...(node.data.kind === 'jump' && targetGraphId === currentGraphId
            ? {
                data: {
                  ...node.data,
                  label: node.data.title,
                  isEditingTitle: editingNodeId === node.id,
                  onStartTitleEdit: isReadOnly ? null : onStartNodeTitleEdit,
                  onCommitTitleEdit: isReadOnly ? null : onCommitNodeTitleEdit,
                  onCancelTitleEdit: isReadOnly ? null : onCancelNodeTitleEdit,
                  onEnterLinkedGraph,
                  targetGraphMissing: true,
                },
              }
            : {}),
        };
      }),
    [
      currentGraphId,
      editingNodeId,
      isReadOnly,
      nodes,
      onCancelNodeTitleEdit,
      onCommitNodeTitleEdit,
      onEnterLinkedGraph,
      onStartNodeTitleEdit,
    ],
  );

  const handleNodesChange: OnNodesChange<KnowledgeNode> = (changes) => {
    if (isReadOnly) {
      return;
    }

    onNodesChange(applyNodeChanges(changes, nodes));
  };

  const handleEdgesChange: OnEdgesChange<KnowledgeEdge> = (changes) => {
    if (isReadOnly) {
      return;
    }

    onEdgesChange(applyEdgeChanges(changes, edges));
  };

  const handleConnect: OnConnect = (connection) => {
    if (isReadOnly) {
      return;
    }

    onConnectEdge(connection);
  };

  function handleCanvasKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (isReadOnly || editingNodeId || isTypingTarget(event.target)) {
      return;
    }

    if (event.key === 'Delete' || event.key.toLowerCase() === 'x') {
      event.preventDefault();
      onDeleteSelectedNodesByShortcut();
      return;
    }

    if (event.key.toLowerCase() === 'a') {
      event.preventDefault();
      onCreateNode();
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    const selectedNodes = nodes.filter((node) => Boolean(node.selected));

    if (selectedNodes.length !== 1) {
      return;
    }

    event.preventDefault();

    if (event.shiftKey) {
      onCreateChildNodeFromSelection();
      return;
    }

    onCreateSiblingNodeFromSelection();
  }

  return (
    <div
      className="pane-content pane-content--canvas"
      data-mobile={isMobile}
    >
      <header
        className={`pane-header pane-header--compact${isMobile ? ' pane-header--mobile' : ''}`}
      >
        <p className="pane-eyebrow">Phase 7</p>
        <h2 className="pane-title">思维导图画布</h2>
        <p className="pane-description">
          当前 graph 的节点、跳转节点与 markdown 关系都在这里呈现，支持快捷键和双击编辑。
        </p>
      </header>

      <div
        className="canvas-surface"
        data-testid="graph-canvas-surface"
        onKeyDown={handleCanvasKeyDown}
        onMouseDownCapture={(event) => {
          if (!isTypingTarget(event.target)) {
            surfaceRef.current?.focus();
          }
        }}
        ref={surfaceRef}
        tabIndex={0}
      >
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
          nodesFocusable
          nodesConnectable={!isReadOnly}
          nodesDraggable={!isReadOnly}
          nodes={displayNodes}
          onConnect={handleConnect}
          onEdgesChange={handleEdgesChange}
          onNodeClick={(_, node) => {
            surfaceRef.current?.focus();
          }}
          onNodeDoubleClick={(_, node) => {
            if (!isReadOnly) {
              onStartNodeTitleEdit(node.id);
            }
          }}
          onNodesChange={handleNodesChange}
          onPaneClick={() => {
            surfaceRef.current?.focus();
          }}
          panOnDrag={[1, 2]}
          selectNodesOnDrag={false}
          selectionMode={SelectionMode.Partial}
          selectionOnDrag
          proOptions={{ hideAttribution: true }}
        >
          <CanvasViewportBridge onViewportApiReady={onViewportApiReady} />
        </ReactFlow>
      </div>
    </div>
  );
}
