import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { KnowledgeNode } from '../../types/graph';

export function JumpNode({ data }: NodeProps<KnowledgeNode>) {
  const targetGraphId = data.jumpLink?.targetGraphId ?? null;

  return (
    <div className="jump-node">
      <Handle className="jump-node__handle" position={Position.Left} type="target" />
      <div className="jump-node__badge">Jump</div>
      <div className="jump-node__title">{data.title}</div>
      <div className="jump-node__meta">
        {targetGraphId
          ? data.targetGraphTitle ?? '目标 graph 不存在'
          : '未设置目标 graph'}
      </div>
      <button
        aria-label="进入"
        className="jump-node__enter"
        disabled={!data.canEnterLinkedGraph || !targetGraphId}
        onClick={(event) => {
          event.stopPropagation();

          if (targetGraphId) {
            data.onEnterLinkedGraph?.(targetGraphId);
          }
        }}
        type="button"
      >
        进入
      </button>
      <Handle className="jump-node__handle" position={Position.Right} type="source" />
    </div>
  );
}
