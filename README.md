# MyMind

本项目当前已完成桌面端核心功能与基础移动端适配，使用 `Vite + React + TypeScript` 搭建。

当前已具备：

- 三栏桌面布局，支持宽度拖拽和 `ABC / ACB / CBA / BCA` 四种固定布局
- 中间 `React Flow` 画布，支持节点拖拽、缩放、平移和选中
- 右侧只读 Markdown 面板，支持 GFM 与 LaTeX
- 左侧工具栏支持新建节点、删除选中节点、`Fit View`、`Zoom In`、`Zoom Out`、`Center Selected`
- 支持导入 JSON、导出 JSON、重置默认图谱
- 图谱数据会自动保存到 `localStorage`，刷新后恢复节点、边、note 内容和节点位置
- `900px` 以下自动切换为移动端单栏分页布局，底部可切换工具栏 / 画布 / 详情
- 白天 / 夜晚主题切换

## 在本地查看网页

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后，终端会输出一个本地地址，通常类似：

```text
http://localhost:5173/
```

在浏览器里打开这个地址，就可以查看当前网页。

## 预览打包后的页面

如果你想先构建再本地预览，可以运行：

```bash
npm run build
npm run preview
```

`preview` 启动后也会在终端输出一个本地访问地址。

## 其他常用命令

```bash
npm test
```

用于运行当前测试用例。
