'use client';

import { useEffect } from 'react';

/** PWA: registra o service worker (app instalável e página offline). */
export function RegistrarSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
