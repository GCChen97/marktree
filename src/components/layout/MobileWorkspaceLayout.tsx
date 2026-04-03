import type { ReactNode } from 'react';
import type { MobilePaneTab } from '../../types/layout';

type MobileWorkspaceLayoutProps = {
  activeTab: MobilePaneTab;
  onTabChange: (tab: MobilePaneTab) => void;
  panes: {
    toolbar: ReactNode;
    canvas: ReactNode;
    markdown: ReactNode;
  };
};

const mobileTabLabels: Record<MobilePaneTab, string> = {
  toolbar: '工具栏',
  canvas: '画布',
  markdown: '详情',
};

export function MobileWorkspaceLayout({
  activeTab,
  onTabChange,
  panes,
}: MobileWorkspaceLayoutProps) {
  return (
    <div className="mobile-workspace" data-testid="mobile-workspace">
      <main className="mobile-workspace__body" data-active-tab={activeTab}>
        <section
          className="mobile-workspace__pane"
          data-testid={`mobile-pane-${activeTab}`}
        >
          {panes[activeTab]}
        </section>
      </main>

      <nav
        aria-label="移动端主导航"
        className="mobile-workspace__nav"
        data-testid="mobile-bottom-nav"
      >
        {(Object.keys(mobileTabLabels) as MobilePaneTab[]).map((tab) => (
          <button
            aria-current={activeTab === tab ? 'page' : undefined}
            className="mobile-workspace__nav-button"
            data-active={activeTab === tab}
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {mobileTabLabels[tab]}
          </button>
        ))}
      </nav>
    </div>
  );
}
