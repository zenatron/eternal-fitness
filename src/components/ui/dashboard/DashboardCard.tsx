import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  icon,
  children,
  className = '',
}: DashboardCardProps) {
  return (
    <div
      className={`forge-card heat-glow ${className}`}
    >
      <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-300 flex items-center justify-between">
        <h3 className="font-display font-bold text-surface-50 dark:text-white tracking-wide uppercase text-sm">
          {title}
        </h3>
        {icon && <div className="text-accent-500/60 dark:text-accent-500/40">{icon}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
