import { useEffect, useState } from 'react';
import type { LayoutMode, PaneSizes } from '../types/layout';
import {
  DEFAULT_LAYOUT_STATE,
  LAYOUT_STORAGE_KEY,
  sanitizeLayoutState,
} from '../utils/layout';

function readStoredLayout() {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT_STATE;
  }

  const rawValue = window.localStorage.getItem(LAYOUT_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_LAYOUT_STATE;
  }

  try {
    return sanitizeLayoutState(JSON.parse(rawValue));
  } catch {
    return DEFAULT_LAYOUT_STATE;
  }
}

export function usePersistentLayoutState() {
  const [mode, setMode] = useState<LayoutMode>(() => readStoredLayout().mode);
  const [sizes, setSizes] = useState<PaneSizes>(() => readStoredLayout().sizes);

  useEffect(() => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        mode,
        sizes,
      }),
    );
  }, [mode, sizes]);

  return {
    mode,
    sizes,
    setMode,
    setSizes,
  };
}
