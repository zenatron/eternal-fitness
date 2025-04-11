interface StatItemProps {
  value: string | number;
  label: string;
  className?: string;
}

export function StatItem({ value, label, className = '' }: StatItemProps) {
  return (
    <div
      className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center ${className}`}
    >
      <p className="text-xl font-bold text-heading">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
    </div>
  );
}

interface StatsGridProps {
  stats: {
    value: string | number;
    label: string;
  }[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({
  stats,
  columns = 2,
  className = '',
}: StatsGridProps) {
  const gridClassName =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <div className={`grid ${gridClassName} gap-2 ${className}`}>
      {stats.map((stat, index) => (
        <StatItem key={index} value={stat.value} label={stat.label} />
      ))}
    </div>
  );
}
