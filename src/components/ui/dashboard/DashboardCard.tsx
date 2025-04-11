import { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Supported gradient backgrounds
export type GradientColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'amber'
  | 'cyan'
  | 'red'
  | 'indigo'
  | 'pink'
  | 'gray';

// Gradient mapping
const gradientMap: Record<GradientColor, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  amber: 'from-amber-500 to-amber-600',
  cyan: 'from-cyan-500 to-cyan-600',
  red: 'from-red-500 to-red-600',
  indigo: 'from-indigo-500 to-indigo-600',
  pink: 'from-pink-500 to-pink-600',
  gray: 'from-gray-500 to-gray-600',
};

interface DashboardCardProps {
  title: string;
  icon: ReactNode;
  color: GradientColor;
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function DashboardCard({
  title,
  icon,
  color,
  children,
  delay = 0,
  className = '',
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${className}`}
    >
      <div className={`bg-gradient-to-r ${gradientMap[color]} p-4 text-white`}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6">{icon}</div>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
      </div>

      <div className="p-6">{children}</div>
    </motion.div>
  );
}
