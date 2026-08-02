import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About NodeFerry - Zero-Knowledge Private File Transfer',
  description: 'Learn about NodeFerry, our mission to provide the fastest, most secure way to transfer files between devices using military-grade End-to-End Encryption.',
  alternates: {
    canonical: '/about',
  },
};

export default function About() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-12">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">About NodeFerry</h1>
        <p className="text-lg md:text-xl text-slate-500 font-medium">The fast, secure, and flexible file sharing protocol.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4">
        <section className="space-y-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-800 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Our Mission</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[17px]">
            NodeFerry was created with a single goal: to provide the fastest, most secure way to transfer files between devices. We use military-grade End-to-End Encryption, making it impossible for hackers to intercept your data. 
          </p>
        </section>

        <section className="space-y-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-800 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">How It Works</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[17px]">
            We offer two secure methods: 
            <br/><br/>
            <strong>1. Peer-to-Peer (Free up to 5GB/Day):</strong> Using advanced WebRTC technology, your files flow directly from one device to another through an AES-GCM encrypted tunnel.
            <br/><br/>
            <strong>2. Cloud Link (Premium for Large Files):</strong> For files up to 500MB, use our Cloud Link for free! For huge files (up to 50GB), we encrypt them locally in your browser and upload them to our lightning-fast Cloudflare R2 servers using our Pay-As-You-Go credit system.
          </p>
        </section>
      </div>

      <section className="mt-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-8 md:p-10 rounded-3xl shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Why Choose NodeFerry?</h3>
        <ul className="space-y-5 text-slate-600 dark:text-slate-400 text-[17px]">
          <li className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"><svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
            <div><strong className="text-slate-900 dark:text-white">Highly Secure:</strong> Whether using P2P or our Cloud, your files are always End-to-End Encrypted. The encryption key never leaves your browser.</div>
          </li>
          <li className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"><svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
            <div><strong className="text-slate-900 dark:text-white">Blazing Fast:</strong> We utilize WebRTC for local network speeds, and Cloudflare's Global Network for worldwide lightning-fast downloads.</div>
          </li>
          <li className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"><svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
            <div><strong className="text-slate-900 dark:text-white">Fair Limits:</strong> Send up to 5GB/Day on P2P completely free! Need to host a 10GB file on our Cloud? Use our transparent Pay-As-You-Go credit system. No monthly subscriptions!</div>
          </li>
        </ul>
      </section>
    </div>
  );
}
