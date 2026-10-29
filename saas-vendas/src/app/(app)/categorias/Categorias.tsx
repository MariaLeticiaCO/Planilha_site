'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tag } from 'lucide-react';
import { alterarAtivoCategoriaAcao, criarCategoriaAcao, renomearCategoriaAcao } from '@/app/acoes/cadastros';
import { Enviar, useResultado } from '@/components/Formulario';
import { BotaoAcao } from '@/components/BotaoAcao';
import { toast } from '@/components/Toaster';
import type { CategoriaItem } from '@/server/services/cadastros';

export function Categorias({ lista }: { lista: CategoriaItem[] }) {
  const [estado, acao] = useActionState(criarCategoriaAcao, null);
  const form = useRef<HTMLFormElement>(null);
  useResultado(estado, () => form.current?.reset());
  return (
    <>
      <form ref={form} action={acao} className="card-p flex gap-2">
        <input name="nome" className="campo" placeholder="Nova categoria" maxLength={60} required aria-label="Nome da nova categoria" />
        <Enviar className="btn-primario shrink-0"><Plus className="h-4 w-4" /> Criar</Enviar>
      </form>
      <ul className="card mt-4 divide-y divide-slate-100">
        {lista.length === 0 && <li className="p-8 text-center text-slate-500">Nenhuma categoria ainda.</li>}
        {lista.map(c => <Linha key={c.id} c={c} />)}
      </ul>
    </>
  );
}

function Linha({ c }: { c: CategoriaItem }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(c.nome);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const salvar = () => iniciar(async () => {
    const r = await renomearCategoriaAcao(c.id, nome);
    if (!r.ok) return toast(r.erro, 'erro');
    toast(r.mensagem!); setEditando(false); router.refresh();
  });
  return (
    <li className={`p-3 sm:p-4 ${c.ativo ? '' : 'bg-slate-50/70'}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-marca-600"><Tag className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${c.ativo ? '' : 'text-slate-400 line-through'}`}>{c.nome}</p>
          <p className="text-xs text-slate-500">{c.qtdProdutos} {c.qtdProdutos === 1 ? 'produto ativo' : 'produtos ativos'}</p>
        </div>
        <button type="button" className="btn-secundario btn-sm" onClick={() => setEditando(v => !v)}>Renomear</button>
        <BotaoAcao acao={alterarAtivoCategoriaAcao.bind(null, c.id, !c.ativo)} className={c.ativo ? 'btn-fantasma btn-sm' : 'btn-suave btn-sm'}>{c.ativo ? 'Desativar' : 'Reativar'}</BotaoAcao>
      </div>
      {editando && (
        <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); salvar(); }}>
          <input value={nome} onChange={e => setNome(e.target.value)} className="campo" maxLength={60} autoFocus aria-label="Novo nome" />
          <button className="btn-primario btn-sm" disabled={pendente}>Salvar</button>
        </form>
      )}
    </li>
  );
}
