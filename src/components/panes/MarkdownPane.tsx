import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { KnowledgeNode, NoteRecord } from '../../types/graph';

type MarkdownPaneProps = {
  selectedNode: KnowledgeNode | null;
  selectedNote: NoteRecord | null;
  hasMultipleSelection?: boolean;
  isMobile?: boolean;
};

export function MarkdownPane({
  selectedNode,
  selectedNote,
  hasMultipleSelection = false,
  isMobile = false,
}: MarkdownPaneProps) {
  const markdownTitle =
    selectedNote?.title ?? selectedNode?.data.title ?? '未选择 Markdown';
  const markdownId = selectedNote?.id ?? selectedNode?.data.noteId ?? '未关联 Markdown';

  return (
    <div className="markdown-shell" data-mobile={isMobile}>
      <div className="markdown-shell__titlebar" data-mobile={isMobile}>
        <strong>{markdownTitle}</strong>
        <span>{markdownId}</span>
      </div>
      <div className="markdown-shell__body">
        {!selectedNote && !selectedNode ? (
          <div className="markdown-empty-state">
            <p>{hasMultipleSelection ? '当前选择了多个节点。' : '请选择一个节点或 Markdown。'}</p>
            <p>
              {hasMultipleSelection
                ? '右侧只会展示单个节点对应的 Markdown 内容。'
                : '右侧会显示被选中的 Markdown 详情与公式内容。'}
            </p>
          </div>
        ) : !selectedNote && selectedNode && !selectedNode.data.noteId ? (
          <div className="markdown-empty-state">
            <p>当前节点还没有关联 markdown。</p>
            <p>你可以在左侧工具栏里为它选择或创建一个 Markdown。</p>
          </div>
        ) : !selectedNote ? (
          <div className="markdown-empty-state">
            <p>找不到对应的 markdown 内容。</p>
            <p>当前节点已选中，但关联的 `noteId` 没有映射到实际数据。</p>
          </div>
        ) : (
          <article className="markdown-prose" data-testid="markdown-prose">
            <ReactMarkdown
              rehypePlugins={[rehypeKatex]}
              remarkPlugins={[remarkGfm, remarkMath]}
            >
              {selectedNote.content}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
