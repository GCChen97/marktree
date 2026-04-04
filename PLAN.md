可以。下面我给你一个**面向实现的项目框架计划**，目标就是：

**做一个可部署到 GitHub Pages 的纯前端静态网站**，整体三栏布局，可拖拽调整宽度：

* **左栏**：节点/边/视图/导入导出等控制面板
* **中栏**：React Flow 画布
* **右栏**：Markdown 详情页，支持 LaTeX

我会尽量按“你真的要开工时怎么搭”来设计，而不是空泛说架构。

---

# 当前开发状态（2026-04-04）

目前 **Phase 1 到 Phase 8 的主体能力已落地**，仓库已经从最早的单 graph 骨架演进成一个可运行的多 graph 工作区，具备 repo 文件直读、本地 graph 直写、真实画布编辑、跳转节点、只读 Markdown 查看，以及基础移动端适配，具体包括：

* `Vite + React + TypeScript` 工程初始化完成
* 三栏桌面布局已实现，左右分隔条可拖拽调整宽度
* 已支持 4 种固定布局模式：
  * `ABC`：工具栏 | 画布 | Markdown
  * `ACB`：工具栏 | Markdown | 画布
  * `CBA`：Markdown | 画布 | 工具栏
  * `BCA`：画布 | Markdown | 工具栏
* 工具栏 `A` 始终固定在最左或最右，`B` 与 `C` 可以互换左右
* 当前布局模式和三栏宽度已写入 `localStorage`
* 已有 `ToolbarPane / CanvasPane / MarkdownPane` 三个独立 pane 组件
* 已接入 `@xyflow/react`，中栏可显示真实节点画布
* 已内置一组 demo 图谱数据：3 个节点、2 条边
* 已支持节点拖拽、缩放、平移、点击选中、框选、多选与批量删除
* 已支持通过拖拽 handle 创建新连线
* 已支持画布快捷键：
  * `a` 新建孤立节点
  * `Enter` 新建同级节点
  * `Shift+Enter` 新建子节点
  * `x / Delete` 删除当前选中节点
* 所有“新建节点”入口都可直接进入节点名称编辑
* 节点选中后，左侧信息区和右侧标题区会同步联动；同时也支持通过工具栏 Markdown 列表项直接切换右侧内容
* 已接入 `react-markdown + remark-gfm + remark-math + rehype-katex + katex`
* 右侧已支持只读 Markdown 渲染，包含 GFM 表格、任务列表、代码块和 LaTeX 公式；Markdown 列表项点击即可切换右侧内容
* 左侧已支持 `新建节点 / 删除节点 / 跳转节点开关 / 目标 graph 选择`
* 画布右上角已提供紧凑视图工具条：`Fit View / Zoom In / Zoom Out / Center Selected`
* 左侧已支持 `导出当前 Graph / 导出整个 Workspace / 导入 JSON`
* 已支持导入图谱结构校验与错误提示
* 已支持多 graph 工作区，Graph 管理区可切换、新建、重命名、删除 graph
* 已支持 Markdown 管理区：可切换、新建、重命名、删除 markdown 元数据
* Graph 管理区已调整为紧凑列表，标题右侧为单行图标操作按钮
* Graph 管理区已移动到工具栏下部，位于信息区上方
* 工具栏顶部已收口为标题区 + 紧凑主题 switch
* 布局模式区已压缩为“布局切换 + 4 个按钮”
* 已支持跳转节点：普通节点可转换为跳转节点，并配置目标 graph
* 已支持从节点上的 `进入` 按钮切换到目标 graph
* 已支持 graph 级画布连线设置：
  * `左右连接 / 上下连接`
  * `曲线边 / 折线边`
* 业务数据已切换为 repo 文件模式：
  * `public/data/manifest.json`
  * `public/data/graphs/*.json`
  * `public/data/notes/*.md`
* 本地开发模式下可选择 `public/data` 目录，把 graph 改动直接写回仓库文件
* GitHub Pages / preview 模式下会直接读取 repo 静态数据文件，并以只读方式展示
* `900px` 以下已切换为移动端单栏分页布局，底部可切换 `工具栏 / 画布 / Markdown`
* 移动端保留现有核心功能，信息区会折叠，布局切换保持紧凑常显
* 已补充本地运行说明 `README.md`
* 已通过基础自动化测试和构建验证

当前**还没有接入**：

* note 正文在线编辑
* 连线规则约束（如禁止重复边、自连限制、edge 元数据编辑）
* 视图状态持久化（如缩放级别、平移位置）
* 自动布局

