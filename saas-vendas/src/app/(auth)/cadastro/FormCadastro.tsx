'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { cadastrarAcao } from '@/app/acoes/auth';
import { Campo, CampoTelefone, Enviar, ResumoErro } from '@/components/Formulario';

export function FormCadastro() {
  const [estado, acao] = useActionState(cadastrarAcao, null);
  const e = estado && !estado.ok ? estado.campos ?? {} : {};
  return (
    <form action={acao} className="mt-6 space-y-4" noValidate>
      <ResumoErro estado={estado} />
      <Campo rotulo="Seu nome" nome="nome" autoComplete="name" autoFocus erro={e.nome} />
      <Campo rotulo="E-mail" nome="email" type="email" inputMode="email" autoComplete="email" erro={e.email} />
      <CampoTelefone rotulo="WhatsApp" nome="whatsapp" erro={e.whatsapp} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Senha" nome="senha" type="password" autoComplete="new-password" erro={e.senha} />
        <Campo rotulo="Confirme a senha" nome="confirmarSenha" type="password" autoComplete="new-password" erro={e.confirmarSenha} />
      </div>
      <p className="dica -mt-2">Mínimo de 8 caracteres, com letras e números.</p>
      <div>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" name="aceiteTermos" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500" />
          <span>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-marca-700 underline">termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-marca-700 underline">política de privacidade</Link>.</span>
        </label>
        {e.aceiteTermos && <span className="erro-campo">{e.aceiteTermos}</span>}
      </div>
      <Enviar className="btn-primario btn-lg w-full" pendente="Criando sua conta…">Criar minha conta</Enviar>
    </form>
  );
}
