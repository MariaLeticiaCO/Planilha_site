import { exigirDono } from '@/server/sessao';
import { listarCategorias } from '@/server/services/cadastros';
import { Cabecalho } from '@/components/ui';
import { Categorias } from './Categorias';

export const metadata = { title: 'Categorias' };
export const dynamic = 'force-dynamic';

/** T11 — Categorias. */
export default async function PaginaCategorias() {
  const s = await exigirDono();
  return (
    <>
      <Cabecalho titulo="Categorias" subtitulo="Agrupe seus produtos para filtrar e ver o lucro por categoria." />
      <Categorias lista={await listarCategorias(s)} />
    </>
  );
}
