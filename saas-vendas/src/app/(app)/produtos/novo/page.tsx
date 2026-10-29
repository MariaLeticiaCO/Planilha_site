import { exigirDono } from '@/server/sessao';
import { listarCategorias } from '@/server/services/cadastros';
import { Cabecalho } from '@/components/ui';
import { FormProduto } from '../FormProduto';

export const metadata = { title: 'Novo produto' };
export const dynamic = 'force-dynamic';

/** T10 — Produto (cadastro). */
export default async function NovoProduto() {
  const s = await exigirDono();
  return (
    <>
      <Cabecalho voltar="/produtos" titulo="Novo produto" />
      <FormProduto produto={null} categorias={await listarCategorias(s, true)} />
    </>
  );
}
