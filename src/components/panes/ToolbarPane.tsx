import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { LayoutMode } from '../../types/layout';
import type {
  GraphConnectionOrientation,
  GraphEdgeStyle,
  GraphId,
  NoteId,
  WorkspaceDataMode,
} from '../../types/graph';
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

type MarkdownListItem = {
  id: NoteId;
  title: string;
  usageCount: number;
  isActive: boolean;
  isLinkedToSelectedNode: boolean;
};

type ToolbarPaneProps = {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  dataMode: WorkspaceDataMode;
  isReadOnly: boolean;
  theme: ThemeMode;
  onThemeToggle: () => void;
  info: ToolbarInfo;
  graphItems: GraphListItem[];
  markdownItems: MarkdownListItem[];
  editingGraphId: GraphId | null;
  editingMarkdownId: NoteId | null;
  canDeleteCurrentGraph: boolean;
  canDeleteSelectedNode: boolean;
  canConvertSelectedNodeToJump: boolean;
  canUnsetSelectedJumpNode: boolean;
  canRenameActiveMarkdown: boolean;
  canDeleteActiveMarkdown: boolean;
  onSelectGraph: (graphId: GraphId) => void;
  onStartGraphRename: (graphId: GraphId | null) => void;
  onCommitGraphRename: (graphId: GraphId, title: string) => void;
  onCreateGraph: () => void;
  onDeleteCurrentGraph: () => void;
  onCreateNode: () => void;
  onDeleteSelectedNode: () => void;
  onConvertSelectedNodeToJump: () => void;
  onUnsetSelectedJumpNode: () => void;
  onExportCurrentGraph: () => void;
  onExportWorkspace: () => void;
  onImportData: (file: File) => void;
  onSelectMarkdown: (noteId: NoteId) => void;
  onStartMarkdownRename: (noteId: NoteId | null) => void;
  onCommitMarkdownRename: (noteId: NoteId, title: string) => void;
  onCreateMarkdown: () => void;
  onDeleteActiveMarkdown: () => void;
  selectedJumpTargetGraphId: GraphId | null;
  availableJumpTargetGraphs: Array<{ id: GraphId; title: string }>;
  onSetSelectedJumpTargetGraph: (graphId: GraphId | null) => void;
  connectionOrientation: GraphConnectionOrientation;
  edgeStyle: GraphEdgeStyle;
  onToggleConnectionOrientation: (
    next: GraphConnectionOrientation,
  ) => void;
  onToggleEdgeStyle: (next: GraphEdgeStyle) => void;
  canSaveDataFiles: boolean;
  directoryName: string | null;
  directoryError: string | null;
  onSelectDataDirectory: () => void;
  onSaveDataFiles: () => void;
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
  dataMode,
  isReadOnly,
  theme,
  onThemeToggle,
  info,
  graphItems,
  markdownItems,
  editingGraphId,
  editingMarkdownId,
  canDeleteCurrentGraph,
  canDeleteSelectedNode,
  canConvertSelectedNodeToJump,
  canUnsetSelectedJumpNode,
  canRenameActiveMarkdown,
  canDeleteActiveMarkdown,
  onSelectGraph,
  onStartGraphRename,
  onCommitGraphRename,
  onCreateGraph,
  onDeleteCurrentGraph,
  onCreateNode,
  onDeleteSelectedNode,
  onConvertSelectedNodeToJump,
  onUnsetSelectedJumpNode,
  onExportCurrentGraph,
  onExportWorkspace,
  onImportData,
  onSelectMarkdown,
  onStartMarkdownRename,
  onCommitMarkdownRename,
  onCreateMarkdown,
  onDeleteActiveMarkdown,
  selectedJumpTargetGraphId,
  availableJumpTargetGraphs,
  onSetSelectedJumpTargetGraph,
  connectionOrientation,
  edgeStyle,
  onToggleConnectionOrientation,
  onToggleEdgeStyle,
  canSaveDataFiles,
  directoryName,
  directoryError,
  onSelectDataDirectory,
  onSaveDataFiles,
  importError,
  isMobile = false,
}: ToolbarPaneProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isInfoSectionExpanded, setIsInfoSectionExpanded] = useState(!isMobile);
  const [graphRenameDraft, setGraphRenameDraft] = useState('');
  const [markdownRenameDraft, setMarkdownRenameDraft] = useState('');

  const currentGraphItem =
    graphItems.find((graphItem) => graphItem.isCurrent) ?? null;
  const activeMarkdownItem =
    markdownItems.find((markdownItem) => markdownItem.isActive) ?? null;
  const connectionOrientationLabel =
    connectionOrientation === 'vertical' ? '上下连接' : '左右连接';
  const edgeStyleLabel = edgeStyle === 'elbow' ? '折线边' : '曲线边';

  useEffect(() => {
    if (editingGraphId && !graphItems.some((graphItem) => graphItem.id === editingGraphId)) {
      onStartGraphRename(null);
      setGraphRenameDraft('');
    }
  }, [editingGraphId, graphItems, onStartGraphRename]);

  useEffect(() => {
    if (
      editingMarkdownId &&
      !markdownItems.some((markdownItem) => markdownItem.id === editingMarkdownId)
    ) {
      onStartMarkdownRename(null);
      setMarkdownRenameDraft('');
    }
  }, [editingMarkdownId, markdownItems, onStartMarkdownRename]);

  function handleListItemKeyDown(
    event: KeyboardEvent<HTMLElement>,
    action: () => void,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    action();
  }

  function startGraphRename(graphId: GraphId, title: string) {
    if (isReadOnly) {
      return;
    }

    onStartGraphRename(graphId);
    setGraphRenameDraft(title);
  }

  function startMarkdownRename(noteId: NoteId, title: string) {
    if (isReadOnly) {
      return;
    }

    onStartMarkdownRename(noteId);
    setMarkdownRenameDraft(title);
  }

  return (
    <div
      className="pane-content pane-content--toolbar"
      data-mobile={isMobile}
    >
      <header className={`pane-header${isMobile ? ' pane-header--mobile' : ''}`}>
        <div className="toolbar-header-row">
          <div className="toolbar-header-copy">
            <p className="pane-eyebrow">Phase 7</p>
            <h1 className="pane-title">MyMind Workspace</h1>
            <p className="pane-description">
              当前 graph 的节点编辑、markdown 关联和 workspace 管理都集中在这里。
            </p>
          </div>
          <div className="toolbar-header-actions">
            <label className="theme-switch theme-switch--compact" htmlFor="theme-toggle">
              <input
                aria-label="夜晚主题"
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
            </label>
          </div>
        </div>
      </header>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <h2 className="section-title">布局</h2>
          <div
            aria-label="Layout mode selector"
            className="layout-mode-grid layout-mode-grid--compact layout-mode-grid--inline"
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
        </div>
      </section>

      <section className="toolbar-section">
        <h2 className="section-title">图谱操作</h2>
        <div className="toolbar-action-list toolbar-action-list--inline">
          <button
            className="toolbar-action-button"
            disabled={isReadOnly}
            onClick={onCreateNode}
            type="button"
          >
            新建节点
          </button>
          <button
            className="toolbar-action-button"
            disabled={isReadOnly || !canDeleteSelectedNode}
            onClick={onDeleteSelectedNode}
            type="button"
          >
            删除节点
          </button>
        </div>
        <div className="toolbar-jump-config toolbar-jump-config--stacked">
          <div className="toolbar-inline-switches">
          <label
            className="toolbar-switch toolbar-switch--compact"
            htmlFor="connection-orientation-toggle"
          >
            <input
              aria-label="上下连接"
              checked={connectionOrientation === 'vertical'}
              className="toolbar-switch__input"
              disabled={isReadOnly}
              id="connection-orientation-toggle"
              onChange={(event) =>
                onToggleConnectionOrientation(
                  event.target.checked ? 'vertical' : 'horizontal',
                )
              }
              role="switch"
              type="checkbox"
            />
            <span aria-hidden="true" className="toolbar-switch__track">
              <span className="toolbar-switch__thumb" />
            </span>
            <span className="toolbar-switch__label">
              {connectionOrientationLabel}
            </span>
          </label>
          <label
            className="toolbar-switch toolbar-switch--compact"
            htmlFor="edge-style-toggle"
          >
            <input
              aria-label="折线边"
              checked={edgeStyle === 'elbow'}
              className="toolbar-switch__input"
              disabled={isReadOnly}
              id="edge-style-toggle"
              onChange={(event) =>
                onToggleEdgeStyle(event.target.checked ? 'elbow' : 'curved')
              }
              role="switch"
              type="checkbox"
            />
            <span aria-hidden="true" className="toolbar-switch__track">
              <span className="toolbar-switch__thumb" />
            </span>
            <span className="toolbar-switch__label">{edgeStyleLabel}</span>
          </label>
          </div>
        </div>
        <div className="toolbar-jump-config">
          <label className="toolbar-switch toolbar-switch--compact" htmlFor="jump-node-toggle-inline">
            <input
              aria-label="跳转节点"
              checked={canUnsetSelectedJumpNode}
              className="toolbar-switch__input"
              disabled={
                isReadOnly ||
                (!canConvertSelectedNodeToJump && !canUnsetSelectedJumpNode)
              }
              id="jump-node-toggle-inline"
              onChange={() => {
                if (canUnsetSelectedJumpNode) {
                  onUnsetSelectedJumpNode();
                  return;
                }

                if (canConvertSelectedNodeToJump) {
                  onConvertSelectedNodeToJump();
                }
              }}
              role="switch"
              type="checkbox"
            />
            <span aria-hidden="true" className="toolbar-switch__track">
              <span className="toolbar-switch__thumb" />
            </span>
            <span className="toolbar-switch__label">跳转</span>
          </label>
          <label className="toolbar-select-field toolbar-select-field--inline">
            <select
              aria-label="目标 Graph"
              className="toolbar-select"
              disabled={isReadOnly || !canUnsetSelectedJumpNode}
              onChange={(event) =>
                onSetSelectedJumpTargetGraph(event.target.value || null)
              }
              value={selectedJumpTargetGraphId ?? ''}
            >
              <option value="">选择目标 Graph</option>
              {availableJumpTargetGraphs.map((graphItem) => (
                <option key={graphItem.id} value={graphItem.id}>
                  {graphItem.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <h2 className="section-title">文件</h2>
          <div className="toolbar-action-list toolbar-action-list--inline toolbar-action-list--file">
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
            {!isReadOnly ? (
              <button
                className="toolbar-action-button"
                onClick={() => importInputRef.current?.click()}
                type="button"
              >
                导入 JSON
              </button>
            ) : null}
            {dataMode === 'author-local' ? (
              <>
                <button
                  className="toolbar-action-button"
                  onClick={onSelectDataDirectory}
                  type="button"
                >
                  选择目录
                </button>
                <button
                  className="toolbar-action-button"
                  disabled={!canSaveDataFiles}
                  onClick={onSaveDataFiles}
                  type="button"
                >
                  立即保存
                </button>
              </>
            ) : null}
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
        </div>
        <p className="section-copy">
          {dataMode === 'author-local'
            ? directoryName
              ? `本地作者模式：已绑定目录「${directoryName}」。当前 graph 和 note 文件会直接写回仓库数据目录。`
              : '本地作者模式：先选择一次 `public/data` 目录，之后即可把当前图谱改动直接写回仓库文件。'
            : '只读模式：当前内容直接来自仓库里的静态 graph / note 文件。'}
        </p>
        {directoryError ? <p className="toolbar-feedback">{directoryError}</p> : null}
        {importError ? <p className="toolbar-feedback">{importError}</p> : null}
      </section>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <div className="graph-management__heading">
            <h2 className="section-title">Markdown 管理</h2>
            <span className="section-badge">{markdownItems.length}</span>
          </div>
          {!isReadOnly ? (
            <div className="graph-management__header-actions">
              <button
                aria-label="新建 Markdown"
                className="icon-action-button"
                onClick={onCreateMarkdown}
                title="新建 Markdown"
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
                aria-label="重命名当前 Markdown"
                className="icon-action-button"
                disabled={!canRenameActiveMarkdown}
                onClick={() => {
                  if (activeMarkdownItem) {
                    startMarkdownRename(activeMarkdownItem.id, activeMarkdownItem.title);
                  }
                }}
                title="重命名当前 Markdown"
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
                aria-label="删除当前 Markdown"
                className="icon-action-button icon-action-button--danger"
                disabled={!canDeleteActiveMarkdown}
                onClick={onDeleteActiveMarkdown}
                title="删除当前 Markdown"
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
          ) : null}
        </div>
        <div className="toolbar-list-shell" data-testid="markdown-list">
          <ul aria-label="Markdown 列表" className="graph-list" role="listbox">
            {markdownItems.map((markdownItem) => (
              <li
                aria-selected={markdownItem.isActive}
                className="graph-list__item"
                data-active={markdownItem.isActive}
                data-linked={markdownItem.isLinkedToSelectedNode}
                key={markdownItem.id}
                onClick={() => onSelectMarkdown(markdownItem.id)}
                onDoubleClick={() =>
                  startMarkdownRename(markdownItem.id, markdownItem.title)
                }
                onKeyDown={(event) =>
                  handleListItemKeyDown(event, () => onSelectMarkdown(markdownItem.id))
                }
                role="option"
                tabIndex={0}
              >
                <span className="graph-list__body">
                  {editingMarkdownId === markdownItem.id ? (
                    <input
                      autoFocus
                      aria-label="重命名 Markdown"
                      className="graph-list__rename-input"
                      onBlur={() => {
                        onCommitMarkdownRename(markdownItem.id, markdownRenameDraft);
                      }}
                      onChange={(event) => setMarkdownRenameDraft(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          onCommitMarkdownRename(markdownItem.id, markdownRenameDraft);
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          onStartMarkdownRename(null);
                          setMarkdownRenameDraft('');
                        }
                      }}
                      type="text"
                      value={markdownRenameDraft}
                    />
                  ) : (
                    <span className="graph-list__title">{markdownItem.title}</span>
                  )}
                  <span className="graph-list__meta">
                    {markdownItem.isLinkedToSelectedNode ? '已关联 · ' : ''}
                    {markdownItem.usageCount} 个节点
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="toolbar-section">
        <div className="section-heading-row">
          <div className="graph-management__heading">
            <h2 className="section-title">Graph 管理</h2>
            <span className="section-badge">{graphItems.length}</span>
          </div>
          {!isReadOnly ? (
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
                onClick={() => {
                  if (currentGraphItem) {
                    startGraphRename(currentGraphItem.id, currentGraphItem.title);
                  }
                }}
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
          ) : null}
        </div>
        <div className="toolbar-list-shell" data-testid="graph-list">
          <ul aria-label="Graph 列表" className="graph-list" role="listbox">
            {graphItems.map((graphItem) => (
              <li
                aria-selected={graphItem.isCurrent}
                className="graph-list__item"
                data-active={graphItem.isCurrent}
                key={graphItem.id}
                onClick={() => onSelectGraph(graphItem.id)}
                onDoubleClick={() => startGraphRename(graphItem.id, graphItem.title)}
                onKeyDown={(event) =>
                  handleListItemKeyDown(event, () => onSelectGraph(graphItem.id))
                }
                role="option"
                tabIndex={0}
              >
                <span className="graph-list__body">
                  {editingGraphId === graphItem.id ? (
                    <input
                      autoFocus
                      aria-label="重命名 Graph"
                      className="graph-list__rename-input"
                      onBlur={() => {
                        onCommitGraphRename(graphItem.id, graphRenameDraft);
                      }}
                      onChange={(event) => setGraphRenameDraft(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          onCommitGraphRename(graphItem.id, graphRenameDraft);
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          onStartGraphRename(null);
                          setGraphRenameDraft('');
                        }
                      }}
                      type="text"
                      value={graphRenameDraft}
                    />
                  ) : (
                    <span className="graph-list__title">{graphItem.title}</span>
                  )}
                  <span className="graph-list__meta">
                    {graphItem.incomingReferenceCount} 个引用
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
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
