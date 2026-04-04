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
  return (
    <div
      className="pane-content pane-content--markdown"
      data-mobile={isMobile}
    >
      <header
        className={`pane-header pane-header--compact${isMobile ? ' pane-header--mobile' : ''}`}
      >
        <p className="pane-eyebrow">Pane C</p>
        <h2 className="pane-title">Markdown 详情</h2>
        <p className="pane-description">
          右侧面板现在负责只读渲染选中节点的 Markdown 内容，支持 GFM 与
          LaTeX。
        </p>
      </header>

        <div className="markdown-shell" data-mobile={isMobile}>
          <div className="markdown-shell__titlebar" data-mobile={isMobile}>
            <strong>{selectedNode?.data.title ?? '未选择节点'}</strong>
            <span>{selectedNode?.data.noteId ?? '未关联 Markdown'}</span>
          </div>
          <div className="markdown-shell__body">
          {!selectedNode ? (
            <div className="markdown-empty-state">
              <p>{hasMultipleSelection ? '当前选择了多个节点。' : '请选择一个节点。'}</p>
              <p>
                {hasMultipleSelection
                  ? '右侧只会展示单个节点对应的 Markdown 内容。'
                  : '右侧会显示该节点对应的 Markdown 详情与公式内容。'}
              </p>
            </div>
          ) : !selectedNode.data.noteId ? (
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
    </div>
  );
}
