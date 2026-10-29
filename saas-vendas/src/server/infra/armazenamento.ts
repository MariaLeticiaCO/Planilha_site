import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { RegraNegocioError } from '@/domain/tipos';

export const TAMANHO_MAXIMO = 3 * 1024 * 1024;
export const PASTA_LOCAL = path.join(process.cwd(), 'uploads');

/**
 * Salva fotos de produto e logos. Na Vercel o disco é temporário, então usa o Vercel Blob
 * (BLOB_READ_WRITE_TOKEN). Sem token (desenvolvimento/demonstração), grava na pasta uploads/ e serve por /uploads/...
 */
export async function salvarImagem(arquivo: File, empresaId: number, pasta: 'produtos' | 'logo'): Promise<string> {
  if (arquivo.size > TAMANHO_MAXIMO) throw new RegraNegocioError('A imagem pode ter no máximo 3 MB.');
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const extensao = tipoImagem(bytes);
  if (!extensao) throw new RegraNegocioError('Envie uma imagem JPG, PNG ou WEBP.');
  const nome = `${empresaId}/${pasta}/${crypto.randomUUID()}.${extensao}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${nome}`, bytes, { access: 'public', contentType: `image/${extensao === 'jpg' ? 'jpeg' : extensao}` });
    return blob.url;
  }
  const destino = path.join(PASTA_LOCAL, nome);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, bytes);
  return `/uploads/${nome}`;
}

/** Confere a assinatura do arquivo, não só a extensão. */
function tipoImagem(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
