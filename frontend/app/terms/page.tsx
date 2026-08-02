import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions - NodeFerry',
  description: 'Read the Terms and Conditions for using NodeFerry. By accessing or using our free software and services, you agree to be bound by these terms.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsAndConditions() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Terms & Conditions</h1>
        <p className="text-slate-500 font-medium">Last updated: June 1, 2026</p>
      </div>
      
      <div className="prose prose-slate max-w-none text-slate-600 text-lg space-y-6">
        <p className="text-xl font-medium leading-relaxed text-slate-700">
          Welcome to NodeFerry. By accessing or using our free software and services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our service.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">1. Free Service</h2>
        <p>
          NodeFerry is provided as a free service. When using NodeFerry, you agree to adhere to our fair-use limits (such as the 5GB daily transfer limit per IP address).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">2. Acceptable Use of the Service</h2>
        <p>
          NodeFerry provides a peer-to-peer file transfer service. You agree to use the service only for lawful purposes. You are strictly prohibited from using NodeFerry to transfer:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-4 marker:text-blue-500">
          <li>Illegal, copyrighted, or pirated materials without authorization.</li>
          <li>Malware, viruses, or any harmful code.</li>
          <li>Content that violates the rights of others, including privacy and intellectual property rights.</li>
        </ul>
        <p className="mt-4">
          Because NodeFerry is a peer-to-peer service without central storage, we cannot monitor the content being transferred. However, any reported abuse may result in an immediate block of your IP address from our signaling servers.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Limitation of Liability</h2>
        <p>
          NodeFerry is provided "as is" and "as available", without any warranties of any kind, either express or implied. We make no warranties regarding the reliability, accuracy, or availability of the service. We shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the service, network failures, or any file transfers made through it. You use this service entirely at your own risk.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Refund Policy</h2>
        <p>
          NodeFerry offers a Pay-As-You-Go premium credit system for transferring files larger than our free limit. Because these credits are digital goods and are used instantly to cover our infrastructure costs (Cloudflare R2 bandwidth and storage), <strong>all credit purchases are strictly non-refundable</strong>.
        </p>
        <p className="mt-4">
          If you experience a technical failure on our end that caused a failed transfer while still deducting your credits, please contact our support team. We will review such cases individually and may issue replacement credits to your account at our sole discretion. We do not issue cash refunds.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">5. Modifications to the Service and Terms</h2>
        <p>
          We reserve the right to modify or discontinue the hosted service at any time without notice. We also reserve the right to update these Terms & Conditions. Continued use of the service after such changes constitutes your consent to the changes.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">6. Contact Us</h2>
        <p>
          If you have any questions about these Terms, Conditions, or our Refund Policy, please contact us at: <a href="mailto:support@nodeferry.com" className="text-blue-600 font-bold hover:underline">support@nodeferry.com</a>.
        </p>
      </div>
    </div>
  );
}
