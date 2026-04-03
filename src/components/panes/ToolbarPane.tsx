import { useRef, useState } from 'react';
import type { LayoutMode } from '../../types/layout';
import type { GraphId } from '../../types/graph';
import type { ThemeMode } from '../../types/theme';

type ToolbarInfo = {
  currentGraphTitle: string;
  nodeCount: number;
  edgeCount: number;
  selectedNodeTitle: string | null;
};

type GraphListItem = {
  id: GraphId;
  title: string;
  isCurrent: boolean;
  incomingReferenceCount: number;
};

type ToolbarPaneProps = {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  info: ToolbarInfo;
  graphItems: GraphListItem[];
  canDeleteCurrentGraph: boolean;
  onSelectGraph: (graphId: GraphId) => void;
  onCreateGraph: () => void;
  onRenameCurrentGraph: () => void;
  onDeleteCurrentGraph: () => void;
  onCreateNode: () => void;
  onDeleteSelectedNode: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterSelected: () => void;
  onConvertSelectedNodeToJump: () => void;
  onUnsetSelectedJumpNode: () => void;
  onExportCurrentGraph: () => void;
  onExportWorkspace: () => void;
  onImportData: (file: File) => void;
  canDeleteSelectedNode: boolean;
  canCenterSelected: boolean;
  canConvertSelectedNodeToJump: boolean;
  canUnsetSelectedJumpNode: boolean;
  selectedJumpTargetGraphId: GraphId | null;
  selectedJumpNodeTitle: string | null;
  availableJumpTargetGraphs: Array<{ id: GraphId; title: string }>;
  onSetSelectedJumpTargetGraph: (graphId: GraphId | null) => void;
  jumpTargetStatus: string | null;
  importError: string | null;
  isMobile?: boolean;
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
  graphItems,
  canDeleteCurrentGraph,
  onSelectGraph,
  onCreateGraph,
  onRenameCurrentGraph,
  onDeleteCurrentGraph,
  onCreateNode,
  onDeleteSelectedNode,
  onFitView,
  onZoomIn,
  onZoomOut,
  onCenterSelected,
  onConvertSelectedNodeToJump,
  onUnsetSelectedJumpNode,
  onExportCurrentGraph,
  onExportWorkspace,
  onImportData,
  canDeleteSelectedNode,
  canCenterSelected,
  canConvertSelectedNodeToJump,
  canUnsetSelectedJumpNode,
  selectedJumpTargetGraphId,
  selectedJumpNodeTitle,
  availableJumpTargetGraphs,
  onSetSelectedJumpTargetGraph,
  jumpTargetStatus,
  importError,
  isMobile = false,
}: ToolbarPaneProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isLayoutSectionExpanded, setIsLayoutSectionExpanded] = useState(
    !isMobile,
  );
  const [isInfoSectionExpanded, setIsInfoSectionExpanded] = useState(!isMobile);

  return (
    <div
      className="pane-content pane-content--toolbar"
      data-mobile={isMobile}
    >
      <header className={`pane-header${isMobile ? ' pane-header--mobile' : ''}`}>
        <p className="pane-eyebrow">Phase 6</p>
        <h1 className="pane-title">MyMind Workspace</h1>
        <p className="pane-description">
          当前工作区支持多 graph 管理、跳转节点与本地持久化。
        </p>
      </header>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <div className="graph-management__heading">
            <h2 className="section-title">Graph 管理</h2>
            <span className="section-badge">{graphItems.length} 个 graph</span>
          </div>
          <div className="graph-management__header-actions">
            <button
              aria-label="新建 Graph"
              className="icon-action-button"
              onClick={onCreateGraph}
              title="新建 Graph"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="icon-action-button__icon"
                viewBox="0 0 16 16"
              >
                <path
                  d="M8 3.25v9.5M3.25 8h9.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <button
              aria-label="重命名当前 Graph"
              className="icon-action-button"
              onClick={onRenameCurrentGraph}
              title="重命名当前 Graph"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="icon-action-button__icon"
                viewBox="0 0 16 16"
              >
                <path
                  d="M3.5 11.5 11.8 3.2a1.5 1.5 0 0 1 2.1 2.1L5.6 13.6 2.5 14l.4-3.1Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.35"
                />
              </svg>
            </button>
            <button
              aria-label="删除当前 Graph"
              className="icon-action-button icon-action-button--danger"
              disabled={!canDeleteCurrentGraph}
              onClick={onDeleteCurrentGraph}
              title="删除当前 Graph"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="icon-action-button__icon"
                viewBox="0 0 16 16"
              >
                <path
                  d="M4.5 5.25v7.25a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5.25M3.5 4.25h9M6.25 4.25v-1a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75v1M6.5 7v4M9.5 7v4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.35"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="graph-list" data-testid="graph-list">
          {graphItems.map((graphItem) => (
            <button
              className="graph-list__item"
              data-active={graphItem.isCurrent}
              key={graphItem.id}
              onClick={() => onSelectGraph(graphItem.id)}
              type="button"
            >
              <span className="graph-list__title">{graphItem.title}</span>
              <span className="graph-list__meta">
                {graphItem.incomingReferenceCount} 个引用
              </span>
            </button>
          ))}
        </div>
      </section>

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
          {isMobile ? (
            <button
              aria-expanded={isLayoutSectionExpanded}
              className="section-toggle"
              onClick={() =>
                setIsLayoutSectionExpanded((currentState) => !currentState)
              }
              type="button"
            >
              {isLayoutSectionExpanded ? '收起' : '展开'}
            </button>
          ) : (
            <span className="section-badge">A 固定两侧</span>
          )}
        </div>
        {isMobile && !isLayoutSectionExpanded ? (
          <p className="section-copy">
            当前桌面布局预设为 `{mode}`。展开后可调整回到桌面端时使用的三栏顺序。
          </p>
        ) : (
          <>
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
                  title={option.label}
                  type="button"
                >
                  <span className="mode-button__label">{option.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
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
          <button
            className="toolbar-action-button"
            disabled={!canConvertSelectedNodeToJump}
            onClick={onConvertSelectedNodeToJump}
            type="button"
          >
            设为跳转节点
          </button>
          <button
            className="toolbar-action-button"
            disabled={!canUnsetSelectedJumpNode}
            onClick={onUnsetSelectedJumpNode}
            type="button"
          >
            取消跳转节点
          </button>
        </div>
      </section>

      {selectedJumpNodeTitle ? (
        <section className="toolbar-section">
          <h2 className="section-title">跳转配置</h2>
          <p className="section-copy">当前节点：{selectedJumpNodeTitle}</p>
          <label className="toolbar-select-field">
            <span className="info-card__label">目标 Graph</span>
            <select
              className="toolbar-select"
              onChange={(event) =>
                onSetSelectedJumpTargetGraph(event.target.value || null)
              }
              value={selectedJumpTargetGraphId ?? ''}
            >
              <option value="">无</option>
              {availableJumpTargetGraphs.map((graphItem) => (
                <option key={graphItem.id} value={graphItem.id}>
                  {graphItem.title}
                </option>
              ))}
            </select>
          </label>
          <p className="section-copy">
            {jumpTargetStatus ?? '未设置目标 graph'}
          </p>
        </section>
      ) : null}

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
            onClick={onExportCurrentGraph}
            type="button"
          >
            导出当前 Graph
          </button>
          <button
            className="toolbar-action-button"
            onClick={onExportWorkspace}
            type="button"
          >
            导出整个 Workspace
          </button>
          <button
            className="toolbar-action-button"
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            导入 JSON
          </button>
          <input
            accept=".json,application/json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onImportData(file);
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
        <div className="section-heading-row">
          <h2 className="section-title">信息区</h2>
          {isMobile ? (
            <button
              aria-expanded={isInfoSectionExpanded}
              className="section-toggle"
              onClick={() =>
                setIsInfoSectionExpanded((currentState) => !currentState)
              }
              type="button"
            >
              {isInfoSectionExpanded ? '收起' : '展开'}
            </button>
          ) : null}
        </div>
        {isMobile && !isInfoSectionExpanded ? (
          <p className="section-copy">
            当前 graph：{info.currentGraphTitle}，共 {info.nodeCount} 个节点、{info.edgeCount} 条边，选中：
            {info.selectedNodeTitle ?? '未选择'}。
          </p>
        ) : (
          <div className="info-grid">
            <div className="info-card">
              <span className="info-card__label">当前 Graph</span>
              <strong>{info.currentGraphTitle}</strong>
            </div>
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
            <div className="info-card info-card--wide">
              <span className="info-card__label">当前选中</span>
              <strong>{info.selectedNodeTitle ?? '未选择'}</strong>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
