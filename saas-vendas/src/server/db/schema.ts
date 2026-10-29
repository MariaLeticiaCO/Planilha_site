import type { ColumnType, Generated } from 'kysely';

/**
 * Tipos das 10 tabelas e da view do controle_vendas_schema.sql (o mesmo banco da versão .NET).
 * Datas trafegam como texto "yyyy-MM-dd HH:mm:ss" (hora de Brasília); bits como 0/1.
 */

type Id = Generated<number>;
type Bit = ColumnType<boolean | number, number | undefined, number>;
type Data = ColumnType<Date | string, string, string>;
type DataNula = ColumnType<Date | string | null, string | null | undefined, string | null>;
/** Coluna calculada pelo banco (somente leitura). */
type Calculada = ColumnType<number, never, never>;

export interface SetorTabela {
  Id: Id;
  Nome: string;
  Icone: string;
  CategoriasSugeridas: string;
  Ordem: number;
}

export interface EmpresaTabela {
  Id: Id;
  Nome: string;
  SetorId: number | null;
  Telefone: string | null;
  LogoUrl: string | null;
  Plano: string;
  StatusAssinatura: string;
  DataFimTrial: Data;
  DataFimAssinatura: DataNula;
  GatewayClienteId: string | null;
  GatewayAssinaturaId: string | null;
  PermitirEstoqueNegativo: Bit;
  OnboardingConcluido: Bit;
  DataCadastro: Data;
}

export interface UsuarioTabela {
  Id: Id;
  EmpresaId: number;
  Nome: string;
  Email: string;
  Telefone: string | null;
  SenhaHash: string;
  Perfil: string;
  Ativo: Bit;
  TentativasFalhas: number;
  BloqueadoAte: DataNula;
  TokenRecuperacaoHash: string | null;
  TokenExpiraEm: DataNula;
  AceiteTermosEm: DataNula;
  UltimoAcesso: DataNula;
  DataCadastro: Data;
}

export interface CategoriaTabela {
  Id: Id;
  EmpresaId: number;
  Nome: string;
  Ativo: Bit;
}

export interface ProdutoTabela {
  Id: Id;
  EmpresaId: number;
  CategoriaId: number | null;
  Codigo: string | null;
  Nome: string;
  Custo: number;
  PrecoVenda: number;
  Estoque: number;
  EstoqueMinimo: number;
  MargemPercentual: Calculada;
  FotoUrl: string | null;
  Ativo: Bit;
  DataCadastro: Data;
}

export interface FormaPagamentoTabela {
  Id: Id;
  EmpresaId: number;
  Tipo: string;
  Nome: string;
  TaxaPercentual: number;
  TaxaFixa: number;
  Ativo: Bit;
  Ordem: number;
}

export interface ClienteTabela {
  Id: Id;
  EmpresaId: number;
  Nome: string;
  Telefone: string | null;
  Documento: string | null;
  Observacao: string | null;
  Ativo: Bit;
  DataCadastro: Data;
}

export interface VendaTabela {
  Id: Id;
  EmpresaId: number;
  UsuarioId: number;
  ClienteId: number | null;
  FormaPagamentoId: number;
  DataVenda: Data;
  ValorBruto: number;
  Desconto: number;
  ValorTaxa: number;
  CustoTotal: number;
  ValorLiquido: Calculada;
  Lucro: Calculada;
  Status: string;
  Observacao: string | null;
  DataCancelamento: DataNula;
}

export interface ItemVendaTabela {
  Id: Id;
  EmpresaId: number;
  VendaId: number;
  ProdutoId: number;
  Quantidade: number;
  PrecoUnitario: number;
  CustoUnitario: number;
}

export interface ParcelaCrediarioTabela {
  Id: Id;
  EmpresaId: number;
  VendaId: number;
  ClienteId: number;
  Numero: number;
  TotalParcelas: number;
  Valor: number;
  DataVencimento: Data;
  DataPagamento: DataNula;
  ValorPago: number | null;
  Status: string;
}

export interface ParcelaView {
  Id: number;
  EmpresaId: number;
  VendaId: number;
  ClienteId: number;
  ClienteNome: string;
  ClienteTelefone: string | null;
  Numero: number;
  TotalParcelas: number;
  Valor: number;
  DataVencimento: Date | string;
  DataPagamento: Date | string | null;
  ValorPago: number | null;
  Situacao: string;
  DiasAtraso: number;
}

export interface Banco {
  Setor: SetorTabela;
  Empresa: EmpresaTabela;
  Usuario: UsuarioTabela;
  Categoria: CategoriaTabela;
  Produto: ProdutoTabela;
  FormaPagamento: FormaPagamentoTabela;
  Cliente: ClienteTabela;
  Venda: VendaTabela;
  ItemVenda: ItemVendaTabela;
  ParcelaCrediario: ParcelaCrediarioTabela;
  vw_ParcelasCrediario: ParcelaView;
}
