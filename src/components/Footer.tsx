import Link from 'next/link';
import pkg from '../../package.json';
import { FaHeart } from 'react-icons/fa';

const versionText = `v${pkg.version}`;

export function Footer() {
  return (
    <footer className="bg-slate-800 dark:bg-gray-950 text-gray-300 py-4 px-8">
      <div className="flex flex-col items-center justify-center space-y-1">
        <p className="text-xs">
          © {new Date().getFullYear()} Eternal Fitness. All rights reserved.
        </p>
        <p className="text-xs flex items-center justify-center">
          {"Built with"} 
          <FaHeart size={12} className="mx-1" />
          {"by"} 
          <Link href="https://github.com/zenatron" className="ml-1 text-accent">{"zenatron"}</Link>
          <span className="mx-2">•</span>
          <span>{versionText}</span>
        </p>
      </div>
    </footer>
  )
} 