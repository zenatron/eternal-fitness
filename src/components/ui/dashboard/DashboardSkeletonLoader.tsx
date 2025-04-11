export function DashboardSkeletonLoader() {
  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center px-4">
      <div className="animate-pulse w-full max-w-6xl mx-auto">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg mb-8 w-40"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg h-64"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
