// Cópia de database/controle_vendas_schema.sql embutida no código, para o app conseguir criar o banco
// sozinho na Vercel (onde o arquivo .sql não vai junto com as funções).
// Não edite à mão: o teste tests/schema.test.ts garante que é idêntica ao arquivo .sql.
export const SCRIPT_SCHEMA = `/* =====================================================================
   SaaS Controle de Vendas — schema do banco (SQL Server 2022 / Azure SQL)
   10 tabelas, 1 view, 4 procedures e índices.
   Rode no SSMS conectado ao banco ControleVendas (crie o banco antes):
       CREATE DATABASE ControleVendas;
   O script é idempotente nas procedures/view (CREATE OR ALTER) e só cria
   as tabelas que ainda não existem.
   ===================================================================== */

SET NOCOUNT ON;
GO

/* ---------- 1. Setor (global, usado no onboarding) ---------- */
IF OBJECT_ID('dbo.Setor') IS NULL
CREATE TABLE dbo.Setor (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    Nome                NVARCHAR(60)  NOT NULL,
    Icone               NVARCHAR(30)  NOT NULL DEFAULT N'',
    CategoriasSugeridas NVARCHAR(400) NOT NULL DEFAULT N'',
    Ordem               INT           NOT NULL DEFAULT 0
);
GO

/* ---------- 2. Empresa (cada cliente do SaaS) ---------- */
IF OBJECT_ID('dbo.Empresa') IS NULL
CREATE TABLE dbo.Empresa (
    Id                      INT IDENTITY(1,1) PRIMARY KEY,
    Nome                    NVARCHAR(120) NOT NULL,
    SetorId                 INT           NULL REFERENCES dbo.Setor(Id),
    Telefone                NVARCHAR(20)  NULL,
    LogoUrl                 NVARCHAR(300) NULL,
    Plano                   VARCHAR(10)   NOT NULL DEFAULT 'TESTE'
                            CHECK (Plano IN ('TESTE','BASICO','PRO')),
    StatusAssinatura        VARCHAR(10)   NOT NULL DEFAULT 'TRIAL'
                            CHECK (StatusAssinatura IN ('TRIAL','ATIVA','VENCIDA','CANCELADA')),
    DataFimTrial            DATETIME2(0)  NOT NULL,
    DataFimAssinatura       DATETIME2(0)  NULL,
    GatewayClienteId        NVARCHAR(60)  NULL,
    GatewayAssinaturaId     NVARCHAR(60)  NULL,
    PermitirEstoqueNegativo BIT           NOT NULL DEFAULT 1,
    OnboardingConcluido     BIT           NOT NULL DEFAULT 0,
    DataCadastro            DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 3. Usuario ---------- */
IF OBJECT_ID('dbo.Usuario') IS NULL
CREATE TABLE dbo.Usuario (
    Id                    INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId             INT           NOT NULL REFERENCES dbo.Empresa(Id),
    Nome                  NVARCHAR(120) NOT NULL,
    Email                 NVARCHAR(160) NOT NULL,
    Telefone              NVARCHAR(20)  NULL,
    SenhaHash             NVARCHAR(300) NOT NULL,
    Perfil                VARCHAR(10)   NOT NULL DEFAULT 'DONO'
                          CHECK (Perfil IN ('DONO','VENDEDOR')),
    Ativo                 BIT           NOT NULL DEFAULT 1,
    TentativasFalhas      INT           NOT NULL DEFAULT 0,
    BloqueadoAte          DATETIME2(0)  NULL,
    TokenRecuperacaoHash  VARCHAR(64)   NULL,
    TokenExpiraEm         DATETIME2(0)  NULL,
    AceiteTermosEm        DATETIME2(0)  NULL,
    UltimoAcesso          DATETIME2(0)  NULL,
    DataCadastro          DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Usuario_Email UNIQUE (Email)
);
GO

/* ---------- 4. Categoria ---------- */
IF OBJECT_ID('dbo.Categoria') IS NULL
CREATE TABLE dbo.Categoria (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId INT          NOT NULL REFERENCES dbo.Empresa(Id),
    Nome      NVARCHAR(60) NOT NULL,
    Ativo     BIT          NOT NULL DEFAULT 1
);
GO

/* ---------- 5. Produto ---------- */
IF OBJECT_ID('dbo.Produto') IS NULL
CREATE TABLE dbo.Produto (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId        INT           NOT NULL REFERENCES dbo.Empresa(Id),
    CategoriaId      INT           NULL REFERENCES dbo.Categoria(Id),
    Codigo           NVARCHAR(40)  NULL,
    Nome             NVARCHAR(120) NOT NULL,
    Custo            DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (Custo >= 0),
    PrecoVenda       DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (PrecoVenda >= 0),
    Estoque          INT           NOT NULL DEFAULT 0,
    EstoqueMinimo    INT           NOT NULL DEFAULT 0,
    MargemPercentual AS CAST(CASE WHEN PrecoVenda > 0
                          THEN ROUND((PrecoVenda - Custo) / PrecoVenda * 100, 2)
                          ELSE 0 END AS DECIMAL(7,2)) PERSISTED,
    FotoUrl          NVARCHAR(300) NULL,
    Ativo            BIT           NOT NULL DEFAULT 1,
    DataCadastro     DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 6. FormaPagamento ---------- */
IF OBJECT_ID('dbo.FormaPagamento') IS NULL
CREATE TABLE dbo.FormaPagamento (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId      INT           NOT NULL REFERENCES dbo.Empresa(Id),
    Tipo           VARCHAR(10)   NOT NULL
                   CHECK (Tipo IN ('PIX','DINHEIRO','DEBITO','CREDITO','CREDIARIO')),
    Nome           NVARCHAR(40)  NOT NULL,
    TaxaPercentual DECIMAL(5,2)  NOT NULL DEFAULT 0 CHECK (TaxaPercentual BETWEEN 0 AND 100),
    TaxaFixa       DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (TaxaFixa >= 0),
    Ativo          BIT           NOT NULL DEFAULT 1,
    Ordem          INT           NOT NULL DEFAULT 0
);
GO

/* ---------- 7. Cliente ---------- */
IF OBJECT_ID('dbo.Cliente') IS NULL
CREATE TABLE dbo.Cliente (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId    INT           NOT NULL REFERENCES dbo.Empresa(Id),
    Nome         NVARCHAR(120) NOT NULL,
    Telefone     NVARCHAR(20)  NULL,
    Documento    NVARCHAR(20)  NULL,
    Observacao   NVARCHAR(500) NULL,
    Ativo        BIT           NOT NULL DEFAULT 1,
    DataCadastro DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 8. Venda ---------- */
IF OBJECT_ID('dbo.Venda') IS NULL
CREATE TABLE dbo.Venda (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId        INT           NOT NULL REFERENCES dbo.Empresa(Id),
    UsuarioId        INT           NOT NULL REFERENCES dbo.Usuario(Id),
    ClienteId        INT           NULL REFERENCES dbo.Cliente(Id),
    FormaPagamentoId INT           NOT NULL REFERENCES dbo.FormaPagamento(Id),
    DataVenda        DATETIME2(0)  NOT NULL,
    ValorBruto       DECIMAL(12,2) NOT NULL CHECK (ValorBruto >= 0),
    Desconto         DECIMAL(12,2) NOT NULL DEFAULT 0,
    ValorTaxa        DECIMAL(12,2) NOT NULL DEFAULT 0,
    CustoTotal       DECIMAL(12,2) NOT NULL DEFAULT 0,
    ValorLiquido     AS CAST(ValorBruto - Desconto AS DECIMAL(12,2)) PERSISTED,
    Lucro            AS CAST(ValorBruto - Desconto - ValorTaxa - CustoTotal AS DECIMAL(12,2)) PERSISTED,
    Status           VARCHAR(10)   NOT NULL DEFAULT 'CONCLUIDA'
                     CHECK (Status IN ('CONCLUIDA','CANCELADA')),
    Observacao       NVARCHAR(500) NULL,
    DataCancelamento DATETIME2(0)  NULL,
    CONSTRAINT CK_Venda_Desconto CHECK (Desconto >= 0 AND Desconto <= ValorBruto)
);
GO

/* ---------- 9. ItemVenda ---------- */
IF OBJECT_ID('dbo.ItemVenda') IS NULL
CREATE TABLE dbo.ItemVenda (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId     INT           NOT NULL REFERENCES dbo.Empresa(Id),
    VendaId       INT           NOT NULL REFERENCES dbo.Venda(Id),
    ProdutoId     INT           NOT NULL REFERENCES dbo.Produto(Id),
    Quantidade    INT           NOT NULL CHECK (Quantidade > 0),
    PrecoUnitario DECIMAL(12,2) NOT NULL,
    CustoUnitario DECIMAL(12,2) NOT NULL
);
GO

/* ---------- 10. ParcelaCrediario ---------- */
IF OBJECT_ID('dbo.ParcelaCrediario') IS NULL
CREATE TABLE dbo.ParcelaCrediario (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    EmpresaId      INT           NOT NULL REFERENCES dbo.Empresa(Id),
    VendaId        INT           NOT NULL REFERENCES dbo.Venda(Id),
    ClienteId      INT           NOT NULL REFERENCES dbo.Cliente(Id),
    Numero         INT           NOT NULL,
    TotalParcelas  INT           NOT NULL,
    Valor          DECIMAL(12,2) NOT NULL CHECK (Valor > 0),
    DataVencimento DATE          NOT NULL,
    DataPagamento  DATETIME2(0)  NULL,
    ValorPago      DECIMAL(12,2) NULL,
    Status         VARCHAR(10)   NOT NULL DEFAULT 'ABERTA'
                   CHECK (Status IN ('ABERTA','PAGA','CANCELADA'))
);
GO

/* ---------- Índices ---------- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Venda_Empresa_Data')
    CREATE INDEX IX_Venda_Empresa_Data ON dbo.Venda (EmpresaId, DataVenda) INCLUDE (Status, FormaPagamentoId, ValorBruto, Desconto, ValorTaxa, CustoTotal);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Produto_Empresa_Ativo')
    CREATE INDEX IX_Produto_Empresa_Ativo ON dbo.Produto (EmpresaId, Ativo);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cliente_Empresa_Nome')
    CREATE INDEX IX_Cliente_Empresa_Nome ON dbo.Cliente (EmpresaId, Nome);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Parcela_Empresa_Status_Venc')
    CREATE INDEX IX_Parcela_Empresa_Status_Venc ON dbo.ParcelaCrediario (EmpresaId, Status, DataVencimento);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ItemVenda_Venda')
    CREATE INDEX IX_ItemVenda_Venda ON dbo.ItemVenda (VendaId) INCLUDE (ProdutoId, Quantidade, PrecoUnitario, CustoUnitario);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Categoria_Empresa')
    CREATE INDEX IX_Categoria_Empresa ON dbo.Categoria (EmpresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FormaPagamento_Empresa')
    CREATE INDEX IX_FormaPagamento_Empresa ON dbo.FormaPagamento (EmpresaId);
GO

/* =====================================================================
   VIEW vw_ParcelasCrediario
   Parcelas com nome e telefone do cliente, situação calculada
   (ABERTA, ATRASADA, PAGA) e dias de atraso. Canceladas ficam de fora.
   "Hoje" é a data de Brasília, mesmo com o servidor em UTC.
   ===================================================================== */
CREATE OR ALTER VIEW dbo.vw_ParcelasCrediario
AS
SELECT  p.Id,
        p.EmpresaId,
        p.VendaId,
        p.ClienteId,
        c.Nome      AS ClienteNome,
        c.Telefone  AS ClienteTelefone,
        p.Numero,
        p.TotalParcelas,
        p.Valor,
        CAST(p.DataVencimento AS DATETIME2(0)) AS DataVencimento,
        p.DataPagamento,
        p.ValorPago,
        CAST(CASE
            WHEN p.Status = 'PAGA' THEN 'PAGA'
            WHEN p.DataVencimento < h.Hoje THEN 'ATRASADA'
            ELSE 'ABERTA'
        END AS VARCHAR(10)) AS Situacao,
        CASE WHEN p.Status = 'ABERTA' AND p.DataVencimento < h.Hoje
             THEN DATEDIFF(DAY, p.DataVencimento, h.Hoje) ELSE 0 END AS DiasAtraso
FROM dbo.ParcelaCrediario p
JOIN dbo.Cliente c ON c.Id = p.ClienteId
CROSS APPLY (SELECT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'E. South America Standard Time' AS DATE) AS Hoje) h
WHERE p.Status <> 'CANCELADA';
GO

/* =====================================================================
   PROCEDURES DO DASHBOARD — todas recebem @EmpresaId, @Inicio e @Fim.
   O intervalo é [@Inicio, @Fim) — @Fim é exclusivo.
   Só vendas CONCLUIDA entram nos números.
   ===================================================================== */

/* Cards do topo */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_Resumo
    @EmpresaId INT,
    @Inicio    DATETIME2(0),
    @Fim       DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoje DATE = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'E. South America Standard Time' AS DATE);

    SELECT  COUNT(*)                                   AS QtdVendas,
            ISNULL(SUM(v.ValorLiquido), 0)             AS Faturamento,
            ISNULL(SUM(v.ValorTaxa), 0)                AS Taxas,
            ISNULL(SUM(v.CustoTotal), 0)               AS Custo,
            ISNULL(SUM(v.Lucro), 0)                    AS Lucro,
            CAST(CASE WHEN COUNT(*) = 0 THEN 0
                 ELSE SUM(v.ValorLiquido) / COUNT(*) END AS DECIMAL(12,2)) AS TicketMedio,
            (SELECT ISNULL(SUM(p.Valor), 0)
               FROM dbo.ParcelaCrediario p
              WHERE p.EmpresaId = @EmpresaId AND p.Status = 'ABERTA')                 AS AReceber,
            (SELECT ISNULL(SUM(p.Valor), 0)
               FROM dbo.ParcelaCrediario p
              WHERE p.EmpresaId = @EmpresaId AND p.Status = 'ABERTA'
                AND p.DataVencimento < @Hoje)                                         AS Atrasado
    FROM dbo.Venda v
    WHERE v.EmpresaId = @EmpresaId
      AND v.Status = 'CONCLUIDA'
      AND v.DataVenda >= @Inicio AND v.DataVenda < @Fim;
END
GO

/* Gráfico de linha: faturamento e lucro por HORA, DIA ou MES.
   @Agrupamento opcional: se nulo, escolhe pelo tamanho do período. */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_Serie
    @EmpresaId   INT,
    @Inicio      DATETIME2(0),
    @Fim         DATETIME2(0),
    @Agrupamento VARCHAR(4) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @Agrupamento IS NULL
        SET @Agrupamento = CASE
            WHEN DATEDIFF(HOUR, @Inicio, @Fim) <= 24 THEN 'HORA'
            WHEN DATEDIFF(DAY,  @Inicio, @Fim) <= 62 THEN 'DIA'
            ELSE 'MES' END;

    SELECT  b.Periodo,
            SUM(v.ValorLiquido) AS Faturamento,
            SUM(v.Lucro)        AS Lucro
    FROM dbo.Venda v
    CROSS APPLY (SELECT CASE @Agrupamento
        WHEN 'HORA' THEN DATEADD(HOUR, DATEDIFF(HOUR, CAST('2000-01-01' AS DATETIME2(0)), v.DataVenda), CAST('2000-01-01' AS DATETIME2(0)))
        WHEN 'DIA'  THEN CAST(CAST(v.DataVenda AS DATE) AS DATETIME2(0))
        ELSE             CAST(DATEFROMPARTS(YEAR(v.DataVenda), MONTH(v.DataVenda), 1) AS DATETIME2(0))
    END AS Periodo) b
    WHERE v.EmpresaId = @EmpresaId
      AND v.Status = 'CONCLUIDA'
      AND v.DataVenda >= @Inicio AND v.DataVenda < @Fim
    GROUP BY b.Periodo
    ORDER BY b.Periodo;
END
GO

/* Gráfico de pizza: total e taxas por forma de pagamento */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_FormasPagamento
    @EmpresaId INT,
    @Inicio    DATETIME2(0),
    @Fim       DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT  f.Nome,
            COUNT(*)            AS Qtd,
            SUM(v.ValorLiquido) AS Total,
            SUM(v.ValorTaxa)    AS Taxas
    FROM dbo.Venda v
    JOIN dbo.FormaPagamento f ON f.Id = v.FormaPagamentoId
    WHERE v.EmpresaId = @EmpresaId
      AND v.Status = 'CONCLUIDA'
      AND v.DataVenda >= @Inicio AND v.DataVenda < @Fim
    GROUP BY f.Nome
    ORDER BY Total DESC;
END
GO

/* Rankings: top N mais ou menos vendidos (inclui produtos ativos sem venda) */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_RankingProdutos
    @EmpresaId INT,
    @Inicio    DATETIME2(0),
    @Fim       DATETIME2(0),
    @Top       INT = 5,
    @Ordem     VARCHAR(5) = 'MAIS'   -- 'MAIS' ou 'MENOS'
AS
BEGIN
    SET NOCOUNT ON;

    WITH Vendidos AS (
        SELECT  i.ProdutoId,
                SUM(i.Quantidade)                   AS Qtd,
                SUM(i.Quantidade * i.PrecoUnitario) AS Total
        FROM dbo.ItemVenda i
        JOIN dbo.Venda v ON v.Id = i.VendaId
        WHERE v.EmpresaId = @EmpresaId
          AND v.Status = 'CONCLUIDA'
          AND v.DataVenda >= @Inicio AND v.DataVenda < @Fim
        GROUP BY i.ProdutoId
    )
    SELECT TOP (@Top)
            p.Id,
            p.Nome,
            ISNULL(x.Qtd, 0)   AS Qtd,
            ISNULL(x.Total, 0) AS Total,
            p.Estoque
    FROM dbo.Produto p
    LEFT JOIN Vendidos x ON x.ProdutoId = p.Id
    WHERE p.EmpresaId = @EmpresaId
      AND (p.Ativo = 1 OR x.Qtd IS NOT NULL)
    ORDER BY
        CASE WHEN @Ordem = 'MAIS'  THEN ISNULL(x.Qtd, 0) END DESC,
        CASE WHEN @Ordem = 'MENOS' THEN ISNULL(x.Qtd, 0) END ASC,
        CASE WHEN @Ordem = 'MENOS' THEN p.Estoque END DESC,
        p.Nome;
END
GO

/* ---------- Dados iniciais: setores do onboarding ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Setor)
INSERT INTO dbo.Setor (Nome, Icone, CategoriasSugeridas, Ordem) VALUES
 (N'Moda',                 'camiseta',  N'Blusas;Calças;Vestidos;Acessórios', 1),
 (N'Doces',                'bolo',      N'Bolos;Doces finos;Salgados', 2),
 (N'Cosméticos',           'batom',     N'Maquiagem;Skincare;Cabelo;Perfumaria', 3),
 (N'Revenda por catálogo', 'catalogo',  N'Natura;Boticário;Avon;Outros', 4),
 (N'Eletrônicos',          'celular',   N'Capinhas;Carregadores;Fones;Acessórios', 5),
 (N'Personalizados',       'presente',  N'Canecas;Camisetas;Papelaria;Kits', 6),
 (N'Outro',                'loja',      N'Geral', 7);
GO
`;
