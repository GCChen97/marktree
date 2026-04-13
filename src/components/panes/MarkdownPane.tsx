import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { KnowledgeNode, NoteRecord } from '../../types/graph';

const ABSOLUTE_OR_SPECIAL_IMAGE_SRC_PATTERN =
  /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i;

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, '/');
}

function resolveMarkdownImageSrc(
  src: string | undefined,
  noteFileName: string | null | undefined,
) {
  if (
    !src ||
    !noteFileName ||
    ABSOLUTE_OR_SPECIAL_IMAGE_SRC_PATTERN.test(src) ||
    typeof window === 'undefined'
  ) {
    return src;
  }

  try {
    const noteUrl = new URL(
      `${import.meta.env.BASE_URL}data/notes/${encodePathSegment(noteFileName)}`,
      window.location.origin,
    );
    const imageUrl = new URL(src, noteUrl);

    return `${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`;
  } catch {
    return src;
  }
}

type MarkdownPaneProps = {
  selectedNode: KnowledgeNode | null;
  selectedNote: NoteRecord | null;
  hasMultipleSelection?: boolean;
  isMobile?: boolean;
  selectedNoteFileName?: string | null;
};

export function MarkdownPane({
  selectedNode,
  selectedNote,
  hasMultipleSelection = false,
  isMobile = false,
  selectedNoteFileName = null,
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
              components={{
                img({ node: _node, src, ...props }) {
                  return (
                    <img
                      {...props}
                      src={resolveMarkdownImageSrc(src, selectedNoteFileName)}
                    />
                  );
                },
              }}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
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
