import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { PaneSizes, LayoutMode, PaneKey } from '../../types/layout';
import {
  buildMinSizeMap,
  getPaneOrder,
  mapOrderedSizesToPaneSizes,
} from '../../utils/layout';
import { ResizeHandle } from './ResizeHandle';

type ThreePaneLayoutProps = {
  mode: LayoutMode;
  sizes: PaneSizes;
  onSizesChange: (sizes: PaneSizes) => void;
  panes: Record<PaneKey, ReactNode>;
};

export function ThreePaneLayout({
  mode,
  sizes,
  onSizesChange,
  panes,
}: ThreePaneLayoutProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(1280);
  const order = getPaneOrder(mode);
  const minSizes = useMemo(
    () => buildMinSizeMap(containerWidth),
    [containerWidth],
  );

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (width) {
        setContainerWidth(width);
      }
    });

    observer.observe(shell);
    setContainerWidth(shell.getBoundingClientRect().width || 1280);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="layout-shell" ref={shellRef}>
      <PanelGroup
        className="layout-group"
        direction="horizontal"
        key={mode}
        onLayout={(orderedSizes) =>
          onSizesChange(mapOrderedSizesToPaneSizes(order, orderedSizes))
        }
      >
        {order.map((paneKey, index) => (
          <Panel
            className="layout-panel"
            defaultSize={sizes[paneKey]}
            key={paneKey}
            minSize={minSizes[paneKey]}
            order={index + 1}
          >
            <section
              className="pane"
              data-pane-key={paneKey}
              data-testid={`pane-${paneKey}`}
            >
              {panes[paneKey]}
            </section>
          </Panel>
        )).reduce<ReactNode[]>((accumulator, panel, index) => {
          accumulator.push(panel);

          if (index < order.length - 1) {
            accumulator.push(
              <PanelResizeHandle
                className="layout-resize-handle"
                key={`handle-${order[index]}`}
              >
                <ResizeHandle />
              </PanelResizeHandle>,
            );
          }

          return accumulator;
        }, [])}
      </PanelGroup>
    </div>
  );
}
