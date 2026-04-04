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

vi.mock('@xyflow/react', async () => {
  const { createElement } = await import('react');

  return {
    Handle: () => null,
    Position: {
      Left: 'left',
      Right: 'right',
    },
    ReactFlow: ({
      children,
      className,
      onConnect,
    }: {
      children?: ReactNode;
      className?: string;
      onConnect?: (connection: { source: string; target: string }) => void;
    }) =>
      createElement(
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
        children,
      ),
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
    };

    const { container } = render(
      <CanvasPane
        canCenterSelected
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        nodes={[node]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={viewportMocks.connect}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodeByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onSelectNode={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={(api) => {
          viewportApi = api;
        }}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        selectedNodeId={null}
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
        nodes={[node]}
        onCenterSelected={centerSelected}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={viewportMocks.connect}
        onCreateChildNodeFromSelection={() => {}}
        onCreateSiblingNodeFromSelection={() => {}}
        onDeleteSelectedNodeByShortcut={() => {}}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={fitView}
        onNodesChange={() => {}}
        onSelectNode={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        selectedNodeId={null}
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

  it('routes enter, shift+enter, and delete shortcuts from the canvas surface', () => {
    const node: KnowledgeNode = {
      id: 'node_focus',
      position: { x: 120, y: 80 },
      data: {
        title: 'Focus Node',
        noteId: 'note_focus',
        kind: 'default',
      },
    };
    const createSibling = vi.fn();
    const createChild = vi.fn();
    const deleteSelected = vi.fn();

    render(
      <CanvasPane
        canCenterSelected={false}
        currentGraphId="graph_focus"
        editingNodeId={null}
        edges={[]}
        nodes={[node]}
        onCenterSelected={() => {}}
        onCancelNodeTitleEdit={() => {}}
        onCommitNodeTitleEdit={() => {}}
        onConnectEdge={viewportMocks.connect}
        onCreateChildNodeFromSelection={createChild}
        onCreateSiblingNodeFromSelection={createSibling}
        onDeleteSelectedNodeByShortcut={deleteSelected}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onFitView={() => {}}
        onNodesChange={() => {}}
        onSelectNode={() => {}}
        onStartNodeTitleEdit={() => {}}
        onViewportApiReady={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        selectedNodeId="node_focus"
      />,
    );

    const canvasSurface = screen.getByTestId('graph-canvas-surface');
    canvasSurface.focus();

    fireEvent.keyDown(canvasSurface, { key: 'Enter' });
    fireEvent.keyDown(canvasSurface, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(canvasSurface, { key: 'Delete' });

    expect(createSibling).toHaveBeenCalledTimes(1);
    expect(createChild).toHaveBeenCalledTimes(1);
    expect(deleteSelected).toHaveBeenCalledTimes(1);
  });
});
