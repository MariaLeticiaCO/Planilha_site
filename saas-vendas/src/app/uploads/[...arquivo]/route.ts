import fs from 'node:fs/promises';
import path from 'node:path';
import { PASTA_LOCAL } from '@/server/infra/armazenamento';

const TIPOS: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Serve as imagens gravadas localmente (sem Vercel Blob). */
export async function GET(_: Request, { params }: { params: Promise<{ arquivo: string[] }> }) {
  const { arquivo } = await params;
  const caminho = path.resolve(PASTA_LOCAL, ...arquivo);
  const tipo = TIPOS[path.extname(caminho).toLowerCase()];
  if (!caminho.startsWith(PASTA_LOCAL + path.sep) || !tipo) return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(await fs.readFile(caminho)), { headers: { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
