import { exigirSessao } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { listarSetores } from '@/server/services/onboarding';
import { listarUsuarios, obterPerfil } from '@/server/services/configuracoes';
import { Cabecalho } from '@/components/ui';
import { Configuracoes } from './Configuracoes';

export const metadata = { title: 'Configurações' };
export const dynamic = 'force-dynamic';

/** T16 — Configurações. O Vendedor só vê o próprio perfil e a troca de senha. */
export default async function PaginaConfiguracoes() {
  const s = await exigirSessao();
  const dono = s.perfil === 'DONO';
  const [perfil, empresa, setores, usuarios] = await Promise.all([
    obterPerfil(s), obterEmpresa(s.empresaId), dono ? listarSetores() : Promise.resolve([]), dono ? listarUsuarios(s) : Promise.resolve([])
  ]);
  return (
    <>
      <Cabecalho titulo="Configurações" />
      <Configuracoes dono={dono} perfil={perfil} setores={setores} usuarios={usuarios} usuarioId={s.usuarioId}
        negocio={{ nome: empresa.nome, setorId: empresa.setorId, telefone: empresa.telefone, logoUrl: empresa.logoUrl, permitirEstoqueNegativo: empresa.permitirEstoqueNegativo, limiteUsuarios: empresa.limiteUsuarios }} />
    </>
  );
}
