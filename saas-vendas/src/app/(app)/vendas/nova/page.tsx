import { redirect } from 'next/navigation';
import { exigirSessao } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { buscarProdutosVenda, listarFormas } from '@/server/services/cadastros';
import { hoje, somarDias } from '@/domain/datas';
import { Pdv } from './Pdv';

export const metadata = { title: 'Nova venda' };
export const dynamic = 'force-dynamic';

/** T07 — Nova venda (PDV). Trial ou assinatura vencida: vai para a tela de bloqueio. */
export default async function NovaVenda() {
  const s = await exigirSessao();
  const empresa = await obterEmpresa(s.empresaId);
  if (!empresa.assinaturaAtiva) redirect('/assinatura/bloqueio');
  const formas = (await listarFormas(s, true)).filter(f => empresa.temRecursosPro || f.tipo !== 'CREDIARIO');
  return <Pdv produtos={await buscarProdutosVenda(s, null, 60)} formas={formas} dono={s.perfil === 'DONO'} hoje={hoje()} vencimentoPadrao={somarDias(hoje(), 30)} />;
}
