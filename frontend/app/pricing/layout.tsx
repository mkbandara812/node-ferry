import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing Plans - Pay As You Go | NodeFerry',
  description: 'NodeFerry pricing. Pay only for what you use with our credit system for large file transfers.',
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
