'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAcao } from '@/app/acoes/auth';
import { Campo, Enviar, ResumoErro } from '@/components/Formulario';

export function FormLogin({ returnUrl }: { returnUrl: string }) {
  const [estado, acao] = useActionState(loginAcao, null);
  const e = estado && !estado.ok ? estado.campos ?? {} : {};
  return (
    <form action={acao} className="mt-6 space-y-4" noValidate>
      <ResumoErro estado={estado} />
      <input type="hidden" name="returnUrl" value={returnUrl} />
      <Campo rotulo="E-mail" nome="email" type="email" inputMode="email" autoComplete="username" autoFocus erro={e.email} />
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="senha" className="rotulo">Senha</label>
          <Link href="/recuperar-senha" className="mb-1.5 text-xs font-semibold text-marca-700">Esqueci minha senha</Link>
        </div>
        <input id="senha" name="senha" type="password" autoComplete="current-password" className={`campo ${e.senha ? 'campo-erro' : ''}`} />
        {e.senha && <span className="erro-campo">{e.senha}</span>}
      </div>
      <label className="flex items-center gap-2.5 text-sm text-slate-600">
        <input type="checkbox" name="lembrar" defaultChecked className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500" />
        Lembrar de mim
      </label>
      <Enviar className="btn-primario btn-lg w-full" pendente="Entrando…">Entrar</Enviar>
    </form>
  );
}
