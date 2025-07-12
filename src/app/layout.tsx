import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'e-Szerződés',
  description: 'Járműadásvételi szerződés és kiegészítő dokumentumok kitöltő és kezelő rendszer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
        {/* fontkit is now loaded dynamically in pdf-utils.ts */}
      </head>
      <body className="font-body antialiased text-[15px]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

    