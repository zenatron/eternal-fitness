import {
  Cog6ToothIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import Link from 'next/link';

export function QuickActionsCard() {
  const actions = [
    {
      href: '/template/create',
      label: 'Create Template',
      icon: <ClipboardDocumentListIcon className="h-5 w-5 mr-1" />,
      variant: 'primary',
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: <UserIcon className="h-5 w-5 mr-1" />,
      variant: 'secondary',
    },
    {
      href: '/activity',
      label: 'View Activity',
      icon: <ChartBarIcon className="h-5 w-5 mr-1" />,
      variant: 'tertiary',
    },
    {
      href: '/account',
      label: 'Account',
      icon: <Cog6ToothIcon className="h-5 w-5 mr-1" />,
      variant: 'secondary',
    },
  ];

  return (
    <DashboardCard
      title="Quick Actions"
      icon={<Cog6ToothIcon className="h-6 w-6" />}
      color="gray"
    >
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className={`btn btn-${action.variant} py-3 inline-flex items-center justify-center`}
          >
            {action.icon}
            {action.label}
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
