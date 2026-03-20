import { Layout, Modal, notification } from 'antd';
import { useEffect, useState } from 'react';
import { useDeleteProject } from '@devdock/hooks';
import { useAppStore } from '../../stores/app-store';
import { useTheme } from '../../hooks/use-theme';
import type { Project } from '@devdock/types';
import { NeedsAttentionView } from '../health/needs-attention-view';
import { AddProjectModal } from '../projects/add-project-modal';
import { ProjectDetailDrawer } from '../projects/project-detail-drawer';
import { ProjectGrid } from '../projects/project-grid';
import { QuickLaunchOverlay } from '../quick-launch/quick-launch-overlay';
import { SettingsLayout } from '../settings/settings-layout';
import { DesktopLoginModal } from '../auth/desktop-login-modal';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { QuickCreateWorkspaceModal } from '../workspaces/quick-create-workspace-modal';

const { Sider, Content, Header } = Layout;

const SIDEBAR_WIDTH = 220;

export function AppLayout() {
  const { activeView } = useAppStore();
  const { effectiveTheme } = useTheme();
  const deleteProject = useDeleteProject();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [quickLaunchOpen, setQuickLaunchOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Global keyboard shortcut: Cmd/Ctrl+K → Quick Launch
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickLaunchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  function handleModalClose() {
    setAddModalOpen(false);
    setEditingProject(null);
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <Sider
        width={SIDEBAR_WIDTH}
        theme={effectiveTheme}
        style={{ borderRight: '1px solid var(--border-color)', overflow: 'auto' }}
      >
        <Sidebar />
      </Sider>

      <Layout style={{ background: 'var(--bg-base)' }}>
        {/* Top bar — only on dashboard */}
        {activeView === 'dashboard' && (
          <Header style={{ padding: 0, height: 'auto', lineHeight: 'normal', background: 'var(--bg-base)' }}>
            <TopBar onAddProject={() => setAddModalOpen(true)} onSignInClick={() => setLoginModalOpen(true)} />
          </Header>
        )}

        {/* Main content */}
        <Content style={{ overflow: 'auto', background: 'var(--bg-base)' }}>
          {activeView === 'dashboard' && (
            <ProjectGrid
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpenDetail={(p) => setDetailProject(p)}
            />
          )}

          {activeView === 'attention' && <NeedsAttentionView />}

          {activeView === 'settings' && <SettingsLayout />}
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

      {/* Quick Launch overlay (Cmd/Ctrl+K) */}
      <QuickLaunchOverlay
        open={quickLaunchOpen}
        onClose={() => setQuickLaunchOpen(false)}
      />

      {/* Quick create workspace (triggered from sidebar) */}
      <QuickCreateWorkspaceModal />

      {/* Supabase login modal */}
      <DesktopLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </Layout>
  );
}
