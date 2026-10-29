'use client';

import { useActionState } from 'react';
import { salvarClienteAcao } from '@/app/acoes/cadastros';
import { Campo, CampoDocumento, CampoTelefone, Enviar, ResumoErro } from '@/components/Formulario';

type Cliente = { id: number; nome: string; telefone: string | null; documento: string | null; observacao: string | null };

export function FormCliente({ cliente }: { cliente: Cliente | null }) {
  const [estado, acao] = useActionState(salvarClienteAcao, null);
  const e = estado && !estado.ok ? estado.campos ?? {} : {};
  return (
    <form action={acao} className="card-p max-w-2xl space-y-4" noValidate>
      <ResumoErro estado={estado} />
      <input type="hidden" name="id" value={cliente?.id ?? ''} />
      <Campo rotulo="Nome" nome="nome" defaultValue={cliente?.nome} autoFocus={!cliente} erro={e.nome} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTelefone rotulo="WhatsApp" nome="telefone" valorInicial={cliente?.telefone} erro={e.telefone} />
        <CampoDocumento rotulo={<>CPF/CNPJ <span className="font-normal text-slate-400">(opcional)</span></>} nome="documento" valorInicial={cliente?.documento} erro={e.documento} />
      </div>
      <div>
        <label htmlFor="observacao" className="rotulo">Observação</label>
        <textarea id="observacao" name="observacao" rows={3} defaultValue={cliente?.observacao ?? ''} className="campo" placeholder="Ex.: prefere receber cobrança à noite" maxLength={500} />
      </div>
      <Enviar className="btn-primario btn-lg w-full sm:w-auto" pendente="Salvando…">Salvar cliente</Enviar>
    </form>
  );
}
