import { PlusIcon, PlayIcon } from '@heroicons/react/24/outline';
import { RxDashboard } from "react-icons/rx";

import Link from 'next/link';

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title = "Dashboard" }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-2">
        <RxDashboard className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-heading">{title}</h1>
      </div>
      <div className="flex gap-3">
        <Link href="/session/start" className="btn btn-quaternary inline-flex items-center">
          <PlayIcon className="h-5 w-5 mr-1" />
          Start Session
        </Link>
        <Link href="/template/create" className="btn btn-primary inline-flex items-center">
          <PlusIcon className="h-5 w-5 mr-1" />
          New Template
        </Link>
      </div>
    </div>
  );
} 