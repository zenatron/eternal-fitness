import {
  Cog6ToothIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function QuickActionsCard() {
  const actions = [
    {
      href: '/template/create',
      label: 'Create Template',
      icon: PlusIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      description: 'Build a new workout',
    },
    {
      href: '/templates',
      label: 'Templates',
      icon: ClipboardDocumentListIcon,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      description: 'Browse workouts',
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: UserIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      description: 'View your stats',
    },
    {
      href: '/profile?modal=activity',
      label: 'Activity',
      icon: ChartBarIcon,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      description: 'Track progress',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="h-2 bg-gradient-to-r from-gray-500 to-gray-600"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <BoltIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <Link
                href={action.href}
                className="group block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-xl ${action.bgColor} mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {action.label}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Start Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/templates"
            className="w-full btn btn-primary inline-flex items-center justify-center gap-2 group"
          >
            <BoltIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Start Workout
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
