-- Versão SQLite do controle_vendas_schema.sql, usada SÓ no modo demonstração/testes locais
-- (DATABASE_PROVIDER=sqlite). Em produção o banco é o SQL Server do script principal.
-- Mesmas tabelas, colunas, colunas calculadas, view e setores.

CREATE TABLE Setor (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome TEXT NOT NULL,
  Icone TEXT NOT NULL DEFAULT '',
  CategoriasSugeridas TEXT NOT NULL DEFAULT '',
  Ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE Empresa (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome TEXT NOT NULL,
  SetorId INTEGER NULL REFERENCES Setor(Id),
  Telefone TEXT NULL,
  LogoUrl TEXT NULL,
  Plano TEXT NOT NULL DEFAULT 'TESTE' CHECK (Plano IN ('TESTE','BASICO','PRO')),
  StatusAssinatura TEXT NOT NULL DEFAULT 'TRIAL' CHECK (StatusAssinatura IN ('TRIAL','ATIVA','VENCIDA','CANCELADA')),
  DataFimTrial TEXT NOT NULL,
  DataFimAssinatura TEXT NULL,
  GatewayClienteId TEXT NULL,
  GatewayAssinaturaId TEXT NULL,
  PermitirEstoqueNegativo INTEGER NOT NULL DEFAULT 1,
  OnboardingConcluido INTEGER NOT NULL DEFAULT 0,
  DataCadastro TEXT NOT NULL DEFAULT (datetime('now','-3 hours'))
);

CREATE TABLE Usuario (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  Nome TEXT NOT NULL,
  Email TEXT NOT NULL UNIQUE,
  Telefone TEXT NULL,
  SenhaHash TEXT NOT NULL,
  Perfil TEXT NOT NULL DEFAULT 'DONO' CHECK (Perfil IN ('DONO','VENDEDOR')),
  Ativo INTEGER NOT NULL DEFAULT 1,
  TentativasFalhas INTEGER NOT NULL DEFAULT 0,
  BloqueadoAte TEXT NULL,
  TokenRecuperacaoHash TEXT NULL,
  TokenExpiraEm TEXT NULL,
  AceiteTermosEm TEXT NULL,
  UltimoAcesso TEXT NULL,
  DataCadastro TEXT NOT NULL DEFAULT (datetime('now','-3 hours'))
);

CREATE TABLE Categoria (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  Nome TEXT NOT NULL,
  Ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE Produto (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  CategoriaId INTEGER NULL REFERENCES Categoria(Id),
  Codigo TEXT NULL,
  Nome TEXT NOT NULL,
  Custo REAL NOT NULL DEFAULT 0 CHECK (Custo >= 0),
  PrecoVenda REAL NOT NULL DEFAULT 0 CHECK (PrecoVenda >= 0),
  Estoque INTEGER NOT NULL DEFAULT 0,
  EstoqueMinimo INTEGER NOT NULL DEFAULT 0,
  MargemPercentual REAL GENERATED ALWAYS AS (CASE WHEN PrecoVenda > 0 THEN ROUND((PrecoVenda - Custo) * 100.0 / PrecoVenda, 2) ELSE 0 END) STORED,
  FotoUrl TEXT NULL,
  Ativo INTEGER NOT NULL DEFAULT 1,
  DataCadastro TEXT NOT NULL DEFAULT (datetime('now','-3 hours'))
);

CREATE TABLE FormaPagamento (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  Tipo TEXT NOT NULL CHECK (Tipo IN ('PIX','DINHEIRO','DEBITO','CREDITO','CREDIARIO')),
  Nome TEXT NOT NULL,
  TaxaPercentual REAL NOT NULL DEFAULT 0,
  TaxaFixa REAL NOT NULL DEFAULT 0,
  Ativo INTEGER NOT NULL DEFAULT 1,
  Ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE Cliente (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  Nome TEXT NOT NULL,
  Telefone TEXT NULL,
  Documento TEXT NULL,
  Observacao TEXT NULL,
  Ativo INTEGER NOT NULL DEFAULT 1,
  DataCadastro TEXT NOT NULL DEFAULT (datetime('now','-3 hours'))
);

CREATE TABLE Venda (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  UsuarioId INTEGER NOT NULL REFERENCES Usuario(Id),
  ClienteId INTEGER NULL REFERENCES Cliente(Id),
  FormaPagamentoId INTEGER NOT NULL REFERENCES FormaPagamento(Id),
  DataVenda TEXT NOT NULL,
  ValorBruto REAL NOT NULL,
  Desconto REAL NOT NULL DEFAULT 0,
  ValorTaxa REAL NOT NULL DEFAULT 0,
  CustoTotal REAL NOT NULL DEFAULT 0,
  ValorLiquido REAL GENERATED ALWAYS AS (ROUND(ValorBruto - Desconto, 2)) STORED,
  Lucro REAL GENERATED ALWAYS AS (ROUND(ValorBruto - Desconto - ValorTaxa - CustoTotal, 2)) STORED,
  Status TEXT NOT NULL DEFAULT 'CONCLUIDA' CHECK (Status IN ('CONCLUIDA','CANCELADA')),
  Observacao TEXT NULL,
  DataCancelamento TEXT NULL,
  CHECK (Desconto >= 0 AND Desconto <= ValorBruto)
);

CREATE TABLE ItemVenda (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  VendaId INTEGER NOT NULL REFERENCES Venda(Id),
  ProdutoId INTEGER NOT NULL REFERENCES Produto(Id),
  Quantidade INTEGER NOT NULL CHECK (Quantidade > 0),
  PrecoUnitario REAL NOT NULL,
  CustoUnitario REAL NOT NULL
);

CREATE TABLE ParcelaCrediario (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  EmpresaId INTEGER NOT NULL REFERENCES Empresa(Id),
  VendaId INTEGER NOT NULL REFERENCES Venda(Id),
  ClienteId INTEGER NOT NULL REFERENCES Cliente(Id),
  Numero INTEGER NOT NULL,
  TotalParcelas INTEGER NOT NULL,
  Valor REAL NOT NULL CHECK (Valor > 0),
  DataVencimento TEXT NOT NULL,
  DataPagamento TEXT NULL,
  ValorPago REAL NULL,
  Status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (Status IN ('ABERTA','PAGA','CANCELADA'))
);

CREATE INDEX IX_Venda_Empresa_Data ON Venda (EmpresaId, DataVenda);
CREATE INDEX IX_Produto_Empresa_Ativo ON Produto (EmpresaId, Ativo);
CREATE INDEX IX_Cliente_Empresa_Nome ON Cliente (EmpresaId, Nome);
CREATE INDEX IX_Parcela_Empresa_Status_Venc ON ParcelaCrediario (EmpresaId, Status, DataVencimento);
CREATE INDEX IX_ItemVenda_Venda ON ItemVenda (VendaId);

CREATE VIEW vw_ParcelasCrediario AS
SELECT p.Id, p.EmpresaId, p.VendaId, p.ClienteId,
       c.Nome AS ClienteNome, c.Telefone AS ClienteTelefone,
       p.Numero, p.TotalParcelas, p.Valor, p.DataVencimento, p.DataPagamento, p.ValorPago,
       CASE WHEN p.Status = 'PAGA' THEN 'PAGA'
            WHEN date(p.DataVencimento) < date('now', '-3 hours') THEN 'ATRASADA'
            ELSE 'ABERTA' END AS Situacao,
       CASE WHEN p.Status = 'ABERTA' AND date(p.DataVencimento) < date('now', '-3 hours')
            THEN CAST(julianday(date('now', '-3 hours')) - julianday(date(p.DataVencimento)) AS INTEGER)
            ELSE 0 END AS DiasAtraso
FROM ParcelaCrediario p
JOIN Cliente c ON c.Id = p.ClienteId
WHERE p.Status <> 'CANCELADA';

INSERT INTO Setor (Nome, Icone, CategoriasSugeridas, Ordem) VALUES
 ('Moda', 'camiseta', 'Blusas;Calças;Vestidos;Acessórios', 1),
 ('Doces', 'bolo', 'Bolos;Doces finos;Salgados', 2),
 ('Cosméticos', 'batom', 'Maquiagem;Skincare;Cabelo;Perfumaria', 3),
 ('Revenda por catálogo', 'catalogo', 'Natura;Boticário;Avon;Outros', 4),
 ('Eletrônicos', 'celular', 'Capinhas;Carregadores;Fones;Acessórios', 5),
 ('Personalizados', 'presente', 'Canecas;Camisetas;Papelaria;Kits', 6),
 ('Outro', 'loja', 'Geral', 7);
