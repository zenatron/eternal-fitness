import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-8 rounded shadow-md space-y-8 text-center">
        <h1 className="text-8xl font-extrabold text-red-500 dark:text-red-400 animate-pulse">
          404
        </h1>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-700 dark:text-gray-200">
            Page Not Found
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {"Sorry, we couldn't find the page you're looking for."}
          </p>
        </div>
        <div className="pt-6">
          <Link 
            href="/" 
            className="btn btn-primary inline-flex items-center space-x-2 text-lg px-6 py-3"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
} 