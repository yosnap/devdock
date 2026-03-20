import { useState } from 'react';
import { Avatar, Button, Space, Tooltip, notification } from 'antd';
import { CameraOutlined, DeleteOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons';
import { open } from '@tauri-apps/plugin-dialog';
import { uploadAvatar, removeAvatar } from '../../services/tauri-commands';
import { useAvatarUrl } from '../../hooks/use-avatar-url';

interface AvatarPickerProps {
  entity: 'project' | 'workspace';
  entityId: string;
  /** Current avatar filename stored in DB */
  currentAvatar?: string;
  entityName?: string;
  size?: number;
  onAvatarChange: (newFilename: string | null) => void;
}

export function AvatarPicker({
  entity,
  entityId,
  currentAvatar,
  entityName,
  size = 64,
  onAvatarChange,
}: AvatarPickerProps) {
  const [loading, setLoading] = useState(false);
  const avatarUrl = useAvatarUrl(currentAvatar);

  const handlePick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      });
      // Plugin may return string or null when cancelled
      const path = typeof selected === 'string' ? selected : null;
      if (!path) return;

      setLoading(true);
      const filename = await uploadAvatar(entity, entityId, path);
      onAvatarChange(filename);
    } catch (err) {
      notification.error({ message: 'Error al subir imagen', description: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentAvatar) return;
    setLoading(true);
    try {
      await removeAvatar(entity, entityId);
      onAvatarChange(null);
    } catch (err) {
      notification.error({ message: 'Error al quitar imagen', description: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const defaultIcon = entity === 'workspace' ? <AppstoreOutlined /> : <UserOutlined />;
  const initials = entityName ? entityName.substring(0, 2).toUpperCase() : undefined;

  return (
    <Space align="center">
      <Avatar
        size={size}
        src={avatarUrl}
        icon={!avatarUrl && !initials ? defaultIcon : undefined}
        style={{ cursor: 'pointer', flexShrink: 0 }}
        onClick={handlePick}
      >
        {!avatarUrl && initials}
      </Avatar>
      <Space direction="vertical" size={4}>
        <Tooltip title="Seleccionar imagen">
          <Button
            size="small"
            icon={<CameraOutlined />}
            loading={loading}
            onClick={handlePick}
          >
            {currentAvatar ? 'Cambiar' : 'Subir imagen'}
          </Button>
        </Tooltip>
        {currentAvatar && (
          <Tooltip title="Quitar imagen">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={loading}
              onClick={handleRemove}
            >
              Quitar
            </Button>
          </Tooltip>
        )}
      </Space>
    </Space>
  );
}
