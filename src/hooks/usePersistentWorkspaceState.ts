import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { createDefaultWorkspaceState } from '../data/defaultGraph';
import type {
  LocalDataDirectoryState,
  RepoWorkspaceManifest,
  WorkspaceDataMode,
  WorkspaceState,
} from '../types/graph';
import { rememberDirectoryHandle, restoreDirectoryHandle } from '../utils/directoryHandle';
import {
  createManifestFromWorkspace,
  getDefaultLocalDataDirectoryState,
  loadRepoWorkspace,
  saveWorkspaceToDirectory,
  syncDiscoveredNotesFromDirectory,
} from '../utils/repoData';

export const WORKSPACE_STORAGE_KEY = 'mymind.phase8.workspace.legacy';

type PermissionMode = 'read' | 'readwrite';

type DirectoryHandleWithPermissions = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: { mode?: PermissionMode }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: PermissionMode }) => Promise<PermissionState>;
};

type WindowWithDirectoryPicker = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: {
      mode?: PermissionMode;
    }) => Promise<FileSystemDirectoryHandle>;
  };

function getInitialWorkspaceState() {
  if (import.meta.env.MODE === 'test') {
    return createDefaultWorkspaceState();
  }

  return null;
}

function getInitialManifestState(workspace: WorkspaceState | null): RepoWorkspaceManifest | null {
  return import.meta.env.MODE === 'test' && workspace
    ? createManifestFromWorkspace(workspace)
    : null;
}

