import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { GRAPH_STORAGE_KEY } from './hooks/usePersistentGraphState';
import { LAYOUT_STORAGE_KEY } from './utils/layout';
import { THEME_STORAGE_KEY } from './hooks/useThemePreference';
import type { KnowledgeNode } from './types/graph';
import * as graphUtils from './utils/graph';

function expectPaneOrder(testIds: string[]) {
  const elements = testIds.map((testId) => screen.getByTestId(testId));

  for (let index = 0; index < elements.length - 1; index += 1) {
    expect(
      elements[index].compareDocumentPosition(elements[index + 1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  }
}

function getFlowNodeByLabel(label: string) {
  return screen
    .getAllByText(label)
    .find((element) => element.closest('.react-flow__node'))!
    .closest('.react-flow__node') as HTMLElement;
}

describe('App', () => {
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  let anchorClickSpy: any;
  let confirmSpy: any;
  let matchMediaSpy: any;
  let isMobileViewport = false;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'day';
    isMobileViewport = false;

    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: () => 'blob:mock-url',
      });
    }

    if (!('revokeObjectURL' in URL)) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }

    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    matchMediaSpy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((query: string) => ({
        matches: query === '(max-width: 899px)' ? isMobileViewport : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }));
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    anchorClickSpy.mockRestore();
    confirmSpy.mockRestore();
    matchMediaSpy.mockRestore();
  });

  it('renders the default ABC layout with all panes visible', () => {
    render(<App />);

    expect(screen.getByText('MyMind Workspace')).toBeInTheDocument();
    expect(screen.getByText('思维导图画布')).toBeInTheDocument();
    expect(screen.getByText('Markdown 详情')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    expect(screen.getByText('React Flow')).toBeInTheDocument();
    expect(screen.getByText('Markdown Pane')).toBeInTheDocument();
    expect(screen.getAllByTestId('resize-handle')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expectPaneOrder(['pane-A', 'pane-B', 'pane-C']);
  });

  it('switches pane order when changing layout mode', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /ACB/i }));
    expectPaneOrder(['pane-A', 'pane-C', 'pane-B']);

    fireEvent.click(screen.getByRole('button', { name: /CBA/i }));
    expectPaneOrder(['pane-C', 'pane-B', 'pane-A']);

    fireEvent.click(screen.getByRole('button', { name: /BCA/i }));
    expectPaneOrder(['pane-B', 'pane-C', 'pane-A']);
  });

  it('restores stored layout mode and sizes from localStorage', () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        mode: 'CBA',
        sizes: {
          A: 24,
          B: 40,
          C: 36,
        },
      }),
    );

    render(<App />);

    expectPaneOrder(['pane-C', 'pane-B', 'pane-A']);
    expect(
      screen.getByRole('button', { name: /CBA/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('persists layout changes back to localStorage', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /BCA/i }));

    const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    expect(stored).not.toBeNull();

    expect(JSON.parse(stored!)).toMatchObject({
      mode: 'BCA',
      sizes: expect.objectContaining({
        A: expect.any(Number),
        B: expect.any(Number),
        C: expect.any(Number),
      }),
    });
  });

  it('toggles to the night theme and persists the preference', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('switch', { name: /夜晚主题/i }));

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
  });

  it('restores the stored night theme on load', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night');

    render(<App />);

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(screen.getByRole('switch', { name: /夜晚主题/i })).toBeChecked();
  });

  it('restores the stored graph data from localStorage', () => {
    window.localStorage.setItem(
      GRAPH_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        nodes: [
          {
            id: 'node_saved',
            position: { x: 24, y: 48 },
            data: {
              title: 'Saved Node',
              noteId: 'note_saved',
            },
          },
        ],
        edges: [],
        notes: {
          note_saved: {
            id: 'note_saved',
            title: 'Saved Node',
            content: '# Saved Node\n\nRestored content.',
          },
        },
      }),
    );

    render(<App />);

    expect(screen.getByText('Saved Node')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除选中节点' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Center Selected' })).toBeDisabled();
  });

  it('renders the mobile single-pane layout below 900px and defaults to canvas', () => {
    isMobileViewport = true;

    render(<App />);

    expect(screen.getByTestId('mobile-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('pane-A')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('resize-handle')).toHaveLength(0);
    expect(screen.getByTestId('mobile-pane-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '画布' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('switches mobile tabs and keeps toolbar actions available', () => {
    isMobileViewport = true;

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '工具栏' }));

    expect(screen.getByRole('button', { name: '新建节点' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置默认图谱' })).toBeInTheDocument();
    expect(screen.getByText('当前共 3 个节点、2 条边，选中：未选择。')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '展开' })[1]);
    expect(screen.getByText('当前布局')).toBeInTheDocument();
  });

  it('keeps graph state when switching tabs on mobile', () => {
    isMobileViewport = true;

    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_mobile_created');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '工具栏' }));
    fireEvent.click(screen.getByRole('button', { name: '新建节点' }));
    fireEvent.click(screen.getByRole('button', { name: '详情' }));

    expect(screen.getByText('在这里写内容。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '画布' }));
    expect(screen.getByText('Untitled')).toBeInTheDocument();

    createNodeIdSpy.mockRestore();
  });

  it('falls back to the default graph when stored graph data is invalid', () => {
    window.localStorage.setItem(GRAPH_STORAGE_KEY, '{"version":2}');

    render(<App />);

    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    expect(screen.getByText('React Flow')).toBeInTheDocument();
    expect(screen.getByText('Markdown Pane')).toBeInTheDocument();
  });

  it('syncs selected node details to the toolbar and markdown pane', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));

    expect(screen.getByText('note_graph')).toBeInTheDocument();
    expect(screen.getAllByText('Knowledge Graph').length).toBeGreaterThan(1);
    expect(screen.getByText('节点承载概念')).toBeInTheDocument();
  });

  it('clears the selected node when clicking the empty canvas pane', () => {
    const { container } = render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(container.querySelector('.react-flow__pane') as Element);

    expect(screen.getByText('未选择节点')).toBeInTheDocument();
    expect(screen.getAllByText('未选择').length).toBeGreaterThan(0);
    expect(screen.getByText('请选择一个节点。')).toBeInTheDocument();
  });

  it('renders markdown features from the selected note', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('React Flow'));

    expect(screen.getByText('节点拖拽')).toBeInTheDocument();
    expect(
      screen.getByText('<ReactFlow nodes={nodes} edges={edges} fitView />'),
    ).toBeInTheDocument();
    expect(document.querySelector('.katex')).not.toBeNull();

    fireEvent.click(getFlowNodeByLabel('Markdown Pane'));
    expect(screen.getByText('能力')).toBeInTheDocument();
  });

  it('shows a friendly message when a selected node has no note content', () => {
    const selectedNode: KnowledgeNode = {
      id: 'node_missing',
      position: { x: 0, y: 0 },
      data: {
        title: 'Missing Note',
        noteId: 'note_missing',
      },
    };

    render(<MarkdownPane selectedNode={selectedNode} selectedNote={null} />);

    expect(screen.getByText('Missing Note')).toBeInTheDocument();
    expect(screen.getByText('note_missing')).toBeInTheDocument();
    expect(screen.getByText('找不到对应的 note 内容。')).toBeInTheDocument();
  });

  it('creates a new node, selects it, and renders the default markdown', () => {
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建节点' }));

    expect(screen.getAllByText('Untitled').length).toBeGreaterThan(1);
    expect(screen.getByText('在这里写内容。')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(GRAPH_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      version: 1,
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: 'node_created',
          data: expect.objectContaining({ title: 'Untitled' }),
        }),
      ]),
    });

    createNodeIdSpy.mockRestore();
  });

  it('deletes the selected node and its connected edges', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('button', { name: '删除选中节点' }));

    expect(screen.queryByText('note_graph')).not.toBeInTheDocument();
    expect(screen.getByText('未选择节点')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('disables delete when no node is selected', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '删除选中节点' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Center Selected' })).toBeDisabled();
  });

  it('resets back to the default graph after confirmation', () => {
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建节点' }));
    fireEvent.click(screen.getByRole('button', { name: '重置默认图谱' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      '确定要重置为默认图谱吗？当前内容会被覆盖。',
    );
    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    expect(screen.queryByText('node_created')).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(GRAPH_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      version: 1,
      nodes: expect.arrayContaining([
        expect.objectContaining({ id: 'node_graph' }),
        expect.objectContaining({ id: 'node_flow' }),
        expect.objectContaining({ id: 'node_markdown' }),
      ]),
    });

    createNodeIdSpy.mockRestore();
  });

  it('keeps the current graph when reset is cancelled', () => {
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created');

    confirmSpy.mockReturnValue(false);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建节点' }));
    fireEvent.click(screen.getByRole('button', { name: '重置默认图谱' }));

    expect(screen.getAllByText('Untitled').length).toBeGreaterThan(1);
    expect(screen.getByText('4')).toBeInTheDocument();

    createNodeIdSpy.mockRestore();
  });

  it('exports the current graph as version 1 json', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '导出 JSON' }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('imports a valid graph json and replaces the current graph', async () => {
    const { container } = render(<App />);

    const importFile = new File(
      [
        JSON.stringify({
          version: 1,
          nodes: [
            {
              id: 'node_imported',
              position: { x: 40, y: 60 },
              data: { title: 'Imported Node', noteId: 'note_imported' },
            },
          ],
          edges: [],
          notes: {
            note_imported: {
              id: 'note_imported',
              title: 'Imported Node',
              content: '# Imported Node\n\nImported body.',
            },
          },
        }),
      ],
      'graph.json',
      { type: 'application/json' },
    );
    Object.defineProperty(importFile, 'text', {
      value: async () =>
        JSON.stringify({
          version: 1,
          nodes: [
            {
              id: 'node_imported',
              position: { x: 40, y: 60 },
              data: { title: 'Imported Node', noteId: 'note_imported' },
            },
          ],
          edges: [],
          notes: {
            note_imported: {
              id: 'note_imported',
              title: 'Imported Node',
              content: '# Imported Node\n\nImported body.',
            },
          },
        }),
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [importFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('Imported Node')).toBeInTheDocument();
    });

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除选中节点' })).toBeDisabled();
  });

  it('shows an error and keeps the current graph when import json is invalid', async () => {
    const { container } = render(<App />);

    const invalidFile = new File(['{"version":2}'], 'invalid.json', {
      type: 'application/json',
    });
    Object.defineProperty(invalidFile, 'text', {
      value: async () => '{"version":2}',
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      expect(
        screen.getByText('导入失败：仅支持 version 1 的图谱文件。'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
  });
});
