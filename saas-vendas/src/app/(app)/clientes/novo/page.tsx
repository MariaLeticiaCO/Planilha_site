import { exigirSessao } from '@/server/sessao';
import { Cabecalho } from '@/components/ui';
import { FormCliente } from '../FormCliente';

export const metadata = { title: 'Novo cliente' };

export default async function NovoCliente() {
  await exigirSessao();
  return (<><Cabecalho voltar="/clientes" titulo="Novo cliente" /><FormCliente cliente={null} /></>);
}
