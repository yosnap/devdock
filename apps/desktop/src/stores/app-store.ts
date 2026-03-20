import { create } from 'zustand';
import type { AppTheme, ProjectFilters, ViewMode } from '@devdock/types';

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

  // Active view (dashboard, settings, attention)
  activeView: 'dashboard' | 'settings' | 'attention';
  setActiveView: (view: 'dashboard' | 'settings' | 'attention') => void;

  // Active settings tab
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;

  // App theme — shared across all components
  theme: AppTheme;
  setThemeState: (theme: AppTheme) => void;

  // Workspace modal trigger (from sidebar)
  workspaceModalOpen: boolean;
  setWorkspaceModalOpen: (open: boolean) => void;
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

  theme: 'light',
  setThemeState: (theme) => set({ theme }),

  workspaceModalOpen: false,
  setWorkspaceModalOpen: (open) => set({ workspaceModalOpen: open }),
}));
