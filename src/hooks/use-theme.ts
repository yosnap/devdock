/// Hook for managing app theme (light/dark/auto).
/// State lives in Zustand so all components share the same instance.
/// On mount, loads saved preference from DB via Tauri command.
import { useCallback, useEffect } from 'react';
import { getTheme, setTheme } from '../services/tauri-commands';
import { useAppStore } from '../stores/app-store';
import type { AppTheme } from '../types';

/** Resolve 'auto' to the actual OS preference */
function resolveEffective(theme: AppTheme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDOM(effective: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', effective);
}

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setThemeState = useAppStore((s) => s.setThemeState);

  // Load from DB on first mount (only once per app lifecycle)
  useEffect(() => {
    getTheme()
      .then((stored) => {
        const t: AppTheme = stored === 'dark' ? 'dark' : stored === 'auto' ? 'auto' : 'light';
        setThemeState(t);
        applyToDOM(resolveEffective(t));
      })
      .catch(() => applyToDOM('light'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for OS theme changes when in 'auto' mode
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyToDOM(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const applyTheme = useCallback(async (t: AppTheme) => {
    setThemeState(t);
    applyToDOM(resolveEffective(t));
    await setTheme(t).catch(console.error);
  }, [setThemeState]);

  const effectiveTheme = resolveEffective(theme);

  return { theme, effectiveTheme, applyTheme };
}
