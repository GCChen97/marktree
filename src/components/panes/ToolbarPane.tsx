import type { LayoutMode } from '../../types/layout';
import type { ThemeMode } from '../../types/theme';
import { useRef } from 'react';

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
  onCreateNode: () => void;
  onDeleteSelectedNode: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterSelected: () => void;
  onResetGraph: () => void;
  onExportGraph: () => void;
  onImportGraph: (file: File) => void;
  canDeleteSelectedNode: boolean;
  canCenterSelected: boolean;
  importError: string | null;
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
  onCreateNode,
  onDeleteSelectedNode,
  onFitView,
  onZoomIn,
  onZoomOut,
  onCenterSelected,
  onResetGraph,
  onExportGraph,
  onImportGraph,
  canDeleteSelectedNode,
  canCenterSelected,
  importError,
}: ToolbarPaneProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="pane-content pane-content--toolbar">
      <header className="pane-header">
        <p className="pane-eyebrow">Phase 4</p>
        <h1 className="pane-title">MyMind Workspace</h1>
        <p className="pane-description">
          左栏现在负责图谱管理、视图控制与本地图谱持久化。
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
        <div className="toolbar-action-list">
          <button className="toolbar-action-button" onClick={onCreateNode} type="button">
            新建节点
          </button>
          <button
            className="toolbar-action-button"
            disabled={!canDeleteSelectedNode}
            onClick={onDeleteSelectedNode}
            type="button"
          >
            删除选中节点
          </button>
        </div>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">视图操作</h2>
        <div className="toolbar-action-list">
          <button className="toolbar-action-button" onClick={onFitView} type="button">
            Fit View
          </button>
          <button className="toolbar-action-button" onClick={onZoomIn} type="button">
            Zoom In
          </button>
          <button className="toolbar-action-button" onClick={onZoomOut} type="button">
            Zoom Out
          </button>
          <button
            className="toolbar-action-button"
            disabled={!canCenterSelected}
            onClick={onCenterSelected}
            type="button"
          >
            Center Selected
          </button>
        </div>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">数据操作</h2>
        <div className="toolbar-action-list">
          <button
            className="toolbar-action-button"
            onClick={onExportGraph}
            type="button"
          >
            导出 JSON
          </button>
          <button
            className="toolbar-action-button"
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            导入 JSON
          </button>
          <button
            className="toolbar-action-button"
            onClick={onResetGraph}
            type="button"
          >
            重置默认图谱
          </button>
          <input
            accept=".json,application/json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onImportGraph(file);
              }

              event.currentTarget.value = '';
            }}
            ref={importInputRef}
            type="file"
          />
        </div>
        {importError ? <p className="toolbar-feedback">{importError}</p> : null}
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
