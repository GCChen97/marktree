import { useEffect, useState } from 'react';
import { createDefaultWorkspaceState } from '../data/defaultGraph';
import type { WorkspaceState } from '../types/graph';
import { exportWorkspaceData, parseStoredWorkspaceString } from '../utils/graph';

export const WORKSPACE_STORAGE_KEY = 'mymind.phase6.workspace';

function readStoredWorkspace(): WorkspaceState {
  const fallbackWorkspace = createDefaultWorkspaceState();

  if (typeof window === 'undefined') {
    return fallbackWorkspace;
  }

  const rawValue = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (!rawValue) {
    return fallbackWorkspace;
  }

  const parsed = parseStoredWorkspaceString(rawValue);

  return parsed ?? fallbackWorkspace;
}

export function usePersistentWorkspaceState() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    readStoredWorkspace(),
  );

  useEffect(() => {
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify(exportWorkspaceData(workspace)),
    );
  }, [workspace]);

  return {
    workspace,
    setWorkspace,
  };
}
