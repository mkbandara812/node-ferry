import { Metadata } from 'next';
import MainApp from '@/components/MainApp';

export const metadata: Metadata = {
  title: 'NodeFerry - Fast & Secure P2P File Sharing',
  description: 'Send large files instantly directly from your browser. NodeFerry offers fast, secure, and peer-to-peer file sharing with zero knowledge encryption.',
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <MainApp />;
}
