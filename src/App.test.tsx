import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import App from './App';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { WORKSPACE_STORAGE_KEY } from './hooks/usePersistentWorkspaceState';
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

function getJumpEnterButton() {
  return document.querySelector('.jump-node__enter') as HTMLButtonElement | null;
}

function getGraphList() {
  return within(screen.getByTestId('graph-list'));
}

function getGraphButton(title: string) {
  return getGraphList().getByRole('button', {
    name: new RegExp(`^${title}\\s+\\d+ 个引用$`),
  });
}

describe('App', () => {
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  let anchorClickSpy: any;
  let confirmSpy: any;
  let promptSpy: any;
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
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Renamed Graph');
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
    promptSpy.mockRestore();
    matchMediaSpy.mockRestore();
  });

  it('renders the default desktop layout with graph management visible', () => {
    render(<App />);

    expect(screen.getByText('MyMind Workspace')).toBeInTheDocument();
    expect(screen.getByText('Graph 管理')).toBeInTheDocument();
    expect(
      screen.getByText('Graph 管理').compareDocumentPosition(
        screen.getByText('信息区'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(getGraphButton('Main Graph')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    expect(screen.getByText('React Flow')).toBeInTheDocument();
    expect(screen.getByText('Markdown Pane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom Out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Center Selected' })).toBeDisabled();
    expect(screen.getAllByTestId('resize-handle')).toHaveLength(2);
    expectPaneOrder(['pane-A', 'pane-B', 'pane-C']);
  });

  it('switches pane order when changing layout mode', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /ACB/i }));
    expectPaneOrder(['pane-A', 'pane-C', 'pane-B']);

    fireEvent.click(screen.getByRole('button', { name: /CBA/i }));
    expectPaneOrder(['pane-C', 'pane-B', 'pane-A']);
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
  });

  it('toggles theme and persists the preference', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('switch', { name: /夜晚主题/i }));

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
  });

  it('migrates legacy version 1 graph storage into a workspace', () => {
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
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
    expect(getGraphButton('Main Graph')).toBeInTheDocument();
  });

  it('renders the mobile single-pane layout below 900px and defaults to canvas', () => {
    isMobileViewport = true;

    render(<App />);

    expect(screen.getByTestId('mobile-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('pane-A')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-pane-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '画布' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('creates and renames graphs from the toolbar list', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));

    await waitFor(() => {
      expect(getGraphButton('Untitled Graph')).toBeInTheDocument();
    });

    expect(screen.getByText('Start')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重命名当前 Graph' }));
    expect(promptSpy).toHaveBeenCalled();
    expect(getGraphButton('Renamed Graph')).toBeInTheDocument();

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('switches between graphs from the graph list', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));
    fireEvent.click(getGraphButton('Main Graph'));

    await waitFor(() => {
      expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    });

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('syncs selected node details to the toolbar and markdown pane', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));

    expect(screen.getByText('note_graph')).toBeInTheDocument();
    expect(screen.getByText('当前选中')).toBeInTheDocument();
    expect(screen.getByText('节点承载概念')).toBeInTheDocument();
  });

  it('renames the selected node title from the toolbar input', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.change(screen.getByRole('textbox', { name: /节点标题/i }), {
      target: { value: 'Graph Core' },
    });

    expect(screen.getAllByText('Graph Core').length).toBeGreaterThan(0);
    expect(screen.getByText('note_graph')).toBeInTheDocument();
    expect(screen.getByText('节点承载概念')).toBeInTheDocument();
  });

  it('converts a selected node into a jump node and configures its target graph', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));
    fireEvent.click(getGraphButton('Main Graph'));
    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('button', { name: '设为跳转节点' }));

    expect(screen.getByText('跳转配置')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'graph_created' },
    });

    expect(screen.getByText('当前指向：Untitled Graph')).toBeInTheDocument();

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('enters another graph from a jump node button', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));
    fireEvent.click(getGraphButton('Main Graph'));
    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('button', { name: '设为跳转节点' }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'graph_created' },
    });

    await waitFor(() => {
      expect(getJumpEnterButton()).not.toBeNull();
    });

    fireEvent.click(getJumpEnterButton()!);

    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('clears jump targets when deleting a referenced graph', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));
    fireEvent.click(getGraphButton('Main Graph'));
    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('button', { name: '设为跳转节点' }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'graph_created' },
    });

    fireEvent.click(getGraphButton('Untitled Graph'));
    fireEvent.click(screen.getByRole('button', { name: '删除当前 Graph' }));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(getGraphButton('Main Graph')).toBeInTheDocument();
    });

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    expect(screen.getAllByText('未设置目标 graph').length).toBeGreaterThan(0);
    expect(getJumpEnterButton()).toBeDisabled();

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('creates a new node and renders the default markdown', () => {
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建节点' }));

    expect(screen.getAllByText('Untitled').length).toBeGreaterThan(0);
    expect(screen.getByText('在这里写内容。')).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      version: 2,
      currentGraphId: 'graph_main',
    });

    createNodeIdSpy.mockRestore();
  });

  it('deletes the selected node and its connected edges', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('button', { name: '删除选中节点' }));

    expect(screen.queryByText('note_graph')).not.toBeInTheDocument();
    expect(screen.getByText('未选择节点')).toBeInTheDocument();
  });

  it('exports current graph and workspace as json files', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '导出当前 Graph' }));
    fireEvent.click(screen.getByRole('button', { name: '导出整个 Workspace' }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
    expect(anchorClickSpy).toHaveBeenCalledTimes(2);
  });

  it('imports a valid graph json and adds it to the workspace', async () => {
    const { container } = render(<App />);

    const importFile = new File(
      [
        JSON.stringify({
          version: 2,
          graph: {
            id: 'graph_imported',
            title: 'Imported Graph',
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
          },
        }),
      ],
      'graph.json',
      { type: 'application/json' },
    );
    Object.defineProperty(importFile, 'text', {
      value: async () =>
        JSON.stringify({
          version: 2,
          graph: {
            id: 'graph_imported',
            title: 'Imported Graph',
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
          },
        }),
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [importFile] },
    });

    await waitFor(() => {
      expect(getGraphButton('Imported Graph')).toBeInTheDocument();
    });

    expect(screen.getByText('Imported Node')).toBeInTheDocument();
  });

  it('imports a valid workspace json and replaces the current workspace', async () => {
    const { container } = render(<App />);

    const importFile = new File([''], 'workspace.json', {
      type: 'application/json',
    });
    Object.defineProperty(importFile, 'text', {
      value: async () =>
        JSON.stringify({
          version: 2,
          graphs: {
            graph_other: {
              id: 'graph_other',
              title: 'Workspace Graph',
              nodes: [
                {
                  id: 'node_other',
                  position: { x: 10, y: 20 },
                  data: { title: 'Workspace Node', noteId: 'note_other' },
                },
              ],
              edges: [],
              notes: {
                note_other: {
                  id: 'note_other',
                  title: 'Workspace Node',
                  content: '# Workspace Node',
                },
              },
            },
          },
          graphOrder: ['graph_other'],
          currentGraphId: 'graph_other',
        }),
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [importFile] },
    });

    await waitFor(() => {
      expect(getGraphButton('Workspace Graph')).toBeInTheDocument();
    });

    expect(screen.getByText('Workspace Node')).toBeInTheDocument();
  });

  it('shows an error and keeps the current workspace when import json is invalid', async () => {
    const { container } = render(<App />);

    const invalidFile = new File(['{"version":99}'], 'invalid.json', {
      type: 'application/json',
    });
    Object.defineProperty(invalidFile, 'text', {
      value: async () => '{"version":99}',
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('导入失败：文件结构无效。')).toBeInTheDocument();
    });

    expect(getGraphButton('Main Graph')).toBeInTheDocument();
  });

  it('shows a friendly message when a selected node has no note content', () => {
    const selectedNode: KnowledgeNode = {
      id: 'node_missing',
      position: { x: 0, y: 0 },
      data: {
        title: 'Missing Note',
        noteId: 'note_missing',
        kind: 'default',
      },
    };

    render(<MarkdownPane selectedNode={selectedNode} selectedNote={null} />);

    expect(screen.getByText('Missing Note')).toBeInTheDocument();
    expect(screen.getByText('note_missing')).toBeInTheDocument();
    expect(screen.getByText('找不到对应的 note 内容。')).toBeInTheDocument();
  });
});
