import Link from 'next/link';
import pkg from '../../package.json';
import { FaHeart } from 'react-icons/fa';

const versionText = `v${pkg.version}`;

export function Footer() {
  return (
    <footer className="bg-slate-800 dark:bg-gray-950 text-gray-300 py-4 px-8 text-center">
      <p className="text-sm flex items-center justify-center">
          © {new Date().getFullYear()} Eternal Fitness. All rights reserved.
          <span className="mx-2">•</span>
          {"Built with"} 
          <FaHeart size={14} className="mx-1" />
          {"by"} 
          <Link href="https://github.com/zenatron" className="ml-1">{"zenatron"}</Link>
          <span className="mx-2">•</span>
          <span>{versionText}</span>
        </p>
    </footer>
  )
} 