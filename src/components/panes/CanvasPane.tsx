export function CanvasPane() {
  return (
    <div className="pane-content pane-content--canvas">
      <header className="pane-header pane-header--compact">
        <p className="pane-eyebrow">Pane B</p>
        <h2 className="pane-title">思维导图画布</h2>
        <p className="pane-description">
          这里是 Phase 2 的 React Flow 挂载区域。当前先保留尺寸系统和完整容器，
          让后续接入不会碰布局层。
        </p>
      </header>

      <div className="canvas-placeholder">
        <div className="canvas-placeholder__grid" />
        <div className="canvas-placeholder__card">
          <span className="canvas-placeholder__badge">Phase 2</span>
          <h3>React Flow 接入口</h3>
          <p>
            画布区已经具备独立 pane、最小宽度保护和布局换位能力。下一阶段可直接挂载节点画布。
          </p>
        </div>
      </div>
    </div>
  );
}
