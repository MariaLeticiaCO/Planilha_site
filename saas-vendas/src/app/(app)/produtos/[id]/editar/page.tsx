import { exigirDono } from '@/server/sessao';
import { listarCategorias, obterProduto } from '@/server/services/cadastros';
import { idValido, ou404 } from '@/server/paginas';
import { Cabecalho } from '@/components/ui';
import { FormProduto } from '../../FormProduto';

export const metadata = { title: 'Editar produto' };
export const dynamic = 'force-dynamic';

/** T10 — Produto (edição). */
export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirDono();
  const produto = await ou404(obterProduto(s, idValido((await params).id)));
  return (
    <>
      <Cabecalho voltar="/produtos" titulo="Editar produto" subtitulo={produto.ativo ? undefined : 'Produto inativo'} />
      <FormProduto produto={produto} categorias={await listarCategorias(s, true)} />
    </>
  );
}
