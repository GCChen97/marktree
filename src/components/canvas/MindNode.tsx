import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KnowledgeNode } from '../../types/graph';

export function MindNode({ id, data }: NodeProps<KnowledgeNode>) {
  const [draftTitle, setDraftTitle] = useState(data.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasLinkedMarkdown = Boolean(data.noteId);
  const targetGraphId = data.jumpLink?.targetGraphId ?? null;
  const isJumpNode = data.kind === 'jump';
  const connectionOrientation = data.connectionOrientation ?? 'horizontal';
  const targetHandlePosition =
    connectionOrientation === 'vertical' ? Position.Top : Position.Left;
  const sourceHandlePosition =
    connectionOrientation === 'vertical' ? Position.Bottom : Position.Right;

  useEffect(() => {
    setDraftTitle(data.title);
  }, [data.title]);

  useLayoutEffect(() => {
    if (!data.isEditingTitle) {
      return;
    }

    const focusInput = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    focusInput();
    const frameId = requestAnimationFrame(focusInput);

    return () => cancelAnimationFrame(frameId);
  }, [data.isEditingTitle]);

  function commitTitle() {
    data.onCommitTitleEdit?.(id, draftTitle.trim() || data.title);
  }

  return (
    <div className={`mind-node${isJumpNode ? ' mind-node--jump' : ''}`}>
      <Handle
        className="mind-node__handle"
        position={targetHandlePosition}
        type="target"
      />
      <div className="mind-node__header">
        {hasLinkedMarkdown ? (
          <span aria-label="已关联 markdown" className="mind-node__note-indicator" role="img">
            <svg
              aria-hidden="true"
              className="mind-node__note-indicator-icon"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 3.75a2.25 2.25 0 0 0-2.25 2.25v12A2.25 2.25 0 0 0 6 20.25h6.879a2.25 2.25 0 0 0 1.59-.659l4.122-4.122a2.25 2.25 0 0 0 .659-1.59V6A2.25 2.25 0 0 0 17 3.75H6Zm0 1.5h11A.75.75 0 0 1 17.75 6v7h-3.5a2.25 2.25 0 0 0-2.25 2.25v3.5H6a.75.75 0 0 1-.75-.75V6A.75.75 0 0 1 6 5.25Zm7.5 12.44v-2.44c0-.414.336-.75.75-.75h2.44l-3.19 3.19Z"
                fill="currentColor"
              />
            </svg>
          </span>
        ) : null}
        {data.isEditingTitle ? (
          <input
            autoFocus
            aria-label="节点标题编辑"
            className="mind-node__title-input"
            data-node-id={id}
            onBlur={commitTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                commitTitle();
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setDraftTitle(data.title);
                data.onCancelTitleEdit?.();
              }
            }}
            ref={inputRef}
            type="text"
            value={draftTitle}
          />
        ) : (
          <div
            className="mind-node__title"
            onDoubleClick={(event) => {
              event.stopPropagation();
              data.onStartTitleEdit?.(id);
            }}
          >
            {data.title}
          </div>
        )}
      </div>
      {isJumpNode ? (
        <div className="jump-node__target-row">
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
          <div className="jump-node__meta">
            {targetGraphId
              ? data.targetGraphTitle ?? '目标 graph 不存在'
              : '未设置目标 graph'}
          </div>
        </div>
      ) : null}
      <Handle
        className="mind-node__handle"
        position={sourceHandlePosition}
        type="source"
      />
    </div>
  );
}
