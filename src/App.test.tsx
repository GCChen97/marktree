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
    expect(screen.getAllByTestId('resize-handle')).toHaveLength(2);

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
});
