import { exigirSessao } from '@/server/sessao';
import { obterCliente } from '@/server/services/cadastros';
import { idValido, ou404 } from '@/server/paginas';
import { Cabecalho } from '@/components/ui';
import { FormCliente } from '../../FormCliente';

export const metadata = { title: 'Editar cliente' };
export const dynamic = 'force-dynamic';

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSessao();
  const id = idValido((await params).id);
  const c = await ou404(obterCliente(s, id));
  return (<><Cabecalho voltar={`/clientes/${id}`} titulo="Editar cliente" /><FormCliente cliente={c} /></>);
}
