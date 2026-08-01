import Link from 'next/link';
import { Coffee } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800 py-10 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center md:text-left">
          &copy; {new Date().getFullYear()} NodeFerry. All rights reserved. <br />
          Free, fast, and secure P2P file sharing.
        </div>
        <div className="flex items-center gap-6 text-sm font-semibold text-slate-500 dark:text-slate-400 flex-wrap justify-center md:justify-end">
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms & Conditions</Link>
          
          <a href="https://ko-fi.com/nodeferry" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-[#FF5E5B]/10 hover:bg-[#FF5E5B] text-[#FF5E5B] hover:text-white border border-[#FF5E5B]/20 hover:border-transparent active:scale-95 ml-2">
            <Coffee className="w-4 h-4" />
            Donate
          </a>
        </div>
      </div>
    </footer>
  );
}
