import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import App from './App';
import { MarkdownPane } from './components/panes/MarkdownPane';
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

function getMarkdownList() {
  return within(screen.getByTestId('markdown-list'));
}

function getGraphItem(title: string) {
  return getGraphList().getByText(title).closest('[role="option"]') as HTMLElement;
}

function getMarkdownItem(title: string) {
  return getMarkdownList().getByText(title).closest('[role="option"]') as HTMLElement;
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

  it('renders the default desktop layout with graph and markdown management visible', () => {
    render(<App />);

    expect(screen.getByText('Markdown 管理')).toBeInTheDocument();
    expect(screen.getByText('Graph 管理')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /夜晚主题/i })).toBeInTheDocument();
    expect(
      screen.getByText('Graph 管理').compareDocumentPosition(
        screen.getByText('Markdown 管理'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText('Markdown 管理').compareDocumentPosition(
        screen.getByText('信息区'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(getGraphItem('Main Graph')).toBeInTheDocument();
    expect(getMarkdownList().getByText('Knowledge Graph')).toBeInTheDocument();
    expect(screen.getAllByText('React Flow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Markdown Pane').length).toBeGreaterThan(0);
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

  it('shows repo file controls in local author mode', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '选择目录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同步目录' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '立即保存' })).toBeDisabled();
    expect(
      screen.getByText(/先选择一次 `public\/data` 目录/i),
    ).toBeInTheDocument();
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
      expect(getGraphItem('Untitled Graph')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Start').length).toBeGreaterThan(0);
    expect(getMarkdownList().getAllByRole('option')).toHaveLength(3);

    fireEvent.doubleClick(getGraphItem('Untitled Graph'));
    const inlineEditor = await screen.findByLabelText('重命名 Graph', {
      selector: 'input',
    });
    fireEvent.change(inlineEditor, { target: { value: 'Renamed Graph' } });
    fireEvent.keyDown(inlineEditor, { key: 'Enter' });
    expect(getGraphItem('Renamed Graph')).toBeInTheDocument();

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('keeps inline graph rename active while typing spaces', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));

    await waitFor(() => {
      expect(getGraphItem('Untitled Graph')).toBeInTheDocument();
    });

    fireEvent.doubleClick(getGraphItem('Untitled Graph'));
    const inlineEditor = await screen.findByLabelText('重命名 Graph', {
      selector: 'input',
    });

    fireEvent.keyDown(inlineEditor, { key: ' ' });
    expect(screen.getByLabelText('重命名 Graph', { selector: 'input' })).toBeInTheDocument();

    fireEvent.change(inlineEditor, { target: { value: 'Renamed Graph Two' } });
    fireEvent.keyDown(inlineEditor, { key: 'Enter' });

    expect(getGraphItem('Renamed Graph Two')).toBeInTheDocument();

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
    fireEvent.click(getGraphItem('Main Graph'));

    await waitFor(() => {
      expect(screen.getAllByText('Knowledge Graph').length).toBeGreaterThan(0);
    });

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('stores connection orientation per graph and restores it when switching graphs', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    const orientationSwitch = screen.getByRole('switch', { name: '上下连接' });

    expect(orientationSwitch).not.toBeChecked();

    fireEvent.click(orientationSwitch);
    expect(orientationSwitch).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));

    await waitFor(() => {
      expect(getGraphItem('Untitled Graph')).toBeInTheDocument();
    });

    expect(screen.getByRole('switch', { name: '上下连接' })).not.toBeChecked();

    fireEvent.click(getGraphItem('Main Graph'));

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '上下连接' })).toBeChecked();
    });

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('stores edge style per graph and restores it when switching graphs', async () => {
    const createGraphIdSpy = vi
      .spyOn(graphUtils, 'createGraphId')
      .mockReturnValue('graph_created');
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created_root');

    render(<App />);

    const edgeStyleSwitch = screen.getByRole('switch', { name: '折线边' });

    expect(edgeStyleSwitch).not.toBeChecked();

    fireEvent.click(edgeStyleSwitch);
    expect(edgeStyleSwitch).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: '新建 Graph' }));

    await waitFor(() => {
      expect(getGraphItem('Untitled Graph')).toBeInTheDocument();
    });

    expect(screen.getByRole('switch', { name: '折线边' })).not.toBeChecked();

    fireEvent.click(getGraphItem('Main Graph'));

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '折线边' })).toBeChecked();
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

  it('keeps the jump target selector disabled until the selected node becomes a jump node', () => {
    render(<App />);

    const jumpSwitch = screen.getByRole('switch', { name: '跳转节点' });
    const targetGraphSelector = screen.getByLabelText(/目标 Graph/i);

    expect(jumpSwitch).toBeDisabled();
    expect(targetGraphSelector).toBeDisabled();

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));

    expect(jumpSwitch).toBeEnabled();
    expect(targetGraphSelector).toBeDisabled();

    fireEvent.click(jumpSwitch);

    expect(targetGraphSelector).toBeEnabled();
  });

  it('starts inline title editing on double click and commits with Enter', async () => {
    render(<App />);

    fireEvent.doubleClick(
      within(getFlowNodeByLabel('Knowledge Graph')).getByText('Knowledge Graph'),
    );

    const inlineEditor = await screen.findByLabelText('节点标题编辑', {
      selector: 'input',
    });
    fireEvent.change(inlineEditor, {
      target: { value: 'Knowledge Hub' },
    });
    fireEvent.keyDown(inlineEditor, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getAllByText('Knowledge Hub').length).toBeGreaterThan(0);
    });
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
    fireEvent.click(getGraphItem('Main Graph'));
    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('switch', { name: '跳转节点' }));

    const targetGraphSelector = screen.getByLabelText(/目标 Graph/i);

    expect(targetGraphSelector).toBeEnabled();

    fireEvent.change(targetGraphSelector, {
      target: { value: 'Untitled Graph' },
    });
    fireEvent.keyDown(targetGraphSelector, { key: 'Enter' });

    expect(targetGraphSelector).toHaveValue('Untitled Graph');

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
    fireEvent.click(getGraphItem('Main Graph'));
    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('switch', { name: '跳转节点' }));
    fireEvent.change(screen.getByLabelText(/目标 Graph/i), {
      target: { value: 'Untitled Graph' },
    });
    fireEvent.keyDown(screen.getByLabelText(/目标 Graph/i), { key: 'Enter' });

    await waitFor(() => {
      expect(getJumpEnterButton()).not.toBeNull();
    });

    fireEvent.click(getJumpEnterButton()!);

    await waitFor(() => {
      expect(screen.getAllByText('Start').length).toBeGreaterThan(0);
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
    fireEvent.click(getGraphItem('Main Graph'));
    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(screen.getByRole('switch', { name: '跳转节点' }));
    fireEvent.change(screen.getByLabelText(/目标 Graph/i), {
      target: { value: 'Untitled Graph' },
    });
    fireEvent.keyDown(screen.getByLabelText(/目标 Graph/i), { key: 'Enter' });

    fireEvent.click(getGraphItem('Untitled Graph'));
    fireEvent.click(screen.getByRole('button', { name: '删除当前 Graph' }));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(getGraphItem('Main Graph')).toBeInTheDocument();
    });

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    expect(screen.getAllByText('未设置目标 graph').length).toBeGreaterThan(0);
    expect(getJumpEnterButton()).toBeDisabled();

    createGraphIdSpy.mockRestore();
    createNodeIdSpy.mockRestore();
  });

  it('associates a selected node with an existing or new markdown from the toolbar input', async () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));

    const markdownInput = screen.getByLabelText('关联 Markdown');
    fireEvent.change(markdownInput, {
      target: { value: 'React Flow' },
    });
    fireEvent.keyDown(markdownInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('note_flow')).toBeInTheDocument();
    });

    fireEvent.change(markdownInput, {
      target: { value: 'SLAM' },
    });
    fireEvent.keyDown(markdownInput, { key: 'Enter' });

    await waitFor(() => {
      expect(getMarkdownList().getByText('SLAM')).toBeInTheDocument();
    });
  });

  it('creates a new node without creating markdown', () => {
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValue('node_created');

    render(<App />);
    const markdownItemCount = getMarkdownList().getAllByRole('option').length;

    fireEvent.click(screen.getByRole('button', { name: '新建节点' }));

    const titleEditor = screen.getByLabelText('节点标题编辑', {
      selector: 'input',
    });

    expect(titleEditor).toBeInTheDocument();
    expect(document.activeElement).toBe(titleEditor);
    expect(screen.getByText('当前节点还没有关联 markdown。')).toBeInTheDocument();
    expect(getMarkdownList().getAllByRole('option')).toHaveLength(markdownItemCount);

    createNodeIdSpy.mockRestore();
  });

  it('creates sibling, child, and delete actions from canvas keyboard shortcuts', async () => {
    const createNodeIdSpy = vi
      .spyOn(graphUtils, 'createNodeId')
      .mockReturnValueOnce('node_isolated')
      .mockReturnValueOnce('node_child')
      .mockReturnValueOnce('node_sibling');

    render(<App />);

    const canvasSurface = screen.getByTestId('graph-canvas-surface');
    canvasSurface.focus();
    fireEvent.keyDown(canvasSurface, { key: 'a' });

    await waitFor(() => {
      const editors = screen.getAllByLabelText('节点标题编辑', {
        selector: 'input',
      });

      expect(editors).toHaveLength(1);
      expect(document.activeElement).toBe(editors[0]);
    });

    fireEvent.keyDown(screen.getByLabelText('节点标题编辑', { selector: 'input' }), {
      key: 'Escape',
    });

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    canvasSurface.focus();
    fireEvent.keyDown(canvasSurface, { key: 'Enter', shiftKey: true });

    await waitFor(() => {
      expect(
        screen.getAllByLabelText('节点标题编辑', { selector: 'input' }),
      ).toHaveLength(1);
    });

    fireEvent.keyDown(screen.getByLabelText('节点标题编辑', { selector: 'input' }), {
      key: 'Escape',
    });

    fireEvent.click(getFlowNodeByLabel('React Flow'));
    canvasSurface.focus();
    fireEvent.keyDown(canvasSurface, { key: 'Enter' });

    await waitFor(() => {
      expect(
        screen.getAllByLabelText('节点标题编辑', { selector: 'input' }),
      ).toHaveLength(1);
    });

    fireEvent.keyDown(screen.getByLabelText('节点标题编辑', { selector: 'input' }), {
      key: 'Escape',
    });

    fireEvent.click(getFlowNodeByLabel('React Flow'));
    canvasSurface.focus();
    fireEvent.keyDown(canvasSurface, { key: 'Delete' });

    await waitFor(() => {
      expect(screen.queryByText('note_flow')).not.toBeInTheDocument();
    });
    expect(getMarkdownList().getByText('React Flow')).toBeInTheDocument();

    createNodeIdSpy.mockRestore();
  });

  it('renames and deletes markdowns manually from the toolbar', async () => {
    render(<App />);

    fireEvent.doubleClick(getMarkdownItem('Knowledge Graph'));
    const inlineEditor = await screen.findByLabelText('重命名 Markdown', {
      selector: 'input',
    });
    fireEvent.keyDown(inlineEditor, { key: ' ' });
    expect(
      screen.getByLabelText('重命名 Markdown', { selector: 'input' }),
    ).toBeInTheDocument();
    fireEvent.change(inlineEditor, { target: { value: 'Renamed Markdown' } });
    fireEvent.keyDown(inlineEditor, { key: 'Enter' });

    expect(getMarkdownList().getByText('Renamed Markdown')).toBeInTheDocument();

    fireEvent.click(getMarkdownItem('Renamed Markdown'));
    fireEvent.click(screen.getByRole('button', { name: '删除当前 Markdown' }));
    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(getMarkdownList().queryByText('Renamed Markdown')).not.toBeInTheDocument();
    });
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

    const graphJson = JSON.stringify({
      version: 3,
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
      },
      notes: {
        note_imported: {
          id: 'note_imported',
          title: 'Imported Node',
          content: '# Imported Node\n\nImported body.',
        },
      },
    });
    const importFile = new File([graphJson], 'graph.json', {
      type: 'application/json',
    });
    Object.defineProperty(importFile, 'text', {
      value: async () => graphJson,
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [importFile] },
    });

    await waitFor(() => {
      expect(getGraphItem('Imported Graph')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Imported Node').length).toBeGreaterThan(0);
  });

  it('imports a valid workspace json and replaces the current workspace', async () => {
    const { container } = render(<App />);

    const workspaceJson = JSON.stringify({
      version: 3,
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
        },
      },
      notes: {
        note_other: {
          id: 'note_other',
          title: 'Workspace Node',
          content: '# Workspace Node',
        },
      },
      graphOrder: ['graph_other'],
      noteOrder: ['note_other'],
      currentGraphId: 'graph_other',
    });
    const importFile = new File([workspaceJson], 'workspace.json', {
      type: 'application/json',
    });
    Object.defineProperty(importFile, 'text', {
      value: async () => workspaceJson,
    });

    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [importFile] },
    });

    await waitFor(() => {
      expect(getGraphItem('Workspace Graph')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Workspace Node').length).toBeGreaterThan(0);
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

    expect(getGraphItem('Main Graph')).toBeInTheDocument();
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
    expect(screen.getByText('找不到对应的 markdown 内容。')).toBeInTheDocument();
  });

  it('shows a friendly message when a selected node has no markdown linked', () => {
    const selectedNode: KnowledgeNode = {
      id: 'node_unlinked',
      position: { x: 0, y: 0 },
      data: {
        title: 'Unlinked Note',
        noteId: null,
        kind: 'default',
      },
    };

    render(<MarkdownPane selectedNode={selectedNode} selectedNote={null} />);

    expect(screen.getByText('Unlinked Note')).toBeInTheDocument();
    expect(screen.getByText('未关联 Markdown')).toBeInTheDocument();
    expect(screen.getByText('当前节点还没有关联 markdown。')).toBeInTheDocument();
  });
});