export function usePersistentWorkspaceState() {
  const initialWorkspace = getInitialWorkspaceState();
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(initialWorkspace);
  const [manifest, setManifest] = useState<RepoWorkspaceManifest | null>(
    getInitialManifestState(initialWorkspace),
  );
  const [isLoading, setIsLoading] = useState(!initialWorkspace);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataMode] = useState<WorkspaceDataMode>(
    import.meta.env.DEV ? 'author-local' : 'repo-static',
  );
  const [localDataDirectoryState, setLocalDataDirectoryState] =
    useState<LocalDataDirectoryState>(getDefaultLocalDataDirectoryState());
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const manifestRef = useRef<RepoWorkspaceManifest | null>(null);
  const skipNextAutoSaveRef = useRef(true);
  const syncInProgressRef = useRef(false);
  const syncedDirectoryVersionRef = useRef(0);
  const [directoryHandleVersion, setDirectoryHandleVersion] = useState(0);

  useEffect(() => {
    if (initialWorkspace) {
      return;
    }

    let cancelled = false;

    void loadRepoWorkspace()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setWorkspace(result.workspace);
        setManifest(result.manifest);
        setIsLoading(false);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : '加载 repo 数据失败。',
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialWorkspace]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined' || !window.indexedDB) {
      return;
    }

    let cancelled = false;

    void restoreDirectoryHandle()
      .then(async (directoryHandle) => {
        if (cancelled || !directoryHandle) {
          return;
        }

        const writableDirectoryHandle =
          directoryHandle as DirectoryHandleWithPermissions;
        const permission = await writableDirectoryHandle.queryPermission?.({
          mode: 'readwrite',
        });

        if (permission !== 'granted') {
          return;
        }

        directoryHandleRef.current = directoryHandle;
        setLocalDataDirectoryState({
          hasWritableDirectory: true,
          directoryName: directoryHandle.name,
          lastError: null,
          lastSyncMessage: null,
        });
        setDirectoryHandleVersion((currentValue) => currentValue + 1);
      })
      .catch(() => {
        setLocalDataDirectoryState(getDefaultLocalDataDirectoryState());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  const saveWorkspaceNow = useCallback(async () => {
    if (!workspace || !directoryHandleRef.current) {
      return false;
    }

    try {
      const nextManifest = await saveWorkspaceToDirectory(
        directoryHandleRef.current,
        workspace,
        manifestRef.current,
      );

      manifestRef.current = nextManifest;
      setManifest(nextManifest);
      setLocalDataDirectoryState((currentState) => ({
        ...currentState,
        lastError: null,
      }));

      return true;
    } catch (error) {
      setLocalDataDirectoryState((currentState) => ({
        ...currentState,
        lastError:
          error instanceof Error ? error.message : '写入 repo 文件失败。',
      }));

      return false;
    }
  }, [workspace]);

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      !workspace ||
      !directoryHandleRef.current ||
      !manifestRef.current
    ) {
      return;
    }

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    void saveWorkspaceNow();
  }, [saveWorkspaceNow, workspace]);

  const syncDataDirectory = useCallback(async () => {
    if (
      !import.meta.env.DEV ||
      !workspace ||
      !directoryHandleRef.current ||
      syncInProgressRef.current
    ) {
      return 0;
    }

    syncInProgressRef.current = true;

    try {
      const result = await syncDiscoveredNotesFromDirectory(
        directoryHandleRef.current,
        workspace,
        manifestRef.current,
      );

      if (result.discoveredCount > 0) {
        skipNextAutoSaveRef.current = true;
        manifestRef.current = result.manifest;
        setManifest(result.manifest);
        setWorkspace(result.workspace);
      }

      setLocalDataDirectoryState((currentState) => ({
        ...currentState,
        lastError: null,
        lastSyncMessage:
          result.discoveredCount > 0
            ? `已同步 ${result.discoveredCount} 个新的 Markdown 文件。`
            : currentState.lastSyncMessage,
      }));

      return result.discoveredCount;
    } catch (error) {
      setLocalDataDirectoryState((currentState) => ({
        ...currentState,
        lastError:
          error instanceof Error ? error.message : '同步目录失败。',
      }));

      return 0;
    } finally {
      syncInProgressRef.current = false;
    }
  }, [workspace]);

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      !workspace ||
      !directoryHandleRef.current ||
      directoryHandleVersion === 0 ||
      syncedDirectoryVersionRef.current === directoryHandleVersion
    ) {
      return;
    }

    void syncDataDirectory().then(() => {
      syncedDirectoryVersionRef.current = directoryHandleVersion;
    });
  }, [directoryHandleVersion, syncDataDirectory, workspace]);

  const selectDataDirectory = useCallback(async () => {
    const pickerWindow = window as WindowWithDirectoryPicker;

    if (
      !import.meta.env.DEV ||
      typeof window === 'undefined' ||
      typeof pickerWindow.showDirectoryPicker !== 'function'
    ) {
      setLocalDataDirectoryState({
        hasWritableDirectory: false,
        directoryName: null,
        lastError: '当前浏览器不支持目录写入。',
        lastSyncMessage: null,
      });
      return false;
    }

    try {
      const directoryHandle = await pickerWindow.showDirectoryPicker({
        mode: 'readwrite',
      });
      const writableDirectoryHandle =
        directoryHandle as DirectoryHandleWithPermissions;

      const permission = await writableDirectoryHandle.requestPermission?.({
        mode: 'readwrite',
      });

      if (permission !== 'granted') {
        setLocalDataDirectoryState({
          hasWritableDirectory: false,
          directoryName: null,
          lastError: '目录写入权限未授予。',
          lastSyncMessage: null,
        });
        return false;
      }

      directoryHandleRef.current = directoryHandle;
      skipNextAutoSaveRef.current = false;
      await rememberDirectoryHandle(directoryHandle);
      setLocalDataDirectoryState({
        hasWritableDirectory: true,
        directoryName: directoryHandle.name,
        lastError: null,
        lastSyncMessage: null,
      });
      syncedDirectoryVersionRef.current = 0;
      setDirectoryHandleVersion((currentValue) => currentValue + 1);

      return true;
    } catch (error) {
      setLocalDataDirectoryState({
        hasWritableDirectory: false,
        directoryName: null,
        lastError:
          error instanceof Error ? error.message : '选择目录失败。',
        lastSyncMessage: null,
      });

      return false;
    }
  }, []);

  const updateWorkspace = useCallback(
    (nextWorkspace: SetStateAction<WorkspaceState>) => {
      setWorkspace((currentWorkspace) => {
        const baseWorkspace = currentWorkspace ?? createDefaultWorkspaceState();

        return typeof nextWorkspace === 'function'
          ? (nextWorkspace as (workspace: WorkspaceState) => WorkspaceState)(
              baseWorkspace,
            )
          : nextWorkspace;
      });
    },
    [],
  );

  return {
    workspace,
    setWorkspace: updateWorkspace,
    isLoading,
    loadError,
    dataMode,
    isReadOnly: dataMode === 'repo-static',
    localDataDirectoryState,
    selectDataDirectory,
    saveWorkspaceNow,
    syncDataDirectory,
  };
}
