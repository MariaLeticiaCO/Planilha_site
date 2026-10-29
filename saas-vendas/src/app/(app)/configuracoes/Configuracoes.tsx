'use client';

import { useActionState, useRef, useState } from 'react';
import { ImagePlus, KeyRound, LogOut, Store, Trash2, User, Users } from 'lucide-react';
import { alterarAtivoUsuarioAcao, convidarAcao, excluirContaAcao, salvarNegocioAcao, salvarPerfilAcao, trocarSenhaAcao } from '@/app/acoes/configuracoes';
import { sairAcao } from '@/app/acoes/auth';
import { Campo, CampoTelefone, Enviar, ResumoErro, useResultado } from '@/components/Formulario';
import { BotaoAcao } from '@/components/BotaoAcao';
import { Avatar } from '@/components/ui';
import { formatarData } from '@/domain/datas';

interface Props {
  dono: boolean;
  usuarioId: number;
  perfil: { nome: string; email: string; telefone: string | null };
  negocio: { nome: string; setorId: number | null; telefone: string | null; logoUrl: string | null; permitirEstoqueNegativo: boolean; limiteUsuarios: number };
  setores: { id: number; nome: string }[];
  usuarios: { id: number; nome: string; email: string; perfil: string; ativo: boolean; ultimoAcesso: string | null }[];
}

function Secao({ id, icone, titulo, children, perigo }: { id: string; icone: React.ReactNode; titulo: string; children: React.ReactNode; perigo?: boolean }) {
  return (
    <section id={id} className={`card-p scroll-mt-20 ${perigo ? 'border-rose-200' : ''}`}>
      <h2 className={`flex items-center gap-2 font-bold ${perigo ? 'text-rose-700' : ''}`}>{icone}{titulo}</h2>
      {children}
    </section>
  );
}

