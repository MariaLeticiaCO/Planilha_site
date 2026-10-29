import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-sm p-8 text-center">
        <p className="font-display text-6xl font-extrabold text-marca-600">404</p>
        <h1 className="mt-2 text-xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-slate-600">O endereço que você abriu não existe ou foi movido.</p>
        <Link href="/" className="btn-primario mt-6 w-full">Voltar ao início</Link>
      </div>
    </div>
  );
}
