import Link from 'next/link';

export function NavBar() {
  return (
    <nav>
      <Link href="/workouts/create" className="px-4 py-2 text-blue-600 hover:text-blue-800">
        Create Workout
      </Link>
    </nav>
  );
} 