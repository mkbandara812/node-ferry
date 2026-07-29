export default function PrivacyPolicy() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-slate-500 font-medium">Last updated: June 1, 2026</p>
      </div>
      
      <div className="prose prose-slate max-w-none text-slate-600 text-lg space-y-6">
        <p className="text-xl font-medium leading-relaxed text-slate-700">
          At NodeFerry, privacy is not just a feature; it is the foundation of our technology. This Privacy Policy outlines what information we collect, how we use it, and how we ensure your file transfers remain strictly confidential.
        </p>

        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-3 mt-0">1. Zero File Storage & Peer-to-Peer Transfers</h2>
          <p className="m-0">
            NodeFerry is built on WebRTC peer-to-peer technology. When you transfer a file, the data flows directly from your device to the recipient's device. <strong>We do not upload, store, or process your files on our servers at any point.</strong> All file chunks transmitted through the NodeFerry data channel are end-to-end encrypted securely (AES-GCM).
          </p>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">2. Data We Collect</h2>
        <p>
          NodeFerry is a completely free application that does not require user accounts or registration. We do not collect personal identifying information (PII) such as names, emails, or phone numbers.
        </p>
        <p>
          <strong>Connection Metadata:</strong> To establish a connection between two devices, our Signaling Server temporarily handles connection metadata (Session Description Protocol and ICE candidates). This metadata is ephemeral, contains no file data, and is deleted immediately after the connection is established.
        </p>
        <p>
          <strong>IP Address for Quota Management:</strong> We temporarily track the total bytes transferred per IP address strictly to enforce a fair-use limit of 5GB per day. This data is stored locally on the server and is not shared with third parties.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Analytics and Tracking</h2>
        <p>
          We do not track individual file transfer metrics or store identifying information about who sends what. We may use privacy-respecting, aggregated analytics strictly to monitor server health, ensure service reliability, and understand website traffic patterns without identifying individual users.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Third-Party Services</h2>
        <p>
          NodeFerry does not sell your data or use third-party advertising trackers. You maintain complete ownership and control over your files during the transfer process.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:support@nodeferry.com" className="text-blue-600 font-bold hover:underline">support@nodeferry.com</a>.
        </p>
      </div>
    </div>
  );
}
