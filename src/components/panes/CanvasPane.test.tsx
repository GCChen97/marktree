import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import type { CanvasViewportApi, KnowledgeNode } from '../../types/graph';

const viewportMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  fitView: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  setCenter: vi.fn(),
  getInternalNode: vi.fn(),
  screenToFlowPosition: vi.fn(),
}));

const flowPropMocks = vi.hoisted(() => ({
  panOnDrag: undefined as unknown,
  selectionOnDrag: undefined as unknown,
  lastOnNodesChange: undefined as unknown,
}));

vi.mock('@xyflow/react', async () => {
  const { createElement } = await import('react');

  return {
    Handle: () => null,
    Position: {
      Left: 'left',
      Right: 'right',
    },
    SelectionMode: {
      Partial: 'partial',
      Full: 'full',
    },
    ReactFlow: ({
      children,
      className,
      onConnect,
      onNodeClick,
      onPaneClick,
      nodes,
      onNodesChange,
      panOnDrag,
      selectionOnDrag,
    }: {
      children?: ReactNode;
      className?: string;
      onConnect?: (connection: { source: string; target: string }) => void;
      onNodeClick?: (_event: unknown, node: { id: string }) => void;
      onPaneClick?: () => void;
      nodes?: Array<{ id: string }>;
      onNodesChange?: unknown;
      panOnDrag?: unknown;
      selectionOnDrag?: unknown;
    }) =>
      (() => {
        flowPropMocks.panOnDrag = panOnDrag;
        flowPropMocks.selectionOnDrag = selectionOnDrag;
        flowPropMocks.lastOnNodesChange = onNodesChange;

        return createElement(
          'div',
          { className },
          createElement('div', { className: 'react-flow__renderer' }),
          createElement(
            'button',
            {
              onClick: () => onConnect?.({ source: 'node_a', target: 'node_b' }),
              type: 'button',
            },
            'Mock Connect',
          ),
          ...(nodes ?? []).map((node) =>
            createElement(
              'button',
              {
                key: node.id,
                onClick: () => onNodeClick?.({}, node),
                type: 'button',
              },
              `Mock Node ${node.id}`,
            ),
          ),
          createElement(
            'button',
            {
              onClick: () => onPaneClick?.(),
              type: 'button',
            },
            'Mock Pane Click',
          ),
          children,
        );
      })(),
    applyEdgeChanges: (_changes: unknown, edges: unknown) => edges,
    applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
    useReactFlow: () => ({
      fitView: viewportMocks.fitView,
      zoomIn: viewportMocks.zoomIn,
      zoomOut: viewportMocks.zoomOut,
      setCenter: viewportMocks.setCenter,
      getInternalNode: viewportMocks.getInternalNode,
      getZoom: () => 1.25,
      screenToFlowPosition: viewportMocks.screenToFlowPosition,
    }),
  };
});

import { CanvasPane } from './CanvasPane';

