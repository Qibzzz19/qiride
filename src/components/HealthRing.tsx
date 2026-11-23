interface HealthRingProps {
  value: number
  size?: number
  stroke?: number
  color?: string
  label?: string
  className?: string
}

export function HealthRing({
  value,
  size = 52,
  stroke = 4,
  color = '#3B82F6',
  label,
  className = '',
}: HealthRingProps) {
  const normalized = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - normalized / 100)

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? 'Kesehatan'} ${Math.round(normalized)} persen`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ filter: `drop-shadow(0 0 4px ${color}66)`, transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <span
        className="mono absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
        style={{ color, fontSize: size * 0.23 }}
      >
        {Math.round(normalized)}
      </span>
    </div>
  )
}
