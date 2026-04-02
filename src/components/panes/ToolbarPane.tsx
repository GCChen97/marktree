import type { LayoutMode } from '../../types/layout';
import type { ThemeMode } from '../../types/theme';

type ToolbarInfo = {
  nodeCount: number;
  edgeCount: number;
  selectedNodeTitle: string | null;
};

type ToolbarPaneProps = {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  info: ToolbarInfo;
};

const layoutOptions: Array<{ mode: LayoutMode; label: string }> = [
  { mode: 'ABC', label: 'ABC' },
  { mode: 'ACB', label: 'ACB' },
  { mode: 'CBA', label: 'CBA' },
  { mode: 'BCA', label: 'BCA' },
];

export function ToolbarPane({
  mode,
  onModeChange,
  theme,
  onThemeToggle,
  info,
}: ToolbarPaneProps) {
  return (
    <div className="pane-content pane-content--toolbar">
      <header className="pane-header">
        <p className="pane-eyebrow">Phase 2</p>
        <h1 className="pane-title">MyMind Workspace</h1>
        <p className="pane-description">
          当前已经进入画布阶段，重点验证 React Flow 接入、节点选中联动和三栏协作是否顺畅。
        </p>
      </header>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <h2 className="section-title">外观主题</h2>
          <span className="section-badge">
            {theme === 'night' ? '夜晚' : '白天'}
          </span>
        </div>
        <p className="section-copy">
          当前提供一键切换的夜晚主题，保留同一套柔和配色和玻璃感面板。
        </p>
        <label className="theme-switch" htmlFor="theme-toggle">
          <span className="theme-switch__copy">
            <strong>夜晚主题</strong>
            <span>
              {theme === 'night'
                ? '适合低光环境，降低页面整体亮度。'
                : '保留当前清爽主题，适合白天浏览。'}
            </span>
          </span>
          <span className="theme-switch__control">
            <input
              checked={theme === 'night'}
              className="theme-switch__input"
              id="theme-toggle"
              onChange={onThemeToggle}
              role="switch"
              type="checkbox"
            />
            <span aria-hidden="true" className="theme-switch__track">
              <span className="theme-switch__thumb" />
            </span>
          </span>
        </label>
      </section>

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
              aria-label={`切换到 ${option.label} 布局`}
              className="mode-button"
              data-active={option.mode === mode}
              key={option.mode}
              onClick={() => onModeChange(option.mode)}
              title={
                option.mode === 'ABC'
                  ? '工具栏 | 画布 | Markdown'
                  : option.mode === 'ACB'
                    ? '工具栏 | Markdown | 画布'
                    : option.mode === 'CBA'
                      ? 'Markdown | 画布 | 工具栏'
                      : '画布 | Markdown | 工具栏'
              }
              type="button"
            >
              <span className="mode-button__label">{option.label}</span>
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
            <strong>{info.nodeCount}</strong>
          </div>
          <div className="info-card">
            <span className="info-card__label">边数</span>
            <strong>{info.edgeCount}</strong>
          </div>
          <div className="info-card">
            <span className="info-card__label">当前选中</span>
            <strong>{info.selectedNodeTitle ?? '未选择'}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