因此，下面的内容更多是**架构说明与后续扩展参考**。其中早期 Phase 规划对应的主要能力已经进入“已完成”状态，但文档里仍保留这些设计脉络，方便继续迭代。

---

# 1. 项目目标

这是一个**可部署到 GitHub Pages 的前端知识图谱工作区**，核心是：

* 用 **React + React Flow** 做知识节点画布
* 用 **Markdown 面板** 展示节点详细内容
* 无独立后端服务
* 业务数据直接来自仓库里的 `public/data`
* 本地开发时可通过浏览器目录授权把 graph 改动直接写回仓库文件
* 可以直接部署到 **GitHub Pages**

---

# 2. 第一版建议功能范围

我建议第一版只做最小可用版本，不要一开始做重。

## 核心功能

1. 三栏布局，左右栏可拖动调整宽度
2. 中间是 React Flow 画布
3. 点击节点后，右侧显示该节点对应 Markdown
4. 左侧提供基础操作：

   * 新建节点
   * 删除节点
   * 编辑选中节点标题
   * 创建连线
   * 自动布局预留入口
   * 导入/导出 JSON
5. graph 数据保存到仓库里的 `public/data/graphs/*.json`
6. markdown 正文直接来自 `public/data/notes/*.md`
7. Markdown 支持：

   * 标题、列表、代码块
   * LaTeX 公式
   * GitHub 风格表格/任务列表

## 当前仍不做

* 用户系统
* 云同步
* 多人协作
* 权限控制
* markdown 正文在线编辑器
* 搜索全文索引
* 大规模图谱性能优化

---

# 3. 整体页面结构

建议页面采用经典三栏：

```text
┌───────────────┬──────────────────────────────┬──────────────────────┐
│ 左侧控制栏     │ 中间节点画布                 │ 右侧 Markdown 详情栏  │
│               │                              │                      │
│ - 布局切换     │  React Flow Canvas           │ - 标题               │
│ - 图谱操作     │  - 右上角视图工具条          │ - Markdown内容       │
│ - 数据操作     │  - 节点/跳转节点/连线        │ - 公式渲染           │
│ - Graph 管理   │                              │                      │
│ - 信息区       │                              │ - 只读查看            │
└───────────────┴──────────────────────────────┴──────────────────────┘
```

并且：

* 左右栏宽度可拖动调整
* 中间栏自动占剩余空间
* 当前实现支持 4 种固定布局模式：`ABC / ACB / CBA / BCA`
* 当前已支持 `900px` 以下切换为移动端单栏分页布局

---

# 4. 技术栈建议

我建议你用下面这套，够现代，也不会太重。

## 基础框架

* **React**
* **Vite**
* **TypeScript**
* **React Flow**

## 布局/状态

* React 自带 state 先够用
* 后续如状态复杂可加 `zustand`

## Markdown 渲染

* `react-markdown`
* `remark-gfm`
* `remark-math`
* `rehype-katex`
* `katex`

## 三栏拖拽布局

两种选法：

### 方案 A：自己写 split pane

优点：

* 依赖少
* 可控
* 不复杂

### 方案 B：用现成库

比如 `react-resizable-panels`

我建议你**优先用现成库**，因为三栏可拖动本身不是你的核心创新点，没必要自己折腾。

---

# 5. 推荐模块划分

建议从一开始就把代码按“页面 / 组件 / 数据 / 工具”分开，不然后面会乱。

## 建议目录结构

```text
src/
  main.tsx
  App.tsx

  components/
    layout/
      ThreePaneLayout.tsx
      ResizeHandle.tsx
    sidebar/
      LeftPanel.tsx
      ToolbarSection.tsx
    canvas/
      FlowCanvas.tsx
      CustomNode.tsx
    markdown/
      MarkdownPane.tsx
      MarkdownViewer.tsx
    common/
      IconButton.tsx
      SectionCard.tsx
      EmptyState.tsx

  features/
    graph/
      graphTypes.ts
      graphStore.ts
      graphActions.ts
      graphPersistence.ts
      defaultGraph.ts
    notes/
      noteTypes.ts
      noteHelpers.ts

  hooks/
    useLocalStorage.ts
    useSelectedNode.ts
    useDebouncedSave.ts

  utils/
    exportImport.ts
    id.ts
    layout.ts
    constants.ts

  styles/
    global.css
    markdown.css
    layout.css
```

---

# 6. 数据模型设计

这是这个项目最关键的部分之一。
我建议你一开始就把**图结构数据**和**Markdown 内容**分清楚。

