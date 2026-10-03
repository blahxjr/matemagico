import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MateMágico Champions',
  description: 'Foundation workspace for MateMágico Champions.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