export function Configuracoes({ dono, perfil, negocio, setores, usuarios, usuarioId }: Props) {
  const [eNeg, aNeg] = useActionState(salvarNegocioAcao, null);
  const [ePer, aPer] = useActionState(salvarPerfilAcao, null);
  const [eSen, aSen] = useActionState(trocarSenhaAcao, null);
  const [eConv, aConv] = useActionState(convidarAcao, null);
  const [eExc, aExc] = useActionState(excluirContaAcao, null);
  const formSenha = useRef<HTMLFormElement>(null);
  const formConvite = useRef<HTMLFormElement>(null);
  const [logo, setLogo] = useState(negocio.logoUrl);
  useResultado(eNeg); useResultado(ePer); useResultado(eConv, () => formConvite.current?.reset());
  useResultado(eSen, () => formSenha.current?.reset());

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {dono && (
        <Secao id="negocio" icone={<Store className="h-5 w-5 text-marca-600" />} titulo="Dados do negócio">
          <form action={aNeg} className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="shrink-0 cursor-pointer" title="Logo">
                {logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logo} alt="Logo" className="h-16 w-16 rounded-2xl object-cover" />
                  : <span className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-[11px] text-slate-500"><ImagePlus className="h-5 w-5" />Logo</span>}
                <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setLogo(URL.createObjectURL(f)); }} />
              </label>
              <Campo className="flex-1" rotulo="Nome do negócio" nome="nome" defaultValue={negocio.nome} required maxLength={120} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="setorId" className="rotulo">Setor</label>
                <select id="setorId" name="setorId" defaultValue={negocio.setorId ?? ''} className="campo">{setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
              </div>
              <CampoTelefone rotulo="Telefone" nome="telefone" valorInicial={negocio.telefone} />
            </div>
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
              <input type="checkbox" name="permitirEstoqueNegativo" defaultChecked={negocio.permitirEstoqueNegativo} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-marca-600 focus:ring-marca-500" />
              <span><b>Permitir vender sem estoque</b><br /><span className="text-slate-500">Se desmarcar, a venda é bloqueada quando o estoque não é suficiente. Marcado, só mostra um aviso.</span></span>
            </label>
            <Enviar>Salvar negócio</Enviar>
          </form>
        </Secao>
      )}

      <Secao id="perfil" icone={<User className="h-5 w-5 text-marca-600" />} titulo="Meu perfil">
        <form action={aPer} className="mt-4 space-y-4">
          <Campo rotulo="Nome" nome="nome" defaultValue={perfil.nome} required />
          <Campo rotulo="E-mail" nome="email" type="email" defaultValue={perfil.email} required />
          <CampoTelefone rotulo="WhatsApp" nome="telefone" valorInicial={perfil.telefone} />
          <Enviar>Salvar perfil</Enviar>
        </form>
      </Secao>

      <Secao id="senha" icone={<KeyRound className="h-5 w-5 text-marca-600" />} titulo="Trocar senha">
        <form ref={formSenha} action={aSen} className="mt-4 space-y-4">
          <Campo rotulo="Senha atual" nome="senhaAtual" type="password" autoComplete="current-password" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nova senha" nome="novaSenha" type="password" autoComplete="new-password" required />
            <Campo rotulo="Confirme" nome="confirmarSenha" type="password" autoComplete="new-password" required />
          </div>
          <Enviar>Trocar senha</Enviar>
        </form>
      </Secao>

      {dono && (
        <Secao id="usuarios" icone={<Users className="h-5 w-5 text-marca-600" />} titulo="Usuários">
          <p className="mt-1 text-sm text-slate-500">Seu plano permite até {negocio.limiteUsuarios} {negocio.limiteUsuarios === 1 ? 'usuário' : 'usuários'}. Vendedores registram vendas, mas não veem lucro nem custo.</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {usuarios.map(u => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Avatar nome={u.nome} tamanho="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${u.ativo ? '' : 'text-slate-400 line-through'}`}>{u.nome} <span className={`ml-1 ${u.perfil === 'DONO' ? 'chip-marca' : 'chip-cinza'}`}>{u.perfil === 'DONO' ? 'Dono' : 'Vendedor'}</span></p>
                  <p className="truncate text-xs text-slate-500">{u.email} · {u.ultimoAcesso ? `último acesso ${formatarData(u.ultimoAcesso)}` : 'nunca entrou'}</p>
                </div>
                {u.perfil === 'VENDEDOR' && u.id !== usuarioId && (
                  <BotaoAcao acao={alterarAtivoUsuarioAcao.bind(null, u.id, !u.ativo)} className="btn-fantasma btn-sm">{u.ativo ? 'Desativar' : 'Reativar'}</BotaoAcao>
                )}
              </li>
            ))}
          </ul>
          <form ref={formConvite} action={aConv} className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input name="nome" className="campo" placeholder="Nome do vendedor" required aria-label="Nome do vendedor" />
            <input name="email" type="email" className="campo" placeholder="E-mail" required aria-label="E-mail do vendedor" />
            <Enviar>Convidar</Enviar>
          </form>
        </Secao>
      )}

      {dono && (
        <div className="lg:col-span-2">
          <Secao id="excluir" icone={<Trash2 className="h-5 w-5" />} titulo="Excluir conta" perigo>
            <p className="mt-1 text-sm text-slate-600">Apaga o negócio, os usuários, produtos, clientes, vendas e parcelas. Não dá para desfazer.</p>
            <form action={aExc} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={e => { if (!window.confirm('Tem certeza? Todos os dados serão apagados para sempre.')) e.preventDefault(); }}>
              <div className="sm:col-span-3"><ResumoErro estado={eExc} /></div>
              <input name="senha" type="password" className="campo" placeholder="Sua senha" required autoComplete="current-password" aria-label="Sua senha" />
              <input name="confirmacao" className="campo" placeholder="Digite EXCLUIR" required aria-label="Digite EXCLUIR para confirmar" />
              <Enviar className="btn-perigo">Excluir conta e dados</Enviar>
            </form>
          </Secao>
        </div>
      )}

      <form action={sairAcao} className="lg:hidden"><button className="btn-secundario w-full"><LogOut className="h-4 w-4" /> Sair</button></form>
    </div>
  );
}
