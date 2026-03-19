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
  if (score < 0) {
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
            border: '2px solid #d9d9d9',
            fontSize: size === 'small' ? 9 : 11,
            color: '#bbb',
          }}
        >
          ?
        </span>
      </Tooltip>
    );
  }

  const color = scoreColor(score);
  const dim = size === 'small' ? 28 : 36;
  const stroke = 3;
  const radius = (dim - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <Tooltip title={`Health: ${score}/100 — ${scoreLabel(score)}`}>
      <span style={{ display: 'inline-flex', position: 'relative', cursor: 'default' }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
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
          {score}
        </span>
      </span>
    </Tooltip>
  );
}