## 节点数据

```ts
export type KnowledgeNodeData = {
  title: string
  noteId: string
  summary?: string
  tags?: string[]
}
```

## 节点

```ts
export type KnowledgeNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: KnowledgeNodeData
}
```

## 边

```ts
export type KnowledgeEdge = {
  id: string
  source: string
  target: string
  label?: string
}
```

## 笔记

```ts
export type NoteRecord = {
  id: string
  title: string
  content: string   // markdown 原文
  updatedAt: number
}
```

## 整体存储结构

```ts
export type AppData = {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  notes: Record<string, NoteRecord>
  ui: {
    selectedNodeId: string | null
  }
}
```

---

# 7. 为什么不要把 Markdown 直接全塞进 node.data

虽然可以，但我不建议长期这样做。

## 不推荐

```ts
data: {
  title: 'RoPE',
  content: '一大段 markdown...'
}
```

问题：

* 节点对象会变很重
* 画布更新时容易连带大段文本一起走
* 后续导入导出、编辑、迁移都不够清晰

## 推荐

节点里只放：

```ts
data: {
  title: 'RoPE',
  noteId: 'note_rope'
}
```

Markdown 正文单独存在 `notes[noteId]` 里。

这样结构更干净。

---

# 8. 三栏布局设计建议

建议把 `App` 分成三层：

## App

负责全局状态和数据初始化

## ThreePaneLayout

负责页面布局，不关心业务

补充说明：当前实现的 `ThreePaneLayout` 已支持按布局模式切换 pane 顺序，并持久化每个 pane 自己的宽度。

## 三个具体 pane

* `ToolbarPane`
* `CanvasPane`
* `MarkdownPane`

### 伪结构

```tsx
<App>
  <ThreePaneLayout
    left={<ToolbarPane />}
    center={<CanvasPane />}
    right={<MarkdownPane />}
  />
</App>
```

这样后面想改布局也很容易。

当前实现不是固定 `left / center / right` 三个槽位写死，而是用 `A / B / C` 三个 pane 身份配合布局模式渲染顺序，这样更适合支持 `ABC / ACB / CBA / BCA` 四种布局。

---

# 9. 左侧栏应包含哪些功能

我建议当前左栏按 5 个区块理解更贴近现状。

## 9.1 Graph 管理

* graph 列表
* 切换当前 graph
* 新建 graph
* 重命名当前 graph
* 删除当前 graph
* 查看每个 graph 的被引用次数

当前实现状态：

* 已支持多 graph 工作区
* 已支持紧凑 graph 列表
* 已支持标题右侧图标按钮形式的 `新增 / 重命名 / 删除`
* 当前位于工具栏下部，信息区上方

## 9.2 图谱操作

* 编辑选中节点标题
* 新建节点
* 删除节点
* 设为跳转节点
* 取消跳转节点
* 自动布局（后续）

当前实现状态：

* 选中节点后，左栏会出现“节点标题”输入框
* 标题修改会同步更新画布节点标题、信息区、右栏标题和跳转配置区

## 9.3 视图操作

* Fit View
* Zoom In
* Zoom Out
* Center Selected

补充说明：当前这组操作已经从左侧栏移到中间画布右上角，以紧凑图标工具条呈现。

## 9.4 数据操作

* 导出当前 Graph
* 导出整个 Workspace
* 导入 JSON

## 9.5 信息区

* 当前 graph 标题
* 当前节点数
* 当前边数
* 当前选中节点标题

补充说明：当前若选中的是跳转节点，左栏还会出现一个“跳转配置”区块，用于选择目标 graph。

---

# 10. 中间 React Flow 画布设计

中间栏是核心区。

## React Flow 负责

* 节点显示
* 连线
* 拖拽
* 缩放
* 选中
* 背景网格
* MiniMap（第一版可选）
* Controls（可选）

当前实现状态：

* 已接入 React Flow 画布
* 已支持普通节点与跳转节点两类节点
* 已有默认 workspace 与 demo graph 数据
* 已支持拖拽、缩放、平移、点击选中
* 已支持从节点 handle 拖拽创建新连线
* 画布右上角已提供自定义视图图标工具条
* 当前还没有启用 React Flow 内建 `Controls / Background / MiniMap`

## 点击节点行为

* 更新 `selectedNodeId`
* 右侧 MarkdownPane 读取对应 `noteId`
* 展示该笔记内容

当前实现状态：

* 已更新 `selectedNodeId`
* 已联动右栏标题和 `noteId`
* 已联动 Markdown 正文渲染
* 若节点是跳转节点，节点上会显示 `进入` 按钮
* 点击 `进入` 后会切换到目标 graph

