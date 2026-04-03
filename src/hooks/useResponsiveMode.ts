import { useEffect, useState } from 'react';
import type { WorkspaceViewportMode } from '../types/layout';

export const MOBILE_MEDIA_QUERY = '(max-width: 899px)';

function getViewportMode(): WorkspaceViewportMode {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'desktop';
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? 'mobile' : 'desktop';
}

export function useResponsiveMode() {
  const [viewportMode, setViewportMode] = useState<WorkspaceViewportMode>(
    () => getViewportMode(),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setViewportMode(event.matches ? 'mobile' : 'desktop');
    };

    handleChange(mediaQueryList);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange);

      return () => mediaQueryList.removeEventListener('change', handleChange);
    }

    mediaQueryList.addListener(handleChange);

    return () => mediaQueryList.removeListener(handleChange);
  }, []);

  return {
    viewportMode,
    isMobile: viewportMode === 'mobile',
  };
}
