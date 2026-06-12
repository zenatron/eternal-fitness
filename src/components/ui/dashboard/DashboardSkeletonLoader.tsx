export function DashboardSkeletonLoader() {
  return (
    <div className="pb-16">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes skeletonFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #e8e6e2 25%, #f5f3f0 50%, #e8e6e2 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite ease-in-out;
        }
        .dark .skeleton-shimmer {
          background: linear-gradient(90deg, #242320 25%, #2f2d2a 50%, #242320 75%);
          background-size: 200% 100%;
        }
        .skeleton-card {
          animation: skeletonFadeIn 0.6s ease-out backwards;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="skeleton-card mb-8 forge-card p-6 sm:p-8">
          <div className="h-8 w-48 skeleton-shimmer rounded-lg mb-3" />
          <div className="h-5 w-64 skeleton-shimmer rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="skeleton-card forge-card"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-300">
                <div className="h-5 w-28 skeleton-shimmer rounded" />
              </div>
              <div className="p-5 space-y-3">
                <div className="h-4 skeleton-shimmer rounded w-full" />
                <div className="h-4 skeleton-shimmer rounded w-3/4" />
                <div className="h-4 skeleton-shimmer rounded w-1/2" />
                <div className="h-10 skeleton-shimmer rounded-lg mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
