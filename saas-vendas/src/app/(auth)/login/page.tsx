import Link from 'next/link';
import { FormLogin } from './FormLogin';

export const metadata = { title: 'Entrar' };

export default async function Login({ searchParams }: { searchParams: Promise<{ returnUrl?: string }> }) {
  const { returnUrl } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">Bom te ver de novo!</p>
      <FormLogin returnUrl={returnUrl ?? ''} />
      <p className="mt-6 text-center text-sm text-slate-600">Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-marca-700">Teste grátis 7 dias</Link></p>
    </>
  );
}
