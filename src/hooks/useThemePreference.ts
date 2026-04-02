import { useEffect, useState } from 'react';
import type { ThemeMode } from '../types/theme';

export const THEME_STORAGE_KEY = 'mymind.phase1.theme';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'day';
  }

  const value = window.localStorage.getItem(THEME_STORAGE_KEY);

  return value === 'night' ? 'night' : 'day';
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme: () =>
      setTheme((currentTheme) => (currentTheme === 'day' ? 'night' : 'day')),
  };
}
