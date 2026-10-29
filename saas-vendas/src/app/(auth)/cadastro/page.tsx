import Link from 'next/link';
import { FormCadastro } from './FormCadastro';

export const metadata = { title: 'Criar conta' };

export default function Cadastro() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Teste grátis por 7 dias</h1>
      <p className="mt-1 text-sm text-slate-500">Sem cartão. Tudo do plano Pro liberado.</p>
      <FormCadastro />
      <p className="mt-6 text-center text-sm text-slate-600">Já tem conta? <Link href="/login" className="font-semibold text-marca-700">Entrar</Link></p>
    </>
  );
}
