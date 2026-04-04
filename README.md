# MarkGraph

一个基于 `Vite + React + TypeScript + React Flow` 的知识图谱工作区。

当前这版已经支持：

- 三栏桌面布局，支持宽度拖拽和 `ABC / ACB / CBA / BCA` 四种固定布局
- `900px` 以下自动切换为移动端单栏分页布局
- 多 graph 工作区：切换、新建、重命名、删除 graph
- 中间 `React Flow` 画布：节点拖拽、连线创建、框选、多选删除、缩放、平移、居中
- 画布快捷键：
  - `a` 新建孤立节点
  - `Enter` 新建同级节点
  - `Shift+Enter` 新建子节点
  - `x` / `Delete` 删除当前选中节点
- 双击节点可直接编辑节点名称
- 跳转节点：可配置目标 graph，并从节点内按钮进入目标 graph
- 右侧只读 Markdown 面板，支持 GFM 与 LaTeX
- Markdown 管理与节点关联：网页可管理 markdown 元数据，正文继续由外部编辑器维护
- 画布右上角视图工具条：`Fit View`、`Zoom In`、`Zoom Out`、`Center Selected`
- 图谱操作区支持 graph 级连接设置：
  - `左右连接 / 上下连接`
  - `曲线边 / 折线边`
- 仓库数据直接来自 `public/data`
  - `manifest.json`
  - `graphs/*.json`
  - `notes/*.md`
- 本地开发时可选择 `public/data` 目录，把 graph 改动直接写回仓库文件
- GitHub Pages 部署模式下自动切换为只读浏览

## 数据目录

业务数据固定放在：

```text
public/data/
  manifest.json
  graphs/
  notes/
```

其中：

- `graphs/*.json` 保存 graph 结构
- `notes/*.md` 保存 markdown 正文
- `manifest.json` 保存 graph / note 的索引、顺序和文件映射

## 在本地查看网页

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后，在浏览器打开终端输出的本地地址，通常类似：

```text
http://localhost:5173/
```

## 本地作者模式

如果你希望网页里的 graph 改动直接写回仓库文件：

1. 用 `npm run dev` 启动项目
2. 打开网页
3. 在左侧 `文件` 区点击 `选择目录`
4. 选择仓库里的 `public/data` 目录

之后 graph 相关修改会自动写回：

- `public/data/manifest.json`
- `public/data/graphs/*.json`

Markdown 正文 `.md` 文件不在网页里编辑，继续用你自己的编辑器维护；改完后刷新页面即可看到最新内容。

## 预览打包后的页面

```bash
npm run build
npm run preview
```

`preview` 启动后也会输出一个本地地址。这个模式更接近 GitHub Pages，页面会直接读取构建产物里的 `data/*` 静态文件。

## 常用命令

```bash
npm test
```

运行当前测试。
