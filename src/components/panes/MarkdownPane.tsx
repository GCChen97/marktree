export function MarkdownPane() {
  return (
    <div className="pane-content pane-content--markdown">
      <header className="pane-header pane-header--compact">
        <p className="pane-eyebrow">Pane C</p>
        <h2 className="pane-title">Markdown 详情</h2>
        <p className="pane-description">
          这里先保留详情面板结构。后续会接入节点标题、Markdown 渲染、LaTeX
          和编辑模式切换。
        </p>
      </header>

      <div className="markdown-shell">
        <div className="markdown-shell__titlebar">
          <strong>未选择节点</strong>
          <span>Phase 3 接入 Markdown</span>
        </div>
        <div className="markdown-shell__body">
          <p>右侧区域已经准备好标题区和正文区结构。</p>
          <p>Phase 3 会在这里挂载 Markdown Viewer，并根据选中节点联动展示内容。</p>
        </div>
      </div>
    </div>
  );
}
