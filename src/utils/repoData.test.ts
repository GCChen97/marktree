import { describe, expect, it } from 'vitest';
import { createDefaultWorkspaceState } from '../data/defaultGraph';
import { createManifestFromWorkspace, saveWorkspaceToDirectory, syncDiscoveredNotesFromDirectory } from './repoData';

class MemoryFileHandle {
  kind = 'file' as const;

  constructor(
    public name: string,
    private store: Map<string, string>,
  ) {}

  async getFile() {
    const content = this.store.get(this.name) ?? '';

    return {
      name: this.name,
      text: async () => content,
    } as unknown as File;
  }

  async createWritable() {
    return {
      write: async (content: string) => {
        this.store.set(this.name, content);
      },
      close: async () => {},
    };
  }
}

class MemoryDirectoryHandle {
  kind = 'directory' as const;
  private files = new Map<string, string>();
  private directories = new Map<string, MemoryDirectoryHandle>();

  constructor(public name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    let directory = this.directories.get(name);

    if (!directory && options?.create) {
      directory = new MemoryDirectoryHandle(name);
      this.directories.set(name, directory);
    }

    if (!directory) {
      throw new Error(`Missing directory: ${name}`);
    }

    return directory as unknown as FileSystemDirectoryHandle;
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name) && options?.create) {
      this.files.set(name, '');
    }

    if (!this.files.has(name)) {
      throw new Error(`Missing file: ${name}`);
    }

    return new MemoryFileHandle(name, this.files) as unknown as FileSystemFileHandle;
  }

  async removeEntry(name: string) {
    this.files.delete(name);
    this.directories.delete(name);
  }

  async *entries(): AsyncIterableIterator<
    [string, FileSystemHandle]
  > {
    for (const [name] of this.files) {
      yield [
        name,
        new MemoryFileHandle(name, this.files) as unknown as FileSystemHandle,
      ];
    }

    for (const [name, directory] of this.directories) {
      yield [name, directory as unknown as FileSystemHandle];
    }
  }

  setFile(name: string, content: string) {
    this.files.set(name, content);
  }

  getFile(name: string) {
    return this.files.get(name) ?? null;
  }

  listFiles() {
    return [...this.files.keys()];
  }
}

async function createDirectoryTree() {
  const root = new MemoryDirectoryHandle('data-root');
  const graphs = (await root.getDirectoryHandle('graphs', {
    create: true,
  })) as unknown as MemoryDirectoryHandle;
  const notes = (await root.getDirectoryHandle('notes', {
    create: true,
  })) as unknown as MemoryDirectoryHandle;

  return {
    root,
    graphs,
    notes,
  };
}

describe('repoData directory persistence', () => {
  it('does not overwrite unchanged note files during normal graph saves', async () => {
    const workspace = createDefaultWorkspaceState();
    const manifest = createManifestFromWorkspace(workspace);
    const { root, notes } = await createDirectoryTree();

    await saveWorkspaceToDirectory(
      root as unknown as FileSystemDirectoryHandle,
      workspace,
      null,
    );

    const firstNoteId = workspace.noteOrder[0];
    const firstNoteFile = manifest.notes[firstNoteId].file;
    notes.setFile(firstNoteFile, '# edited externally');

    const nextWorkspace = {
      ...workspace,
      graphs: {
        ...workspace.graphs,
        [workspace.currentGraphId]: {
          ...workspace.graphs[workspace.currentGraphId],
          title: 'Main Graph Renamed',
        },
      },
    };

    await saveWorkspaceToDirectory(
      root as unknown as FileSystemDirectoryHandle,
      nextWorkspace,
      manifest,
    );

    expect(notes.getFile(firstNoteFile)).toBe('# edited externally');
  });

  it('discovers undeclared markdown files and renames them to the managed format', async () => {
    const workspace = createDefaultWorkspaceState();
    const manifest = createManifestFromWorkspace(workspace);
    const { root, notes } = await createDirectoryTree();

    await saveWorkspaceToDirectory(
      root as unknown as FileSystemDirectoryHandle,
      workspace,
      null,
    );

    notes.setFile('VLN.md', '# VLN');

    const result = await syncDiscoveredNotesFromDirectory(
      root as unknown as FileSystemDirectoryHandle,
      workspace,
      manifest,
    );

    expect(result.discoveredCount).toBe(1);
    expect(result.workspace.noteOrder).toHaveLength(workspace.noteOrder.length + 1);

    const discoveredNoteId = result.workspace.noteOrder.find(
      (noteId) => !workspace.noteOrder.includes(noteId),
    )!;
    const discoveredMeta = result.manifest.notes[discoveredNoteId];

    expect(discoveredMeta.title).toBe('VLN');
    expect(discoveredMeta.file).toMatch(/^VLN--.+\.md$/);
    expect(notes.getFile('VLN.md')).toBeNull();
    expect(notes.getFile(discoveredMeta.file)).toBe('# VLN');
    expect(
      JSON.parse(root.getFile('manifest.json') ?? '{}').noteOrder,
    ).toContain(discoveredNoteId);
  });
});
