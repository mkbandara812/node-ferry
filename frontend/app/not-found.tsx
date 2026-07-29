import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">404</h1>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Page not found</h2>
      <p className="text-slate-400 text-lg max-w-md mx-auto mb-10">
        Oops! The page or room you are looking for doesn't exist, has been removed, or is temporarily unavailable.
      </p>
      
      <Link href="/" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg hover:shadow-xl">
        <Home className="w-5 h-5" />
        Back to Home
      </Link>
    </div>
  );
}
