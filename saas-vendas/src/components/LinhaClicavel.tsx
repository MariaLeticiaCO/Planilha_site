'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export function LinhaClicavel({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return <tr className="cursor-pointer" onClick={() => router.push(href)}>{children}</tr>;
}
