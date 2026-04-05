import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { NodeProps } from '@xyflow/react';
import type { KnowledgeNode } from '../../types/graph';
import { MindNode } from './MindNode';

vi.mock('@xyflow/react', () => ({
  Handle: () => <div data-testid="mock-handle" />,
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

function createNodeProps(overrides?: Partial<KnowledgeNode['data']>): NodeProps<KnowledgeNode> {
  return {
    id: 'node_1',
    data: {
      title: 'Test Node',
      noteId: null,
      kind: 'default',
      ...overrides,
    },
    selected: false,
    dragging: false,
    zIndex: 1,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    type: 'mind',
    targetPosition: 'left',
    sourcePosition: 'right',
    draggingHandle: null,
  } as unknown as NodeProps<KnowledgeNode>;
}

describe('MindNode markdown indicator', () => {
  it('shows a note icon when the node has linked markdown', () => {
    render(<MindNode {...createNodeProps({ noteId: 'note_123' })} />);

    expect(screen.getByLabelText('已关联 markdown')).toBeInTheDocument();
  });

  it('does not show a note icon when the node has no linked markdown', () => {
    render(<MindNode {...createNodeProps({ noteId: null })} />);

    expect(screen.queryByLabelText('已关联 markdown')).not.toBeInTheDocument();
  });
});
