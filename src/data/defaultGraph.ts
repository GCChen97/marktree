import type { GraphState } from '../types/graph';

export function createDefaultGraphState(): GraphState {
  return {
    nodes: [
      {
        id: 'node_graph',
        position: { x: 80, y: 160 },
        data: {
          title: 'Knowledge Graph',
          noteId: 'note_graph',
        },
      },
      {
        id: 'node_flow',
        position: { x: 360, y: 120 },
        data: {
          title: 'React Flow',
          noteId: 'note_flow',
        },
      },
      {
        id: 'node_markdown',
        position: { x: 660, y: 200 },
        data: {
          title: 'Markdown Pane',
          noteId: 'note_markdown',
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
    notes: {
      note_graph: {
        id: 'note_graph',
        title: 'Knowledge Graph',
        content: '# Knowledge Graph\n\nPhase 3 会在这里接入 Markdown 内容。',
      },
      note_flow: {
        id: 'note_flow',
        title: 'React Flow',
        content: '# React Flow\n\nPhase 2 先验证画布交互与节点选中。',
      },
      note_markdown: {
        id: 'note_markdown',
        title: 'Markdown Pane',
        content: '# Markdown Pane\n\nPhase 3 会接入 Markdown 渲染。',
      },
    },
    selectedNodeId: null,
  };
}
