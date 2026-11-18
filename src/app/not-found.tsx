import Link from 'next/link';
import { MapIcon } from '@heroicons/react/24/outline';
import { StatusScreen } from '@/components/ui/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen
      icon={MapIcon}
      title="Nothing at this address"
      actions={
        <Link href="/" className="btn btn-primary tap-control min-h-[44px] flex-1">
          Go home
        </Link>
      }
    >
      <p>The link may be old, or the workout it pointed to was deleted.</p>
    </StatusScreen>
  );
}
