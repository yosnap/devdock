import { Layout } from 'antd';
import { useState } from 'react';
import { IdeConfigPanel } from '../settings/ide-config-panel';
import { AddProjectModal } from '../projects/add-project-modal';
import { ProjectGrid } from '../projects/project-grid';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { useAppStore } from '../../stores/app-store';
import type { Project } from '../../types';
import { Modal, notification } from 'antd';
import { useDeleteProject } from '../../queries/use-projects-query';

const { Sider, Content, Header } = Layout;

const SIDEBAR_WIDTH = 220;

export function AppLayout() {
  const { activeView } = useAppStore();
  const deleteProject = useDeleteProject();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
            <ProjectGrid onEdit={handleEdit} onDelete={handleDelete} />
          )}
          {activeView === 'settings' && (
            <div style={{ padding: 24, maxWidth: 800 }}>
              <IdeConfigPanel />
            </div>
          )}
        </Content>
      </Layout>

      {/* Add/Edit Project modal */}
      <AddProjectModal
        open={addModalOpen}
        project={editingProject}
        onClose={handleModalClose}
      />
    </Layout>
  );
}
