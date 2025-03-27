export default async function Home() {
  return (
    <>
        {/* Show content for signed out users */}
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Welcome to Eternal Fitness</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Your personalized workout companion for building a healthier lifestyle.
            </p>
          </div>
        </div>
    </>
  )
}