## 新建节点行为

建议左栏点“新建节点”后：

* 在视图中心附近生成新节点
* 自动创建对应空白 note
* 自动选中该节点
* 右侧立即展示空白 markdown

这个交互会很顺。

---

# 11. 右侧 Markdown 栏设计

第一版右栏建议做成：

## 顶部

* 节点标题
* noteId 或 tag
* 编辑/只读切换按钮（可选）

当前实现状态：

* 已显示选中节点标题
* 已显示对应 `noteId`
* 已显示对应 note 的 Markdown 正文
* 已支持 GFM 与 LaTeX 只读渲染

## 主体

Markdown 渲染区

## 空状态

没选中节点时显示：

* “请选择一个节点”
* 或提示点击左边新建节点

## Markdown 功能

支持：

* 标题
* 粗体/斜体
* 列表
* 代码块
* 表格
* 任务列表
* 行内公式 `$...$`
* 块公式 `$$...$$`

---

# 12. Markdown 编辑策略

这里建议你分阶段做。

## 第一阶段：先只做查看

左侧或弹窗里编辑节点 title 和 markdown 原文，不在右边直接改。

优点：

* 简单
* 先把主流程跑通

## 第二阶段：右栏支持编辑

可以做一个切换：

* View 模式：渲染后的 Markdown
* Edit 模式：textarea 编辑原始 markdown

这已经很够用了。

## 第三阶段：分屏编辑

上面 textarea，下面预览
但这不是第一版重点。

---

# 13. 状态管理建议

第一版不用上来就 Redux。

## 推荐最初方案

`App.tsx` 中持有全局状态：

```ts
const [nodes, setNodes] = useState(...)
const [edges, setEdges] = useState(...)
const [notes, setNotes] = useState(...)
const [selectedNodeId, setSelectedNodeId] = useState(...)
```

然后通过 props 传下去。

## 什么时候升级到 Zustand

如果你出现这些情况再升级：

* props 层层传递太深
* 左中右都频繁读写共享状态
* 功能逐渐增多

我估计你这个项目很快会适合 `zustand`，但**第一版不一定必须上**。

---

# 14. 本地持久化方案

因为没有后端，第一版最合理的就是 `localStorage`。

## 建议策略

* 页面加载时：从 `localStorage` 读取
* 有改动时：延迟 300~800ms 自动保存
* 提供“导出 JSON”作为手动备份

## 建议保存内容

整个 `AppData` 一次性存：

```ts
localStorage.setItem('knowledge-map-data', JSON.stringify(appData))
```

## 注意

要做一个简单的版本号：

```ts
{
  version: 1,
  nodes: ...,
  edges: ...,
  notes: ...
}
```

以后改数据结构时方便迁移。

---

# 15. JSON 导入导出设计

这是你以后从 `github.io` 迁移出去时的关键。

## 导出

导出整个应用数据：

```json
{
  "version": 1,
  "nodes": [...],
  "edges": [...],
  "notes": {...}
}
```

## 导入

支持：

* 文件选择导入 `.json`
* 解析失败时给出报错
* 导入前可选择覆盖当前数据

## 价值

这样以后：

* 换电脑可恢复
* 能手动备份
* 以后迁到私有服务器很容易

---

# 16. UI 交互建议

## 节点点击

* 单击节点：右栏显示 markdown
* 双击节点：以后可扩展成聚焦模式或全屏阅读

## 删除节点

删除节点时同步：

* 删除关联边
* 是否删除对应 note
  建议第一版直接一起删，避免产生孤儿 note

## 新建节点

默认生成：

* 标题：`Untitled`
* note 内容：

```md
# Untitled

在这里写内容。
```

---

# 17. 自定义节点建议

第一版其实可以先用 React Flow 默认节点。
但我建议你**尽早定义一个自己的 CustomNode**，哪怕样式很简单。

因为你后面很可能想在节点里显示：

* 标题
* 摘要
* 标签
* 节点类型颜色

例如：

```text
┌────────────────────┐
│ RoPE               │
│ rotary position... │
│ [Transformer]      │
└────────────────────┘
```

这比默认小白框更适合知识图谱。

---

# 18. 样式建议

建议整体风格走：

* 深浅中性色
* 边框简洁
* 卡片式面板
* 画布占视觉中心
* Markdown 区域留足内边距

## 三栏宽度初始值建议

* 左栏：280px
* 中栏：自适应
* 右栏：420px

