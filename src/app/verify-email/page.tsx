export default function VerifyEmail() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-8 rounded shadow-md space-y-6 text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
          <svg 
            className="w-8 h-8 text-blue-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Check your email
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          We&#39;ve sent you a verification link to your email address.
          Please click the link to verify your account.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Didn&#39;t receive the email?</p>
          <p>Check your spam folder or contact support.</p>
        </div>
        <a 
          href="/login" 
          className="btn btn-primary inline-block w-full"
        >
          Return to Login
        </a>
      </div>
    </div>
  )
} 