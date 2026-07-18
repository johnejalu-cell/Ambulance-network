import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ambulance Network',
  description: 'Uganda MP ambulance hailing network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
