import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { LAYOUT_STORAGE_KEY } from './utils/layout';
import { THEME_STORAGE_KEY } from './hooks/useThemePreference';

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
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'day';
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

  it('syncs selected node details to the toolbar and markdown pane', () => {
    render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));

    expect(screen.getByText('note_graph')).toBeInTheDocument();
    expect(screen.getAllByText('Knowledge Graph').length).toBeGreaterThan(1);
  });

  it('clears the selected node when clicking the empty canvas pane', () => {
    const { container } = render(<App />);

    fireEvent.click(getFlowNodeByLabel('Knowledge Graph'));
    fireEvent.click(container.querySelector('.react-flow__pane') as Element);

    expect(screen.getByText('未选择节点')).toBeInTheDocument();
    expect(screen.getAllByText('未选择').length).toBeGreaterThan(0);
  });
});