describe('CanvasPane viewport bridge', () => {
  beforeEach(() => {
    viewportMocks.connect.mockReset();
    viewportMocks.fitView.mockReset();
    viewportMocks.zoomIn.mockReset();
    viewportMocks.zoomOut.mockReset();
    viewportMocks.setCenter.mockReset();
    viewportMocks.getInternalNode.mockReset();
    viewportMocks.screenToFlowPosition.mockReset();
    flowPropMocks.panOnDrag = undefined;
    flowPropMocks.selectionOnDrag = undefined;
    flowPropMocks.lastOnNodesChange = undefined;
    viewportMocks.screenToFlowPosition.mockImplementation(
      ({ x, y }: { x: number; y: number }) => ({
        x: x / 2,
        y: y / 2,
      }),
    );
    viewportMocks.getInternalNode.mockReturnValue({
      measured: {
        width: 180,
        height: 60,
      },
      internals: {
        positionAbsolute: {
          x: 120,
          y: 80,
        },
      },
    });
  });

  it('exposes fit, zoom, center, and center-position helpers', async () => {
    let viewportApi: CanvasViewportApi | null = null;
    const node: KnowledgeNode = {
      id: 'node_focus',
      position: { x: 120, y: 80 },
      data: {
        title: 'Focus Node',
        noteId: 'note_focus',
        kind: 'default',
      },
      selected: true,
    };

    const { container } = render(
      <CanvasPane
        canCenterSelected
        currentGraphId="graph_focus"
        editingNodeId="node_focus"
        edges={[]}
        isReadOnly={false}
        nodes={[node]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={viewportMocks.connect}
        onCreateNode={() => {}}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodesByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={(api) => {
          viewportApi = api;
        }}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
      />,
    );

    await waitFor(() => {
      expect(viewportApi).not.toBeNull();
    });

    const renderer = container.querySelector(
      '.react-flow__renderer',
    ) as HTMLElement;

    Object.defineProperty(renderer, 'clientWidth', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(renderer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(renderer, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 10,
        top: 20,
        right: 610,
        bottom: 420,
        width: 600,
        height: 400,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }),
    });

    viewportApi!.fitView();
    viewportApi!.zoomIn();
    viewportApi!.zoomOut();
    viewportApi!.centerOnNode(node);
    const center = viewportApi!.getCanvasCenterPosition();

    expect(viewportMocks.fitView).toHaveBeenCalledWith({ padding: 0.2 });
    expect(viewportMocks.zoomIn).toHaveBeenCalledWith({ duration: 180 });
    expect(viewportMocks.zoomOut).toHaveBeenCalledWith({ duration: 180 });
    expect(viewportMocks.setCenter).toHaveBeenCalledWith(210, 110, {
      duration: 220,
      zoom: 1.25,
    });
    expect(viewportMocks.screenToFlowPosition).toHaveBeenCalledWith({
      x: 310,
      y: 220,
    });
    expect(center).toEqual({ x: 155, y: 110 });
  });

  it('forwards connect events and renders floating canvas controls', () => {
    const node: KnowledgeNode = {
      id: 'node_focus',
      position: { x: 120, y: 80 },
      data: {
        title: 'Focus Node',
        noteId: 'note_focus',
        kind: 'default',
      },
    };
    const fitView = vi.fn();
    const zoomIn = vi.fn();
    const zoomOut = vi.fn();
    const centerSelected = vi.fn();

    render(
      <CanvasPane
        canCenterSelected={false}
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        isReadOnly={false}
        nodes={[node]}
        onCenterSelected={centerSelected}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={viewportMocks.connect}
        onCreateNode={() => {}}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodesByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={fitView}
        onNodesChange={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mock Connect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fit View' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom Out' }));

    expect(screen.getByRole('button', { name: 'Center Selected' })).toBeDisabled();
    expect(viewportMocks.connect).toHaveBeenCalledWith({
      source: 'node_a',
      target: 'node_b',
    });
    expect(fitView).toHaveBeenCalled();
    expect(zoomIn).toHaveBeenCalled();
    expect(zoomOut).toHaveBeenCalled();
    expect(centerSelected).not.toHaveBeenCalled();
  });

  it('routes enter, a, shift+enter, and delete/x shortcuts from the canvas surface', () => {
    const node: KnowledgeNode = {
      id: 'node_focus',
      position: { x: 120, y: 80 },
      data: {
        title: 'Focus Node',
        noteId: 'note_focus',
        kind: 'default',
      },
      selected: true,
    };
    const createNode = vi.fn();
    const createSibling = vi.fn();
    const createChild = vi.fn();
    const deleteSelected = vi.fn();

    render(
      <CanvasPane
        canCenterSelected={false}
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        isReadOnly={false}
        nodes={[node]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={viewportMocks.connect}
        onCreateNode={createNode}
        onCreateChildNodeFromSelection={createChild}
        onCreateSiblingNodeFromSelection={createSibling}
        onDeleteSelectedNodesByShortcut={deleteSelected}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
      />,
    );

    const canvasSurface = screen.getByTestId('graph-canvas-surface');
    canvasSurface.focus();

    fireEvent.keyDown(canvasSurface, { key: 'Enter' });
    fireEvent.keyDown(canvasSurface, { key: 'a' });
    fireEvent.keyDown(canvasSurface, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(canvasSurface, { key: 'x' });
    fireEvent.keyDown(canvasSurface, { key: 'Delete' });

    expect(createNode).toHaveBeenCalledTimes(1);
    expect(createSibling).toHaveBeenCalledTimes(1);
    expect(createChild).toHaveBeenCalledTimes(1);
    expect(deleteSelected).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a/x shortcuts while typing in an input target', () => {
    const createNode = vi.fn();
    const createSibling = vi.fn();
    const deleteSelected = vi.fn();

    render(
      <div>
        <input aria-label="typing-target" />
        <CanvasPane
          canCenterSelected={false}
          currentGraphId="graph_focus"
          editingNodeId={null}
          edges={[]}
          isReadOnly={false}
          nodes={[]}
          onCenterSelected={() => {}}
          onCancelNodeTitleEdit={() => {}}
          onCommitNodeTitleEdit={() => {}}
          onConnectEdge={() => {}}
          onCreateNode={createNode}
          onCreateChildNodeFromSelection={() => {}}
          onCreateSiblingNodeFromSelection={createSibling}
          onDeleteSelectedNodesByShortcut={deleteSelected}
          onEdgesChange={() => {}}
          onEnterLinkedGraph={() => {}}
          onFitView={() => {}}
          onNodesChange={() => {}}
          onStartNodeTitleEdit={() => {}}
          onViewportApiReady={() => {}}
          onZoomIn={() => {}}
          onZoomOut={() => {}}
        />
      </div>,
    );

    const input = screen.getByLabelText('typing-target');

    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'x' });

    expect(createNode).not.toHaveBeenCalled();
    expect(createSibling).not.toHaveBeenCalled();
    expect(deleteSelected).not.toHaveBeenCalled();
  });

  it('applies React Flow selection changes and blocks Enter actions while multiple nodes are selected', () => {
    const createSibling = vi.fn();
    const createChild = vi.fn();
    const onNodesChange = vi.fn();
    const nodeA: KnowledgeNode = {
      id: 'node_a',
      position: { x: 0, y: 0 },
      data: {
        title: 'Node A',
        noteId: null,
        kind: 'default',
      },
      selected: true,
    };
    const nodeB: KnowledgeNode = {
      id: 'node_b',
      position: { x: 120, y: 80 },
      data: {
        title: 'Node B',
        noteId: null,
        kind: 'default',
      },
      selected: true,
    };

    render(
      <CanvasPane
        canCenterSelected={false}
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        isReadOnly={false}
        nodes={[nodeA, nodeB]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={() => {}}
        onCreateNode={() => {}}
        onCreateChildNodeFromSelection={createChild}
        onCreateSiblingNodeFromSelection={createSibling}
        onDeleteSelectedNodesByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={onNodesChange}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
      />,
    );

    expect(flowPropMocks.lastOnNodesChange).toBeDefined();
    (flowPropMocks.lastOnNodesChange as (changes: unknown) => void)([
      { id: 'node_a', type: 'select', selected: true },
      { id: 'node_b', type: 'select', selected: true },
    ]);

    expect(onNodesChange).toHaveBeenCalled();

    const canvasSurface = screen.getByTestId('graph-canvas-surface');
    canvasSurface.focus();
    fireEvent.keyDown(canvasSurface, { key: 'Enter' });
    fireEvent.keyDown(canvasSurface, { key: 'Enter', shiftKey: true });

    expect(createSibling).not.toHaveBeenCalled();
    expect(createChild).not.toHaveBeenCalled();
  });

  it('reserves left-drag for marquee selection instead of canvas panning', () => {
    render(
      <CanvasPane
        canCenterSelected={false}
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        isReadOnly={false}
        nodes={[]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={() => {}}
        onCreateNode={() => {}}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodesByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
      />,
    );

    expect(flowPropMocks.selectionOnDrag).toBe(true);
    expect(flowPropMocks.panOnDrag).toEqual([1, 2]);
  });

  it('keeps the canvas surface focusable after inline title editing ends', () => {
    const node: KnowledgeNode = {
      id: 'node_focus',
      position: { x: 120, y: 80 },
      data: {
        title: 'Focus Node',
        noteId: null,
        kind: 'default',
      },
    };

    const { rerender } = render(
      <CanvasPane
        canCenterSelected
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        isReadOnly={false}
        nodes={[node]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={() => {}}
        onCreateNode={() => {}}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodesByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
      />,
    );

    const canvasSurface = screen.getByTestId('graph-canvas-surface');

    rerender(
      <CanvasPane
        canCenterSelected
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        isReadOnly={false}
        nodes={[node]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={() => {}}
        onCreateNode={() => {}}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodesByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
      />,
    );

    expect(canvasSurface).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('graph-canvas-surface')).toHaveAttribute(
      'tabindex',
      '0',
    );
  });
});
