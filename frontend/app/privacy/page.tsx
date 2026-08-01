export default function PrivacyPolicy() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-slate-500 font-medium">Last updated: August 1, 2026</p>
      </div>
      
      <div className="prose prose-slate max-w-none text-slate-600 text-lg space-y-6">
        <p className="text-xl font-medium leading-relaxed text-slate-700">
          At NodeFerry, privacy is not just a feature; it is the foundation of our technology. This Privacy Policy outlines what information we collect, how we use it, and how we ensure your file transfers remain strictly confidential.
        </p>

        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-3 mt-0">1. End-to-End Encryption & Security</h2>
          <p className="m-0">
            NodeFerry uses military-grade AES-GCM encryption for all transfers. Whether you are using our free Peer-to-Peer service or our Premium Cloud Link service, your files are encrypted locally in your browser before they ever leave your device. We do not hold the decryption keys, meaning <strong>we cannot view, access, or scan your files at any point.</strong>
          </p>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">2. Data We Collect</h2>
        <p>
          <strong>For Guest Users:</strong> If you use our free services without logging in, we do not collect personal identifying information. We only temporarily handle connection metadata (Session Description Protocol) to establish P2P links, which is deleted immediately after connection. We also temporarily log IP addresses to enforce our 5GB daily fair-use limits.
        </p>
        <p>
          <strong>For Registered Users:</strong> To provide our Premium Pay-As-You-Go service, we collect your email address when you create an account. This is used solely for authentication and managing your credit balance.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Third-Party Services</h2>
        <p>We partner with industry-leading providers to deliver a reliable experience:</p>
        <ul className="list-disc pl-6 space-y-2 marker:text-blue-500">
          <li><strong>Supabase:</strong> Used for secure user authentication and database management for premium credits.</li>
          <li><strong>PayPal:</strong> Used securely for processing payments. NodeFerry does not store your credit card information.</li>
          <li><strong>Cloudflare R2:</strong> Used to temporarily host encrypted files for our Premium Cloud Link users. Since all files are End-to-End Encrypted before upload, Cloudflare cannot read your data.</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Analytics</h2>
        <p>
          We do not track individual file transfer metrics or store identifying information about who sends what. We may use privacy-respecting, aggregated analytics strictly to monitor server health, ensure service reliability, and understand website traffic patterns without identifying individual users.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:support@nodeferry.com" className="text-blue-600 font-bold hover:underline">support@nodeferry.com</a>.
        </p>
      </div>
    </div>
  );
}
