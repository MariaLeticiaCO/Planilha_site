import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Drivers nativos/Node ficam fora do bundle das funções da Vercel.
  serverExternalPackages: ['tedious', 'better-sqlite3', 'pdfkit', 'exceljs'],
  poweredByHeader: false,
  // Fontes padrão do PDFKit precisam ir junto para as funções da Vercel.
  outputFileTracingIncludes: { '/**': ['./node_modules/pdfkit/js/data/**'] },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
        ]
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }
    ];
  }
};

export default nextConfig;
