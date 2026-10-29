import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Controle de Vendas',
    short_name: 'Vendas',
    description: 'Saiba quanto você lucra de verdade: vendas, crediário e estoque no celular.',
    lang: 'pt-BR',
    start_url: '/painel?origem=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f5fb',
    theme_color: '#7c3aed',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Nova venda', short_name: 'Vender', url: '/vendas/nova', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Crediário', url: '/crediario', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
    ]
  };
}
