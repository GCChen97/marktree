# MyMind

本项目当前已完成 Phase 1 到 Phase 3，使用 `Vite + React + TypeScript` 搭建。

当前已具备：

- 三栏桌面布局，支持宽度拖拽和 `ABC / ACB / CBA / BCA` 四种固定布局
- 中间 `React Flow` 画布，支持节点拖拽、缩放、平移和选中
- 右侧只读 Markdown 面板，支持 GFM 与 LaTeX
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
