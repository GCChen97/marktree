import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { KnowledgeNode, NoteRecord } from '../../types/graph';

type MarkdownPaneProps = {
  selectedNode: KnowledgeNode | null;
  selectedNote: NoteRecord | null;
};

export function MarkdownPane({
  selectedNode,
  selectedNote,
}: MarkdownPaneProps) {
  return (
    <div className="pane-content pane-content--markdown">
      <header className="pane-header pane-header--compact">
        <p className="pane-eyebrow">Pane C</p>
        <h2 className="pane-title">Markdown 详情</h2>
        <p className="pane-description">
          右侧面板现在负责只读渲染选中节点的 Markdown 内容，支持 GFM 与
          LaTeX。
        </p>
      </header>

      <div className="markdown-shell">
        <div className="markdown-shell__titlebar">
          <strong>{selectedNode?.data.title ?? '未选择节点'}</strong>
          <span>{selectedNode?.data.noteId ?? 'Phase 3 接入 Markdown'}</span>
        </div>
        <div className="markdown-shell__body">
          {!selectedNode ? (
            <div className="markdown-empty-state">
              <p>请选择一个节点。</p>
              <p>右侧会显示该节点对应的 Markdown 详情与公式内容。</p>
            </div>
          ) : !selectedNote ? (
            <div className="markdown-empty-state">
              <p>找不到对应的 note 内容。</p>
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
