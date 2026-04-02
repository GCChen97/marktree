import { CanvasPane } from './components/panes/CanvasPane';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { ToolbarPane } from './components/panes/ToolbarPane';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { usePersistentLayoutState } from './hooks/usePersistentLayoutState';
import { useThemePreference } from './hooks/useThemePreference';

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();
  const { theme, toggleTheme } = useThemePreference();

  return (
    <div className="app-shell" data-theme={theme}>
      <ThreePaneLayout
        mode={mode}
        sizes={sizes}
        onSizesChange={setSizes}
        panes={{
          A: (
            <ToolbarPane
              mode={mode}
              onModeChange={setMode}
              onThemeToggle={toggleTheme}
              theme={theme}
            />
          ),
          B: <CanvasPane />,
          C: <MarkdownPane />,
        }}
      />
    </div>
  );
}

export default App;
