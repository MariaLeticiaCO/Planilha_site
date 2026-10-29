import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from '@/components/Toaster';
import { RegistrarSW } from '@/components/RegistrarSW';
import './globals.css';

const texto = Inter({ subsets: ['latin'], variable: '--fonte-texto', display: 'swap' });
const titulo = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--fonte-titulo', weight: ['600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Controle de Vendas — lucro de verdade', template: '%s · Controle de Vendas' },
  description: 'Saiba quanto você lucra de verdade: vendas, crediário e estoque do seu pequeno negócio no celular.',
  applicationName: 'Controle de Vendas',
  appleWebApp: { capable: true, title: 'Vendas', statusBarStyle: 'default' },
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: '/icons/apple-touch-icon.png' }
};

export const viewport: Viewport = { themeColor: '#7c3aed', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${texto.variable} ${titulo.variable}`}>
      <body className="min-h-screen font-sans">
        <Toaster />
        <RegistrarSW />
        {children}
      </body>
    </html>
  );
}
