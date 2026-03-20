/// Quick Launch overlay — Raycast-style fuzzy project search.
/// Triggered by Cmd/Ctrl+K (or global hotkey from app-layout).
/// Arrow keys navigate results, Enter launches the selected project.
import { RocketOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Modal, Spin, Tag, Typography } from 'antd';
import type { InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useLaunchProject } from '../../queries/use-desktop-only-queries';
import { useQuickSearch } from '../../queries/use-health-query';
import type { QuickLaunchItem } from '@devdock/types';
import { stackColor, stackLabel } from '../projects/stack-utils';

const { Text } = Typography;

interface QuickLaunchOverlayProps {
  open: boolean;
  onClose: () => void;
}

function ResultRow({
  item,
  selected,
  onClick,
}: {
  item: QuickLaunchItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        cursor: 'pointer',
        background: selected ? 'var(--selected-bg)' : 'transparent',
        borderRadius: 6,
        transition: 'background 0.1s',
      }}
    >
      <RocketOutlined style={{ color: selected ? '#1677ff' : 'var(--icon-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong={selected} ellipsis style={{ display: 'block', fontSize: 13 }}>
          {item.name}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
          {item.path.length > 60 ? '…' + item.path.slice(-57) : item.path}
        </Text>
      </div>
      {item.stack && (
        <Tag color={stackColor(item.stack)} style={{ margin: 0, flexShrink: 0 }}>
          {stackLabel(item.stack)}
        </Tag>
      )}
    </div>
  );
}

export function QuickLaunchOverlay({ open, onClose }: QuickLaunchOverlayProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<InputRef>(null);

  const { data: results = [], isLoading } = useQuickSearch(query);
  const launch = useLaunchProject();

  // Reset state when overlay opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus?.(), 50);
    }
  }, [open]);

  // Keep selection in bounds
  useEffect(() => {
    setSelectedIdx(0);
  }, [results.length]);

  function handleLaunch(item: QuickLaunchItem) {
    launch.mutate(item.id);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleLaunch(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={560}
      style={{ top: 120 }}
      styles={{ body: { padding: 0 } }}
      destroyOnHidden
    >
      <div onKeyDown={handleKeyDown}>
        <Input
          ref={inputRef}
          prefix={<SearchOutlined style={{ color: 'var(--icon-muted)' }} />}
          placeholder="Search projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          bordered={false}
          style={{ fontSize: 16, padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}
          suffix={isLoading ? <Spin size="small" /> : null}
        />

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 6px' }}>
          {results.length === 0 && !isLoading && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <Text type="secondary">{query ? 'No projects found' : 'Start typing to search…'}</Text>
            </div>
          )}
          {results.map((item: QuickLaunchItem, idx: number) => (
            <ResultRow
              key={item.id}
              item={item}
              selected={idx === selectedIdx}
              onClick={() => handleLaunch(item)}
            />
          ))}
        </div>

        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--icon-muted)' }}>
          ↑↓ navigate · Enter launch · Esc close
        </div>
      </div>
    </Modal>
  );
}
