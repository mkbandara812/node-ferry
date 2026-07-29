export default function About() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-12">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">About NodeFerry</h1>
        <p className="text-lg md:text-xl text-slate-500 font-medium">The limitless, free peer-to-peer file sharing protocol.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4">
        <section className="space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed text-[17px]">
            NodeFerry was created with a single goal: to provide the fastest, most secure, and completely private way to transfer files between devices. We believe that your data is yours. We store absolutely nothing on our servers. Your files transfer directly between devices with military-grade End-to-End Encryption, making it impossible for hackers to intercept. Once shared, no traces remain. That's why we made NodeFerry completely free for everyone.
          </p>
        </section>

        <section className="space-y-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">How It Works</h2>
          <p className="text-slate-600 leading-relaxed text-[17px]">
            Using advanced WebRTC technology, NodeFerry establishes a direct, peer-to-peer (P2P) connection between your device and the receiver's device. Our signaling server simply introduces the two devices. Once connected, files flow directly from one device to another through an AES-GCM encrypted tunnel.
          </p>
        </section>
      </div>

      <section className="mt-8 bg-white border border-slate-200/60 p-8 md:p-10 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Why Choose NodeFerry?</h2>
        <ul className="space-y-5 text-slate-600 text-[17px]">
          <li className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 p-1.5 rounded-full"><svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
            <div><strong className="text-slate-900">Zero Storage & Highly Secure:</strong> We store absolutely nothing. Hackers cannot access your files because they are End-to-End Encrypted and transfer directly between devices.</div>
          </li>
          <li className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 p-1.5 rounded-full"><svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
            <div><strong className="text-slate-900">Blazing Fast:</strong> By skipping cloud uploads, transfers are limited only by your network speed.</div>
          </li>
          <li className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 p-1.5 rounded-full"><svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
            <div><strong className="text-slate-900">100% Free:</strong> No subscriptions, no hidden fees. Just fast file sharing.</div>
          </li>
        </ul>
      </section>
    </div>
  );
}
