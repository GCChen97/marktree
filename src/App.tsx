import { CanvasPane } from './components/panes/CanvasPane';
import { MarkdownPane } from './components/panes/MarkdownPane';
import { ToolbarPane } from './components/panes/ToolbarPane';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { usePersistentLayoutState } from './hooks/usePersistentLayoutState';

function App() {
  const { mode, sizes, setMode, setSizes } = usePersistentLayoutState();

  return (
    <div className="app-shell">
      <ThreePaneLayout
        mode={mode}
        sizes={sizes}
        onSizesChange={setSizes}
        panes={{
          A: <ToolbarPane mode={mode} onModeChange={setMode} />,
          B: <CanvasPane />,
          C: <MarkdownPane />,
        }}
      />
    </div>
  );
}

export default App;
