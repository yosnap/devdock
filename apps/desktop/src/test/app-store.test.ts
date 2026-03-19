import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../stores/app-store';

// Reset store state between tests
beforeEach(() => {
  const store = useAppStore.getState();
  store.resetFilters();
  store.setViewMode('grid');
  store.setActiveView('dashboard');
  store.setActiveWorkspaceId(null);
});

describe('useAppStore', () => {
  it('defaults to grid view mode', () => {
    expect(useAppStore.getState().viewMode).toBe('grid');
  });

  it('toggles view mode', () => {
    useAppStore.getState().setViewMode('list');
    expect(useAppStore.getState().viewMode).toBe('list');
  });

  it('sets active workspace and syncs filters', () => {
    useAppStore.getState().setActiveWorkspaceId('ws-123');
    const state = useAppStore.getState();
    expect(state.activeWorkspaceId).toBe('ws-123');
    expect(state.filters.workspace_id).toBe('ws-123');
  });

  it('clears workspace filter when set to null', () => {
    useAppStore.getState().setActiveWorkspaceId('ws-123');
    useAppStore.getState().setActiveWorkspaceId(null);
    const state = useAppStore.getState();
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.filters.workspace_id).toBeUndefined();
  });

  it('merges filters', () => {
    useAppStore.getState().setFilters({ search: 'hello', stack: 'rust' });
    const { filters } = useAppStore.getState();
    expect(filters.search).toBe('hello');
    expect(filters.stack).toBe('rust');
  });

  it('resets filters to defaults', () => {
    useAppStore.getState().setFilters({ search: 'test', stack: 'node' });
    useAppStore.getState().resetFilters();
    const { filters } = useAppStore.getState();
    expect(filters.search).toBe('');
    expect(filters.stack).toBeUndefined();
  });

  it('switches active view', () => {
    useAppStore.getState().setActiveView('settings');
    expect(useAppStore.getState().activeView).toBe('settings');
    useAppStore.getState().setActiveView('dashboard');
    expect(useAppStore.getState().activeView).toBe('dashboard');
  });
});
