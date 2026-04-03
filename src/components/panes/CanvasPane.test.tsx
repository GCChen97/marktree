import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import type { CanvasViewportApi, KnowledgeNode } from '../../types/graph';

const viewportMocks = vi.hoisted(() => ({
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
    }: {
      children?: ReactNode;
      className?: string;
    }) =>
      createElement(
        'div',
        { className },
        createElement('div', { className: 'react-flow__renderer' }),
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
        currentGraphId="graph_focus"
        edges={[]}
        nodes={[node]}
        onEdgesChange={() => {}}
        onEnterLinkedGraph={() => {}}
        onNodesChange={() => {}}
        onSelectNode={() => {}}
        onViewportApiReady={(api) => {
          viewportApi = api;
        }}
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
});
