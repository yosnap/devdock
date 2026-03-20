/// Projects page — grid/list view with search, workspace and status filters.
/// Uses shared hooks; no IDE launch or path display (web scope).
import { AppstoreOutlined, BarsOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Empty, Modal, Row, Select, Segmented, Skeleton, Space, notification } from 'antd';
import { useMemo, useState } from 'react';
import { useDeleteProject, useProjects, useWorkspaces } from '@devdock/hooks';
import type { Project } from '@devdock/types';
import { AddProjectModal } from '../components/projects/add-project-modal';
import { ProjectCard } from '../components/projects/project-card';
import { useLayoutSearch } from '../components/layout/web-app-layout';

const CONTENT_MAX_WIDTH = 1200;

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'active' | 'paused' | 'archived';

export function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: workspaces = [] } = useWorkspaces();
  const deleteProject = useDeleteProject();
  const { search } = useLayoutSearch();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [workspaceFilter, setWorkspaceFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const wsMap = useMemo(() =>
    Object.fromEntries(workspaces.map((ws) => [ws.id, ws])),
    [workspaces]
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (workspaceFilter && p.workspace_id !== workspaceFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, search, workspaceFilter, statusFilter]);

  function handleEdit(project: Project) {
    setEditingProject(project);
    setAddModalOpen(true);
  }

  function handleDelete(project: Project) {
    Modal.confirm({
      title: `Delete "${project.name}"?`,
      content: 'This action cannot be undone.',
      okType: 'danger',
      onOk: async () => {
        await deleteProject.mutateAsync(project.id);
        notification.success({ message: 'Project deleted' });
      },
    });
  }

  function handleModalClose() {
    setAddModalOpen(false);
    setEditingProject(null);
  }

  const wsOptions = [
    { value: '', label: 'All workspaces' },
    ...workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
  ];

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: '24px 24px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Space wrap>
          <Select
            options={wsOptions}
            value={workspaceFilter ?? ''}
            onChange={(v) => setWorkspaceFilter(v || null)}
            style={{ width: 180 }}
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            style={{ width: 160 }}
          />
        </Space>
        <div style={{ flex: 1 }} />
        <Segmented<ViewMode>
          options={[
            { value: 'grid', icon: <AppstoreOutlined /> },
            { value: 'list', icon: <BarsOutlined /> },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
          Add Project
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col key={i} xs={24} sm={12} lg={8}><Skeleton active /></Col>
          ))}
        </Row>
      ) : filtered.length === 0 ? (
        <Empty description="No projects found" style={{ marginTop: 80 }} />
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filtered.map((project) => (
            <Col key={project.id} xs={24} sm={12} lg={8}>
              <ProjectCard
                project={project}
                workspaceColor={project.workspace_id ? wsMap[project.workspace_id]?.color : undefined}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <div>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceColor={project.workspace_id ? wsMap[project.workspace_id]?.color : undefined}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddProjectModal open={addModalOpen} project={editingProject} onClose={handleModalClose} />
    </div>
  );
}
