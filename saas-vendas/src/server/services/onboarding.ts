import 'server-only';
import { db, inserir } from '../db/conexao';
import { prepararBanco } from '../db/preparar';
import { agora } from '@/domain/datas';
import { RegraNegocioError, type TipoPagamento } from '@/domain/tipos';
import type { z } from 'zod';
import type { onboardingSchema } from '@/domain/validacao';
import type { Sessao } from '../sessao';
import { obterEmpresa } from '../contexto';

export interface Setor { id: number; nome: string; icone: string; categoriasSugeridas: string[] }

/** As 5 formas de pagamento padrão, com taxa zero para o usuário ajustar. */
export const FORMAS_PADRAO: { tipo: TipoPagamento; nome: string }[] = [
  { tipo: 'PIX', nome: 'Pix' },
  { tipo: 'DINHEIRO', nome: 'Dinheiro' },
  { tipo: 'DEBITO', nome: 'Débito' },
  { tipo: 'CREDITO', nome: 'Crédito' },
  { tipo: 'CREDIARIO', nome: 'Crediário' }
];

export async function listarSetores(): Promise<Setor[]> {
  await prepararBanco();
  const linhas = await db().selectFrom('Setor').selectAll().orderBy('Ordem').execute();
  return linhas.map(s => ({ id: s.Id, nome: s.Nome, icone: s.Icone, categoriasSugeridas: s.CategoriasSugeridas.split(';').map(x => x.trim()).filter(Boolean) }));
}

/** Setor escolhido cria as categorias sugeridas; cria as 5 formas padrão e o 1º produto (opcional). */
export async function concluirOnboarding(s: Sessao, dados: z.infer<typeof onboardingSchema>) {
  const empresa = await obterEmpresa(s.empresaId);
  if (empresa.onboardingConcluido) throw new RegraNegocioError('A configuração inicial já foi feita. Ajuste os dados em Configurações.');
  const setor = (await listarSetores()).find(x => x.id === dados.setorId);
  if (!setor) throw new RegraNegocioError('Escolha o setor do seu negócio.');

  await db().transaction().execute(async trx => {
    await trx.updateTable('Empresa').set({ Nome: dados.nomeNegocio.trim(), SetorId: setor.id }).where('Id', '=', s.empresaId).execute();

    let primeiraCategoria: number | null = null;
    for (const nome of setor.categoriasSugeridas) {
      const id = await inserir(trx, 'Categoria', { EmpresaId: s.empresaId, Nome: nome, Ativo: 1 });
      primeiraCategoria ??= id;
    }

    let ordem = 0;
    for (const padrao of FORMAS_PADRAO) {
      const informada = dados.formas.find(f => f.tipo === padrao.tipo);
      await inserir(trx, 'FormaPagamento', {
        EmpresaId: s.empresaId, Tipo: padrao.tipo, Nome: padrao.nome, TaxaPercentual: informada?.taxaPercentual ?? 0,
        TaxaFixa: 0, Ativo: informada?.ativo === false ? 0 : 1, Ordem: ++ordem
      });
    }

    if (dados.produto) {
      await inserir(trx, 'Produto', {
        EmpresaId: s.empresaId, Nome: dados.produto.nome, Custo: dados.produto.custo, PrecoVenda: dados.produto.preco,
        CategoriaId: primeiraCategoria, Estoque: 0, EstoqueMinimo: 0, Ativo: 1, DataCadastro: agora()
      });
    }

    await trx.updateTable('Empresa').set({ OnboardingConcluido: 1 }).where('Id', '=', s.empresaId).execute();
  });
}
