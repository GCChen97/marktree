import type { LayoutMode } from '../../types/layout';

type ToolbarPaneProps = {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
};

const layoutOptions: Array<{ mode: LayoutMode; label: string }> = [
  { mode: 'ABC', label: 'ABC' },
  { mode: 'ACB', label: 'ACB' },
  { mode: 'CBA', label: 'CBA' },
  { mode: 'BCA', label: 'BCA' },
];

export function ToolbarPane({ mode, onModeChange }: ToolbarPaneProps) {
  return (
    <div className="pane-content pane-content--toolbar">
      <header className="pane-header">
        <p className="pane-eyebrow">Phase 1</p>
        <h1 className="pane-title">MyMind Workspace</h1>
        <p className="pane-description">
          先把三栏骨架、布局模式和尺寸系统稳定下来，后续再接入
          React Flow 与 Markdown 详情。
        </p>
      </header>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <h2 className="section-title">布局模式</h2>
          <span className="section-badge">A 固定两侧</span>
        </div>
        <p className="section-copy">
          支持四种固定模式。工具栏始终处于最左或最右，画布区和 Markdown
          区可左右互换。
        </p>
        <div
          aria-label="Layout mode selector"
          className="layout-mode-grid"
          role="group"
        >
          {layoutOptions.map((option) => (
            <button
              aria-pressed={option.mode === mode}
              className="mode-button"
              data-active={option.mode === mode}
              key={option.mode}
              onClick={() => onModeChange(option.mode)}
              type="button"
            >
              <span className="mode-button__label">{option.label}</span>
              <span className="mode-button__hint">
                {option.mode === 'ABC' && '工具栏 | 画布 | Markdown'}
                {option.mode === 'ACB' && '工具栏 | Markdown | 画布'}
                {option.mode === 'CBA' && 'Markdown | 画布 | 工具栏'}
                {option.mode === 'BCA' && '画布 | Markdown | 工具栏'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">图谱操作</h2>
        <ul className="placeholder-list">
          <li>新建节点</li>
          <li>删除选中节点</li>
          <li>自动布局入口</li>
        </ul>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">视图操作</h2>
        <ul className="placeholder-list">
          <li>Fit View</li>
          <li>Zoom In / Zoom Out</li>
          <li>Center Selected</li>
        </ul>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">数据操作</h2>
        <ul className="placeholder-list">
          <li>导出 JSON</li>
          <li>导入 JSON</li>
          <li>重置默认图谱</li>
        </ul>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">信息区</h2>
        <div className="info-grid">
          <div className="info-card">
            <span className="info-card__label">当前布局</span>
            <strong>{mode}</strong>
          </div>
          <div className="info-card">
            <span className="info-card__label">节点数</span>
            <strong>0</strong>
          </div>
          <div className="info-card">
            <span className="info-card__label">边数</span>
            <strong>0</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
