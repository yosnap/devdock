/// Health score badge — circular progress indicator showing 0-100 project health.
/// Colors: green (≥80), yellow (50-79), red (<50). Shows -1 as "not scored yet".
import { Tooltip } from 'antd';

interface HealthScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium';
}

function scoreColor(score: number): string {
  if (score >= 80) return '#52c41a';
  if (score >= 50) return '#faad14';
  return '#ff4d4f';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'Needs attention';
  return 'Critical';
}

export function HealthScoreBadge({ score, size = 'medium' }: HealthScoreBadgeProps) {
  // Guard against null/undefined from DB rows added before health_score column
  const safeScore = typeof score === 'number' && isFinite(score) ? score : -1;
  if (safeScore < 0) {
    return (
      <Tooltip title="Health score not calculated yet">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size === 'small' ? 24 : 32,
            height: size === 'small' ? 24 : 32,
            borderRadius: '50%',
            border: '2px solid var(--border-color)',
            fontSize: size === 'small' ? 9 : 11,
            color: 'var(--icon-muted)',
          }}
        >
          ?
        </span>
      </Tooltip>
    );
  }

  const color = scoreColor(safeScore);
  const dim = size === 'small' ? 28 : 36;
  const stroke = 3;
  const radius = (dim - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeScore / 100);

  return (
    <Tooltip title={`Health: ${safeScore}/100 — ${scoreLabel(safeScore)}`}>
      <span style={{ display: 'inline-flex', position: 'relative', cursor: 'default' }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="var(--border-color)" strokeWidth={stroke} />
          {/* Progress */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'small' ? 9 : 11,
            fontWeight: 600,
            color,
          }}
        >
          {safeScore}
        </span>
      </span>
    </Tooltip>
  );
}
