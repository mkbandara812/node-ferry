'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coffee, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group z-50">
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
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How it Works</Link>
          <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Support</Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <a href="https://ko-fi.com/nodeferry" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-[#FF5E5B] hover:bg-[#FF4A47] text-white shadow-sm shadow-[#FF5E5B]/20 active:scale-95">
            <Coffee className="w-4 h-4" />
            Support on Ko-fi
          </a>
        </div>

        {/* Mobile Toggle & Theme */}
        <div className="flex md:hidden items-center gap-2 z-50">
          <ThemeToggle />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-xl py-4 px-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors py-2">Home</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors py-2">How it Works</Link>
          <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors py-2">Support</Link>
          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
          <a href="https://ko-fi.com/nodeferry" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-base transition-all bg-[#FF5E5B] hover:bg-[#FF4A47] text-white shadow-sm shadow-[#FF5E5B]/20 active:scale-95">
            <Coffee className="w-5 h-5" />
            Support on Ko-fi
          </a>
        </div>
      )}
    </header>
  );
}
