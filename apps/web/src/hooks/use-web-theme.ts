/// Web theme hook — stores preference in localStorage, no Tauri dependency.
/// Resolves 'auto' to actual OS preference via matchMedia.
import { useCallback, useEffect, useState } from 'react';
import type { AppTheme } from '@devdock/types';

const STORAGE_KEY = 'devdock-theme';

function resolveEffective(theme: AppTheme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDOM(effective: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', effective);
}

function loadSaved(): AppTheme {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'dark' || raw === 'light' || raw === 'auto') return raw;
  return 'light';
}

export function useWebTheme() {
  const [theme, setTheme] = useState<AppTheme>(loadSaved);

  // Apply on mount and theme change
  useEffect(() => {
    applyToDOM(resolveEffective(theme));
  }, [theme]);

  // Listen for OS changes when in 'auto' mode
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyToDOM(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const applyTheme = useCallback((t: AppTheme) => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyToDOM(resolveEffective(t));
  }, []);

  return { theme, effectiveTheme: resolveEffective(theme), applyTheme };
}
