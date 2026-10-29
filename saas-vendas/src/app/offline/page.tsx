import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Sem internet' };

export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-sm p-8 text-center">
        <WifiOff className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-xl font-bold">Você está sem internet</h1>
        <p className="mt-2 text-slate-600">Assim que a conexão voltar, é só recarregar a página.</p>
      </div>
    </div>
  );
}
