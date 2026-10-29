'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { esqueciSenhaAcao, redefinirSenhaAcao } from '@/app/acoes/auth';
import { Campo, Enviar, ResumoErro } from '@/components/Formulario';

export function FormEsqueci() {
  const [estado, acao] = useActionState(esqueciSenhaAcao, null);
  if (estado?.ok)
    return (
      <div className="mt-5 flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <MailCheck className="h-5 w-5 shrink-0" />
        <span>Se existir uma conta com <b>{estado.mensagem}</b>, enviamos um link para criar uma nova senha. Ele vale por 1 hora — confira também a caixa de spam.</span>
      </div>
    );
  const e = estado && !estado.ok ? estado.campos ?? {} : {};
  return (
    <form action={acao} className="mt-5 space-y-4" noValidate>
      <Campo rotulo="E-mail" nome="email" type="email" inputMode="email" autoComplete="email" autoFocus erro={e.email} />
      <Enviar className="btn-primario btn-lg w-full" pendente="Enviando…">Enviar link</Enviar>
    </form>
  );
}

export function FormRedefinir({ token }: { token: string }) {
  const [estado, acao] = useActionState(redefinirSenhaAcao, null);
  const e = estado && !estado.ok ? estado.campos ?? {} : {};
  return (
    <form action={acao} className="mt-6 space-y-4" noValidate>
      <ResumoErro estado={estado} />
      <input type="hidden" name="token" value={token} />
      <Campo rotulo="Nova senha" nome="senha" type="password" autoComplete="new-password" autoFocus erro={e.senha} />
      <Campo rotulo="Confirme a nova senha" nome="confirmarSenha" type="password" autoComplete="new-password" erro={e.confirmarSenha} />
      <Enviar className="btn-primario btn-lg w-full" pendente="Salvando…">Salvar senha</Enviar>
    </form>
  );
}
