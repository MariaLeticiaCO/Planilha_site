'use client';

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const regra = error.name === 'RegraNegocioError' || /não encontramos/i.test(error.message);
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="card max-w-sm p-8 text-center">
        <h1 className="text-xl font-bold">{regra ? 'Não foi possível abrir' : 'Algo deu errado'}</h1>
        <p className="mt-2 text-slate-600">{regra ? error.message : 'Já registramos o problema. Tente de novo em instantes.'}</p>
        <div className="mt-6 flex gap-2">
          <button onClick={reset} className="btn-secundario flex-1">Tentar de novo</button>
          <a href="/painel" className="btn-primario flex-1">Início</a>
        </div>
      </div>
    </div>
  );
}
