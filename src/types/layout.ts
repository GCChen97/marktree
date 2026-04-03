export type PaneKey = 'A' | 'B' | 'C';

export type LayoutMode = 'ABC' | 'ACB' | 'CBA' | 'BCA';

export type PaneSizes = Record<PaneKey, number>;

export type LayoutState = {
  mode: LayoutMode;
  sizes: PaneSizes;
};

export type WorkspaceViewportMode = 'desktop' | 'mobile';

export type MobilePaneTab = 'toolbar' | 'canvas' | 'markdown';
