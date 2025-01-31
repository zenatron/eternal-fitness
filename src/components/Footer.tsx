export function Footer() {
  return (
    <footer className="bg-slate-800 dark:bg-gray-950 text-white py-4 px-8 text-center">
      <p className="text-sm text-gray-300">
        © {new Date().getFullYear()} Eternal Fitness. All rights reserved.
      </p>
      <p className="text-sm text-gray-300 mt-2">
        Built with ❤️ by{' '}
        <a 
          href="https://github.com/zenatron" 
          className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          zenatron
        </a>
      </p>
    </footer>
  )
} 