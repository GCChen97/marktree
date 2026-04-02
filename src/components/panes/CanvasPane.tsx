import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import type { OnEdgesChange, OnNodesChange } from '@xyflow/react';
import type { KnowledgeEdge, KnowledgeNode } from '../../types/graph';

type CanvasPaneProps = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: KnowledgeNode[]) => void;
  onEdgesChange: (edges: KnowledgeEdge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
};

export function CanvasPane({
  nodes,
  edges,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
}: CanvasPaneProps) {
  const displayNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      label: node.data.title,
    },
    selected: node.id === selectedNodeId,
  }));

  const handleNodesChange: OnNodesChange<KnowledgeNode> = (changes) => {
    onNodesChange(applyNodeChanges(changes, nodes));
  };

  const handleEdgesChange: OnEdgesChange<KnowledgeEdge> = (changes) => {
    onEdgesChange(applyEdgeChanges(changes, edges));
  };

  return (
    <div className="pane-content pane-content--canvas">
      <header className="pane-header pane-header--compact">
        <p className="pane-eyebrow">Pane B</p>
        <h2 className="pane-title">思维导图画布</h2>
        <p className="pane-description">
          React Flow 已接入，当前聚焦基础交互：拖拽、缩放、平移和节点选中联动。
        </p>
      </header>

      <div className="canvas-surface" data-testid="graph-canvas-surface">
        <ReactFlow<KnowledgeNode, KnowledgeEdge>
          className="graph-canvas"
          data-testid="react-flow-canvas"
          edges={edges}
          fitView
          nodes={displayNodes}
          onEdgesChange={handleEdgesChange}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onNodesChange={handleNodesChange}
          onPaneClick={() => onSelectNode(null)}
          proOptions={{ hideAttribution: true }}
        />
      </div>
    </div>
  );
}
