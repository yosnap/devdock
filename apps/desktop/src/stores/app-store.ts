import { create } from 'zustand';
import type { ProjectFilters, ViewMode } from '../types';

interface AppState {
  // View preferences
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Active workspace filter (null = All Projects)
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;

  // Project filters
  filters: ProjectFilters;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  resetFilters: () => void;

  // Active view (dashboard, settings)
  activeView: 'dashboard' | 'settings';
  setActiveView: (view: 'dashboard' | 'settings') => void;

  // Active settings tab
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;
}

const defaultFilters: ProjectFilters = {
  search: '',
  workspace_id: undefined,
  status: undefined,
  stack: undefined,
  tag: undefined,
};

export const useAppStore = create<AppState>((set) => ({
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  activeWorkspaceId: null,
  setActiveWorkspaceId: (id) =>
    set((state) => ({
      activeWorkspaceId: id,
      filters: { ...state.filters, workspace_id: id ?? undefined },
    })),

  filters: defaultFilters,
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: defaultFilters }),

  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  activeSettingsTab: 'ides',
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
}));
