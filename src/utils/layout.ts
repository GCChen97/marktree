import type { LayoutMode, LayoutState, PaneKey, PaneSizes } from '../types/layout';

export const LAYOUT_STORAGE_KEY = 'mymind.phase1.layout';

export const DEFAULT_LAYOUT_STATE: LayoutState = {
  mode: 'ABC',
  sizes: {
    A: 22,
    B: 43,
    C: 35,
  },
};

export const PANE_MIN_WIDTHS: Record<PaneKey, number> = {
  A: 220,
  B: 320,
  C: 280,
};

export const MIN_SHELL_WIDTH = 1000;

const LAYOUT_ORDERS: Record<LayoutMode, PaneKey[]> = {
  ABC: ['A', 'B', 'C'],
  ACB: ['A', 'C', 'B'],
  CBA: ['C', 'B', 'A'],
  BCA: ['B', 'C', 'A'],
};

export function getPaneOrder(mode: LayoutMode): PaneKey[] {
  return LAYOUT_ORDERS[mode];
}

export function normalizePaneSizes(sizes: PaneSizes): PaneSizes {
  const entries = Object.entries(sizes) as Array<[PaneKey, number]>;
  const total = entries.reduce((sum, [, value]) => sum + Math.max(value, 0), 0);

  if (total <= 0) {
    return DEFAULT_LAYOUT_STATE.sizes;
  }

  return entries.reduce(
    (accumulator, [key, value]) => ({
      ...accumulator,
      [key]: Number(((Math.max(value, 0) / total) * 100).toFixed(3)),
    }),
    {} as PaneSizes,
  );
}

export function isLayoutMode(value: unknown): value is LayoutMode {
  return (
    value === 'ABC' || value === 'ACB' || value === 'CBA' || value === 'BCA'
  );
}

export function mapOrderedSizesToPaneSizes(
  order: PaneKey[],
  orderedSizes: number[],
): PaneSizes {
  const nextSizes = order.reduce(
    (accumulator, key, index) => ({
      ...accumulator,
      [key]: orderedSizes[index] ?? DEFAULT_LAYOUT_STATE.sizes[key],
    }),
    {} as PaneSizes,
  );

  return normalizePaneSizes(nextSizes);
}

export function buildMinSizeMap(containerWidth: number): PaneSizes {
  const safeWidth = Math.max(containerWidth, MIN_SHELL_WIDTH);

  return {
    A: Number(((PANE_MIN_WIDTHS.A / safeWidth) * 100).toFixed(3)),
    B: Number(((PANE_MIN_WIDTHS.B / safeWidth) * 100).toFixed(3)),
    C: Number(((PANE_MIN_WIDTHS.C / safeWidth) * 100).toFixed(3)),
  };
}

export function sanitizeLayoutState(value: unknown): LayoutState {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('mode' in value) ||
    !('sizes' in value)
  ) {
    return DEFAULT_LAYOUT_STATE;
  }

  const candidate = value as Partial<LayoutState>;
  const sizes = candidate.sizes;

  if (
    !isLayoutMode(candidate.mode) ||
    typeof sizes !== 'object' ||
    sizes === null ||
    typeof sizes.A !== 'number' ||
    typeof sizes.B !== 'number' ||
    typeof sizes.C !== 'number'
  ) {
    return DEFAULT_LAYOUT_STATE;
  }

  return {
    mode: candidate.mode,
    sizes: normalizePaneSizes({
      A: sizes.A,
      B: sizes.B,
      C: sizes.C,
    }),
  };
}
