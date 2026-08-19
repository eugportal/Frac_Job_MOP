// Linear progress bar with percentage label and color variants.

interface ProgressBarProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'brand' | 'accent' | 'amber' | 'red' | 'ink';
  showLabel?: boolean;
}

const colorMap = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  ink: 'bg-ink-400',
};

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3',
};

export function ProgressBar({ value, label, size = 'md', color = 'brand', showLabel = true }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor = colorMap[color];
  const barSize = sizeMap[size];

  return (
    <div className="flex flex-col gap-1">
      {(label || showLabel) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-ink-600">{label}</span>}
          {showLabel && <span className="font-semibold text-ink-700">{pct}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-ink-200 ${barSize}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
