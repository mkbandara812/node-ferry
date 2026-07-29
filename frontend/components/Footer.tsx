import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200/60 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-slate-500 text-sm font-medium text-center md:text-left">
          &copy; {new Date().getFullYear()} NodeFerry. All rights reserved. <br />
          Free, fast, and secure P2P file sharing.
        </div>
        <div className="flex items-center gap-8 text-sm font-semibold text-slate-500 flex-wrap justify-center md:justify-end">
          <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms & Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
