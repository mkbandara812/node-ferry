import Link from 'next/link';
import { Coffee } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 20L19 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 20L5 11C5 8.23858 7.23858 6 10 6L14 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M19 4L19 13C19 15.7614 16.7614 18 14 18L10 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="5" cy="20" r="2.5" fill="currentColor"/>
              <circle cx="19" cy="4" r="2.5" fill="currentColor"/>
            </svg>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">NodeFerry</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How it Works</Link>
          <a href="mailto:support@nodeferry.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Support</a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="https://ko-fi.com/nodeferry" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-[#FF5E5B] hover:bg-[#FF4A47] text-white shadow-sm shadow-[#FF5E5B]/20 active:scale-95">
            <Coffee className="w-4 h-4" />
            Support on Ko-fi
          </a>
        </div>
      </div>
    </header>
  );
}
