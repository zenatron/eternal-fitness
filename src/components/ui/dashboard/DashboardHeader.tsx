import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title = "Dashboard" }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-heading">{title}</h1>
      <div className="flex gap-3">
        <Link href="/workout/create" className="btn btn-primary inline-flex items-center">
          <PlusIcon className="h-5 w-5 mr-1" />
          New Workout
        </Link>
      </div>
    </div>
  );
} 