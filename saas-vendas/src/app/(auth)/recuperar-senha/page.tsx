import Link from 'next/link';
import { tokenValido } from '@/server/services/auth';
import { FormEsqueci, FormRedefinir } from './Formularios';

export const metadata = { title: 'Recuperar senha' };
export const dynamic = 'force-dynamic';

export default async function RecuperarSenha({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (token && (await tokenValido(token))) {
    return (
      <>
        <h1 className="text-2xl font-extrabold">Criar nova senha</h1>
        <p className="mt-1 text-sm text-slate-500">Mínimo de 8 caracteres, com letras e números.</p>
        <FormRedefinir token={token} />
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-extrabold">Recuperar senha</h1>
      {token && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Este link expirou ou já foi usado. Peça um novo.</div>}
      <p className="mt-2 text-sm text-slate-500">Informe seu e-mail e enviaremos um link (válido por 1 hora) para criar uma senha nova.</p>
      <FormEsqueci />
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-marca-700">Voltar para o login</Link></p>
    </>
  );
}
