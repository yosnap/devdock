import { Layout, Modal, notification } from 'antd';
import { useState } from 'react';
import { useDeleteProject } from '../../queries/use-projects-query';
import { useAppStore } from '../../stores/app-store';
import type { Project } from '../../types';
import { AddProjectModal } from '../projects/add-project-modal';
import { ProjectDetailDrawer } from '../projects/project-detail-drawer';
import { ProjectGrid } from '../projects/project-grid';
import { IdeConfigPanel } from '../settings/ide-config-panel';
import { WorkspaceManager } from '../workspaces/workspace-manager';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

const { Sider, Content, Header } = Layout;

const SIDEBAR_WIDTH = 220;

export function AppLayout() {
  const { activeView, activeSettingsTab } = useAppStore();
  const deleteProject = useDeleteProject();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  function handleEdit(project: Project) {
    setDetailProject(null);
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

  function handleOpenDetail(project: Project) {
    setDetailProject(project);
  }

  function handleModalClose() {
    setAddModalOpen(false);
    setEditingProject(null);
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sider
        width={SIDEBAR_WIDTH}
        theme="light"
        style={{ borderRight: '1px solid var(--border-color)', overflow: 'auto' }}
      >
        <Sidebar />
      </Sider>

      <Layout>
        {/* Top bar — only on dashboard */}
        {activeView === 'dashboard' && (
          <Header style={{ padding: 0, height: 'auto', lineHeight: 'normal', background: 'transparent' }}>
            <TopBar onAddProject={() => setAddModalOpen(true)} />
          </Header>
        )}

        {/* Main content */}
        <Content style={{ overflow: 'auto' }}>
          {activeView === 'dashboard' && (
            <ProjectGrid
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpenDetail={handleOpenDetail}
            />
          )}
          {activeView === 'settings' && (
            <div style={{ padding: 24, maxWidth: 800 }}>
              {activeSettingsTab === 'ides' && <IdeConfigPanel />}
              {activeSettingsTab === 'workspaces' && <WorkspaceManager />}
            </div>
          )}
        </Content>
      </Layout>

      {/* Project Detail Drawer */}
      <ProjectDetailDrawer
        project={detailProject}
        open={Boolean(detailProject)}
        onClose={() => setDetailProject(null)}
        onEdit={handleEdit}
      />

      {/* Add/Edit Project modal */}
      <AddProjectModal
        open={addModalOpen}
        project={editingProject}
        onClose={handleModalClose}
      />
    </Layout>
  );
}
