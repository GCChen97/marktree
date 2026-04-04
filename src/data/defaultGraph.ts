import type {
  GraphDocument,
  GraphId,
  NoteId,
  NoteRecord,
  WorkspaceState,
} from '../types/graph';

export const DEFAULT_WORKSPACE_GRAPH_ID = 'graph_main';

export function createDefaultGraphDocument(): GraphDocument {
  return {
    id: DEFAULT_WORKSPACE_GRAPH_ID,
    title: 'Main Graph',
    connectionOrientation: 'horizontal',
    edgeStyle: 'curved',
    nodes: [
      {
        id: 'node_graph',
        position: { x: 80, y: 160 },
        data: {
          title: 'Knowledge Graph',
          noteId: 'note_graph',
          kind: 'default',
        },
      },
      {
        id: 'node_flow',
        position: { x: 360, y: 120 },
        data: {
          title: 'React Flow',
          noteId: 'note_flow',
          kind: 'default',
        },
      },
      {
        id: 'node_markdown',
        position: { x: 660, y: 200 },
        data: {
          title: 'Markdown Pane',
          noteId: 'note_markdown',
          kind: 'default',
        },
      },
    ],
    edges: [
      {
        id: 'edge_graph_flow',
        source: 'node_graph',
        target: 'node_flow',
      },
      {
        id: 'edge_flow_markdown',
        source: 'node_flow',
        target: 'node_markdown',
      },
    ],
  };
}

export function createDefaultNotes(): Record<NoteId, NoteRecord> {
  return {
    note_graph: {
      id: 'note_graph',
      title: 'Knowledge Graph',
      content: `# Knowledge Graph

知识图谱适合把概念之间的关系可视化。

## 核心点

- 节点承载概念
- 边表达关系
- 详情面板负责展开上下文

> 右侧面板现在已经可以直接渲染 Markdown。

\`selectedNodeId\` 会驱动左右联动。`,
    },
    note_flow: {
      id: 'note_flow',
      title: 'React Flow',
      content: `# React Flow

React Flow 已经承担了当前画布交互。

## 验证项

- [x] 节点拖拽
- [x] 缩放和平移
- [x] 点击选中

## 示例代码

\`\`\`tsx
<ReactFlow nodes={nodes} edges={edges} fitView />
\`\`\`

内联公式示例：$noteId \\rightarrow content$

块公式示例：

$$
f(x) = x^2 + 2x + 1
$$`,
    },
    note_markdown: {
      id: 'note_markdown',
      title: 'Markdown Pane',
      content: `# Markdown Pane

这一栏现在负责只读渲染选中节点的 note 内容。

## 支持内容

| 能力 | 状态 |
| --- | --- |
| 标题 | 已支持 |
| GFM 表格 | 已支持 |
| 任务列表 | 已支持 |
| LaTeX | 已支持 |

### 下一步

1. 保持查看模式稳定
2. 再考虑编辑模式
3. 最后接入持久化`,
    },
  };
}

export function createDefaultWorkspaceState(): WorkspaceState {
  const defaultGraph = createDefaultGraphDocument();
  const notes = createDefaultNotes();

  return {
    version: 3,
    graphs: {
      [defaultGraph.id]: defaultGraph,
    },
    notes,
    graphOrder: [defaultGraph.id],
    noteOrder: ['note_graph', 'note_flow', 'note_markdown'],
    currentGraphId: defaultGraph.id,
  };
}

export function createMarkdownNote(
  noteId: NoteId,
  title: string,
  content?: string,
): NoteRecord {
  return {
    id: noteId,
    title,
    content:
      content ??
      `# ${title}

在这里写内容。
`,
  };
}

export function createNewGraphDocument(
  graphId: GraphId,
  title: string,
  rootNodeId: string,
): GraphDocument {
  return {
    id: graphId,
    title,
    connectionOrientation: 'horizontal',
    edgeStyle: 'curved',
    nodes: [
      {
        id: rootNodeId,
        position: { x: 220, y: 160 },
        data: {
          title: 'Start',
          noteId: null,
          kind: 'default',
        },
      },
    ],
    edges: [],
  };
}
