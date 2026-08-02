import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - NodeFerry',
  description: 'Get in touch with the NodeFerry team. Have a question, feedback, or need support? Drop us a line.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
