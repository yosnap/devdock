import { Col, Empty, Row, Spin } from 'antd';
import { useMemo } from 'react';
import { useProjects } from '../../queries/use-projects-query';
import { useAppStore } from '../../stores/app-store';
import type { Project, ProjectFilters } from '../../types';
import { ProjectCard } from './project-card';
import { ProjectListItem } from './project-list-item';

interface ProjectGridProps {
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/** Filter projects by the current app store filters */
function filterProjects(projects: Project[], filters: ProjectFilters): Project[] {
  return projects.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.path.toLowerCase().includes(q)) return false;
    }
    if (filters.workspace_id && p.workspace_id !== filters.workspace_id) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.stack && p.stack !== filters.stack) return false;
    if (filters.tag && !p.tags?.includes(filters.tag)) return false;
    return true;
  });
}

export function ProjectGrid({ onEdit, onDelete }: ProjectGridProps) {
  const { data: projects = [], isLoading } = useProjects();
  const { viewMode, filters } = useAppStore();

  const filtered = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <Empty
        description="No projects found"
        style={{ padding: 64 }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (viewMode === 'list') {
    return (
      <div style={{ borderTop: '1px solid var(--border-color)' }}>
        {filtered.map((project) => (
          <ProjectListItem key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  return (
    <Row gutter={[16, 16]} style={{ padding: 16 }}>
      {filtered.map((project) => (
        <Col key={project.id} xs={24} sm={12} md={8} lg={6} xl={6}>
          <ProjectCard project={project} onEdit={onEdit} onDelete={onDelete} />
        </Col>
      ))}
    </Row>
  );
}
