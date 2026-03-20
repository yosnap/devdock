/// App router — defines all routes with auth guard and layout wrapper.
import { createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from './components/auth/auth-guard';
import { WebAppLayout } from './components/layout/web-app-layout';
import { AuthCallbackPage } from './pages/auth-callback-page';
import { LoginPage } from './pages/login-page';
import { ProjectsPage } from './pages/projects-page';
import { ProjectDetailPage } from './pages/project-detail-page';
import { WorkspacesPage } from './pages/workspaces-page';
import { NotesPage } from './pages/notes-page';
import { HealthDashboardPage } from './pages/health-dashboard-page';
import { SettingsPage } from './pages/settings-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // OAuth redirect lands here — processes token before AuthGuard runs
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <WebAppLayout />,
        children: [
          { path: '/', element: <ProjectsPage /> },
          { path: '/projects/:id', element: <ProjectDetailPage /> },
          { path: '/workspaces', element: <WorkspacesPage /> },
          { path: '/notes', element: <NotesPage /> },
          { path: '/notes/:projectId', element: <NotesPage /> },
          { path: '/health', element: <HealthDashboardPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/:tab', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
