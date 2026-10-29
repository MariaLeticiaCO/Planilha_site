using System.Text.RegularExpressions;
using ControleVendas.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ControleVendas.Infra.Data;

/// <summary>
/// Prepara o banco na inicialização.
/// SQL Server: se as tabelas não existirem e CriarSchemaAutomaticamente = true, roda o controle_vendas_schema.sql.
/// SQLite (demonstração): cria as tabelas pelo modelo do EF, a view e os setores.
/// </summary>
public static partial class DbInicializador
{
    public static async Task InicializarAsync(IServiceProvider services, bool criarSchemaSqlServer)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DbInicializador));

        if (db.EhSqlServer)
        {
            if (!criarSchemaSqlServer) return;
            var existe = await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM sys.tables WHERE name = 'Setor'").SingleAsync();
            if (existe > 0) return;
            logger.LogInformation("Banco vazio: rodando controle_vendas_schema.sql");
            foreach (var lote in LerLotesDoScript())
                await db.Database.ExecuteSqlRawAsync(lote);
            return;
        }

        if (await db.Database.EnsureCreatedAsync())
        {
            logger.LogInformation("Banco SQLite de demonstração criado.");
            await db.Database.ExecuteSqlRawAsync(ViewSqlite);
        }
        if (!await db.Setores.AnyAsync())
        {
            db.Setores.AddRange(SetoresPadrao());
            await db.SaveChangesAsync();
        }
    }

    private static IEnumerable<string> LerLotesDoScript()
    {
        using var stream = typeof(DbInicializador).Assembly.GetManifestResourceStream("controle_vendas_schema.sql")
                           ?? throw new InvalidOperationException("controle_vendas_schema.sql não embutido.");
        using var reader = new StreamReader(stream);
        var script = reader.ReadToEnd();
        return SeparadorGo().Split(script).Select(l => l.Trim()).Where(l => l.Length > 0);
    }

    [GeneratedRegex(@"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex SeparadorGo();

    /// <summary>Mesmos setores do script SQL.</summary>
    public static IEnumerable<Setor> SetoresPadrao() =>
    [
        new() { Nome = "Moda", Icone = "camiseta", CategoriasSugeridas = "Blusas;Calças;Vestidos;Acessórios", Ordem = 1 },
        new() { Nome = "Doces", Icone = "bolo", CategoriasSugeridas = "Bolos;Doces finos;Salgados", Ordem = 2 },
        new() { Nome = "Cosméticos", Icone = "batom", CategoriasSugeridas = "Maquiagem;Skincare;Cabelo;Perfumaria", Ordem = 3 },
        new() { Nome = "Revenda por catálogo", Icone = "catalogo", CategoriasSugeridas = "Natura;Boticário;Avon;Outros", Ordem = 4 },
        new() { Nome = "Eletrônicos", Icone = "celular", CategoriasSugeridas = "Capinhas;Carregadores;Fones;Acessórios", Ordem = 5 },
        new() { Nome = "Personalizados", Icone = "presente", CategoriasSugeridas = "Canecas;Camisetas;Papelaria;Kits", Ordem = 6 },
        new() { Nome = "Outro", Icone = "loja", CategoriasSugeridas = "Geral", Ordem = 7 }
    ];

    /// <summary>vw_ParcelasCrediario em SQLite (mesmas colunas e regras da versão SQL Server).</summary>
    private const string ViewSqlite = """
        CREATE VIEW IF NOT EXISTS vw_ParcelasCrediario AS
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
        """;
}
