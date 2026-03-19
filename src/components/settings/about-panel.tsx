/// About panel — shows app version, update checker, export/import config.
import {
  CloudDownloadOutlined,
  ExportOutlined,
  ImportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
import { Button, Divider, Space, Spin, Typography, notification } from 'antd';
import { useEffect, useState } from 'react';
import {
  AppInfo,
  UpdateInfo,
  checkForUpdate,
  exportConfig,
  getAppInfo,
  importConfig,
  installUpdate,
} from '../../services/tauri-commands';

const { Text, Title, Paragraph } = Typography;

export function AboutPanel() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getAppInfo().then(setAppInfo).catch(() => {});
  }, []);

  async function handleCheckUpdate() {
    setChecking(true);
    try {
      const info = await checkForUpdate();
      setUpdateInfo(info);
      if (!info.available) notification.info({ message: 'You are on the latest version' });
    } catch (e) {
      notification.error({ message: `Update check failed: ${e}` });
    } finally {
      setChecking(false);
    }
  }

  async function handleInstallUpdate() {
    setInstalling(true);
    try {
      await installUpdate();
    } catch (e) {
      notification.error({ message: `Update failed: ${e}` });
      setInstalling(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const json = await exportConfig();
      const path = await saveDialog({
        defaultPath: `devdock-config-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path) {
        // Write via Tauri FS (not available as separate plugin — use clipboard fallback or shell)
        // For now: copy to clipboard and notify user
        await navigator.clipboard.writeText(json);
        notification.success({
          message: 'Config exported to clipboard',
          description: `Save as: ${path}`,
        });
      }
    } catch (e) {
      notification.error({ message: `Export failed: ${e}` });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const selected = await openDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        // Read file content via fetch (works for local files in Tauri)
        const response = await fetch(`asset://${selected}`);
        const json = await response.text();
        const result = await importConfig(json);
        notification.success({
          message: 'Config imported successfully',
          description: `${result.projects} projects, ${result.workspaces} workspaces, ${result.ide_configs} IDEs imported`,
        });
      }
    } catch (e) {
      notification.error({ message: `Import failed: ${e}` });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <Space align="center" style={{ marginBottom: 20 }}>
        <InfoCircleOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>DevDock</Title>
          {appInfo ? (
            <Text type="secondary">Version {appInfo.version}</Text>
          ) : (
            <Spin size="small" />
          )}
        </div>
      </Space>

      <Paragraph type="secondary" style={{ maxWidth: 480 }}>
        A desktop project launcher for developers — open projects in your IDE,
        track dependencies, monitor CI, and manage GitHub issues from one place.
      </Paragraph>

      <Divider />

      {/* Auto-updater */}
      <Title level={5}>Updates</Title>
      <Space direction="vertical">
        {updateInfo?.available && (
          <div style={{ padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
            <Text strong>Version {updateInfo.version} available</Text>
            {updateInfo.notes && (
              <Paragraph style={{ marginTop: 4, marginBottom: 8, fontSize: 12 }}>{updateInfo.notes}</Paragraph>
            )}
            <Button
              type="primary"
              size="small"
              icon={<CloudDownloadOutlined />}
              loading={installing}
              onClick={handleInstallUpdate}
            >
              Install and Restart
            </Button>
          </div>
        )}
        <Button icon={<CloudDownloadOutlined />} loading={checking} onClick={handleCheckUpdate}>
          Check for Updates
        </Button>
      </Space>

      <Divider />

      {/* Export / Import */}
      <Title level={5}>Backup & Restore</Title>
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        Export your projects, workspaces, and IDE configurations to a JSON file.
        OAuth tokens are never exported.
      </Paragraph>
      <Space>
        <Button icon={<ExportOutlined />} loading={exporting} onClick={handleExport}>
          Export Config
        </Button>
        <Button icon={<ImportOutlined />} loading={importing} onClick={handleImport}>
          Import Config
        </Button>
      </Space>
    </div>
  );
}
