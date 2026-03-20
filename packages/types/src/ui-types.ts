// UI state types — platform-agnostic view/filter state

import type { ProjectStatus } from './models';

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'last_opened_at' | 'created_at';

export interface ProjectFilters {
  search: string;
  workspace_id?: string;
  status?: ProjectStatus;
  stack?: string;
  tag?: string;
}