这样右边看 Markdown 会比较舒服。

---

# 19. GitHub Pages 部署考虑

既然要部署到 GitHub Pages，一开始就按这个方式设计。

## 关键点

如果仓库地址是：

`https://用户名.github.io/仓库名/`

那 Vite 要配：

```ts
base: '/仓库名/'
```

## 建议

在项目里单独放一个：

* `vite.config.ts`
* GitHub Actions 自动部署 workflow

这样后面一 push 就能更新页面。

---

# 20. 建议开发阶段划分

我建议你按下面顺序开发，不容易卡住。

## Phase 1：骨架（已完成）

* 已完成 `Vite + React + TS` 初始化
* 已完成三栏布局
* 已完成左中右区域占位
* 已支持 `ABC / ACB / CBA / BCA` 四种固定布局
* 已实现三栏宽度拖拽与 `localStorage` 持久化
* 已补齐基础测试与构建验证

## Phase 2：画布（已完成）

* 已完成 React Flow 接入
* 已完成节点/边初始数据
* 已完成节点点击选中
* 已完成左侧信息区与右侧标题区联动
* 已完成节点 handle 拖拽创建连线

## Phase 3：Markdown

* 已完成右栏根据选中节点显示 markdown
* 已完成 `react-markdown + katex`
* 已完成 GFM 与 LaTeX 只读渲染

## Phase 4：左栏功能（已完成）

* 已完成新建节点
* 已完成删除节点
* 已完成节点标题编辑
* 已完成导出/导入 JSON
* 已完成重置默认图谱
* 视图操作已收口到画布右上角图标工具条

## Phase 5：持久化（基础能力已完成）

* 已完成图谱 `localStorage` 自动保存
* 已完成页面刷新恢复
* 后续可继续补视图状态持久化

## 移动端适配（已完成）

* 已完成 `900px` 以下移动端单栏分页切换
* 已完成底部导航切换 `工具栏 / 画布 / 详情`
* 已完成移动端工具栏压缩与信息区折叠
* 已完成移动端 Markdown 与画布的基础可用性适配

## Phase 6：多 Graph 工作区（已完成基础能力）

* 已完成 workspace 状态模型
* 已完成 graph 列表切换、新建、重命名、删除
* 已完成跳转节点与 graph 引用索引
* 已完成当前 graph / 整个 workspace 导入导出
* 已完成 Graph 管理区紧凑化 UI
* 已完成工具栏顶部主题入口收紧与布局切换区压缩

## 后续打磨

* 自定义节点样式
* 空状态
* 错误处理
* 解决“进入页面后，主动一次性请求 manifest 里列出的所有图和笔记文件”的问题, 应该是请求时再一个个下载
* GitHub Pages 部署

---

# 21. 最小可用版本的里程碑

你可以把 MVP 定义成下面这样：

## MVP 完成标准

* [x] 页面有三栏，可拖动调整宽度
* [x] 支持 `ABC / ACB / CBA / BCA` 四种固定布局
* [x] 中间可显示 React Flow 图
* [x] 左边点按钮可新建节点
* [x] 点击节点后右边显示节点标题与 `noteId`
* [x] Markdown 支持公式
* [x] 数据可自动保存在本地
* [x] 可导出/导入 JSON
* [x] 手机端可切换查看工具栏 / 画布 / 详情
* [x] 支持多 graph 工作区与跳转节点
* [ ] 可部署到 GitHub Pages

做到这里，这个项目其实已经很好用了。

---

# 22. 后续扩展路线

等 MVP 稳了，再考虑这些：

## 第二阶段

* 节点搜索
* 标签过滤
* 右栏编辑模式
* 自动布局（dagre / elkjs）
* 节点颜色分类

## 第三阶段

* 独立 Markdown 路由页面
* URL 定位到某节点
* 知识图谱主题切换
* 画布缩略图 / 聚焦模式

## 第四阶段

* 文件化存储 `.json + .md`
* GitHub 仓库内容驱动
* 再考虑私有部署

---

# 23. 我给你的最终建议

如果你要一句最实用的版本，那就是：

**先做一个三栏静态前端：左侧操作面板，中间 React Flow，右侧 Markdown 预览；数据存在 localStorage，并支持 JSON 导入导出。**

这是最适合 GitHub Pages 的路线，而且以后很好迁移。

---

如果你愿意，我下一步可以直接继续给你两样东西里的一个：

1. **更具体的项目目录 + 每个文件该写什么**
2. **直接给你一套可开工的 Vite/React/React Flow 模板代码骨架**
