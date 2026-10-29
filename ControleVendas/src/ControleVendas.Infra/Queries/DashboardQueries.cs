using System.Data;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Infra.Data;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Infra.Queries;

/// <summary>Chama as 4 procedures do dashboard via Dapper (SQL Server).</summary>
public class DashboardQueries(AppDbContext db) : IDashboardQueries
{
    private IDbConnection Conexao => db.Database.GetDbConnection();

    public async Task<ResumoDashboardDto> ResumoAsync(int empresaId, DateTime inicio, DateTime fim) =>
        await Conexao.QuerySingleAsync<ResumoDashboardDto>("dbo.sp_Dashboard_Resumo",
            new { EmpresaId = empresaId, Inicio = inicio, Fim = fim }, commandType: CommandType.StoredProcedure);

    public async Task<IReadOnlyList<PontoSerieBrutoDto>> SerieAsync(int empresaId, DateTime inicio, DateTime fim, string agrupamento) =>
        (await Conexao.QueryAsync<PontoSerieBrutoDto>("dbo.sp_Dashboard_Serie",
            new { EmpresaId = empresaId, Inicio = inicio, Fim = fim, Agrupamento = agrupamento },
            commandType: CommandType.StoredProcedure)).ToList();

    public async Task<IReadOnlyList<FormaPagamentoDashboardDto>> FormasPagamentoAsync(int empresaId, DateTime inicio, DateTime fim) =>
        (await Conexao.QueryAsync<FormaPagamentoDashboardDto>("dbo.sp_Dashboard_FormasPagamento",
            new { EmpresaId = empresaId, Inicio = inicio, Fim = fim }, commandType: CommandType.StoredProcedure)).ToList();

    public async Task<IReadOnlyList<RankingProdutoDto>> RankingProdutosAsync(int empresaId, DateTime inicio, DateTime fim, int top,
        string ordem) =>
        (await Conexao.QueryAsync<RankingProdutoDto>("dbo.sp_Dashboard_RankingProdutos",
            new { EmpresaId = empresaId, Inicio = inicio, Fim = fim, Top = top, Ordem = ordem },
            commandType: CommandType.StoredProcedure)).ToList();
}

/// <summary>
/// Mesmos resultados das procedures, em LINQ. Usado só no modo de demonstração com SQLite,
/// que não tem stored procedures.
/// </summary>
public class DashboardQueriesLinq(AppDbContext db) : IDashboardQueries
{
    public async Task<ResumoDashboardDto> ResumoAsync(int empresaId, DateTime inicio, DateTime fim)
    {
        var vendas = await VendasAsync(empresaId, inicio, fim);
        var hoje = Domain.Rules.Relogio.Hoje;
        var abertas = await db.Parcelas.IgnoreQueryFilters()
            .Where(p => p.EmpresaId == empresaId && p.Status == Domain.Enums.StatusParcela.ABERTA)
            .Select(p => new { p.Valor, p.DataVencimento }).ToListAsync();
        var qtd = vendas.Count;
        var faturamento = vendas.Sum(v => v.ValorLiquido);
        return new ResumoDashboardDto
        {
            QtdVendas = qtd,
            Faturamento = faturamento,
            Taxas = vendas.Sum(v => v.ValorTaxa),
            Custo = vendas.Sum(v => v.CustoTotal),
            Lucro = vendas.Sum(v => v.Lucro),
            TicketMedio = qtd == 0 ? 0 : Math.Round(faturamento / qtd, 2),
            AReceber = abertas.Sum(p => p.Valor),
            Atrasado = abertas.Where(p => p.DataVencimento.Date < hoje).Sum(p => p.Valor)
        };
    }

    public async Task<IReadOnlyList<PontoSerieBrutoDto>> SerieAsync(int empresaId, DateTime inicio, DateTime fim, string agrupamento)
    {
        var vendas = await VendasAsync(empresaId, inicio, fim);
        return vendas.GroupBy(v => agrupamento switch
            {
                "HORA" => new DateTime(v.DataVenda.Year, v.DataVenda.Month, v.DataVenda.Day, v.DataVenda.Hour, 0, 0),
                "MES" => new DateTime(v.DataVenda.Year, v.DataVenda.Month, 1),
                _ => v.DataVenda.Date
            })
            .OrderBy(g => g.Key)
            .Select(g => new PontoSerieBrutoDto { Periodo = g.Key, Faturamento = g.Sum(v => v.ValorLiquido), Lucro = g.Sum(v => v.Lucro) })
            .ToList();
    }

    public async Task<IReadOnlyList<FormaPagamentoDashboardDto>> FormasPagamentoAsync(int empresaId, DateTime inicio, DateTime fim)
    {
        var vendas = await VendasAsync(empresaId, inicio, fim);
        return vendas.GroupBy(v => v.Forma)
            .Select(g => new FormaPagamentoDashboardDto { Nome = g.Key, Qtd = g.Count(), Total = g.Sum(v => v.ValorLiquido), Taxas = g.Sum(v => v.ValorTaxa) })
            .OrderByDescending(f => f.Total).ToList();
    }

    public async Task<IReadOnlyList<RankingProdutoDto>> RankingProdutosAsync(int empresaId, DateTime inicio, DateTime fim, int top, string ordem)
    {
        var vendidos = await db.ItensVenda.IgnoreQueryFilters()
            .Where(i => i.EmpresaId == empresaId && i.Venda!.Status == Domain.Enums.StatusVenda.CONCLUIDA
                        && i.Venda.DataVenda >= inicio && i.Venda.DataVenda < fim)
            .Select(i => new { i.ProdutoId, i.Quantidade, i.PrecoUnitario }).ToListAsync();
        var porProduto = vendidos.GroupBy(i => i.ProdutoId)
            .ToDictionary(g => g.Key, g => (Qtd: g.Sum(i => i.Quantidade), Total: g.Sum(i => i.Quantidade * i.PrecoUnitario)));
        var produtos = await db.Produtos.IgnoreQueryFilters().Where(p => p.EmpresaId == empresaId)
            .Select(p => new { p.Id, p.Nome, p.Estoque, p.Ativo }).ToListAsync();

        var lista = produtos.Where(p => p.Ativo || porProduto.ContainsKey(p.Id))
            .Select(p =>
            {
                var (qtd, total) = porProduto.GetValueOrDefault(p.Id);
                return new RankingProdutoDto { Id = p.Id, Nome = p.Nome, Qtd = qtd, Total = total, Estoque = p.Estoque };
            });
        lista = ordem == "MENOS"
            ? lista.OrderBy(p => p.Qtd).ThenByDescending(p => p.Estoque).ThenBy(p => p.Nome)
            : lista.OrderByDescending(p => p.Qtd).ThenBy(p => p.Nome);
        return lista.Take(top).ToList();
    }

    private sealed record VendaResumo(DateTime DataVenda, decimal ValorLiquido, decimal ValorTaxa, decimal CustoTotal, decimal Lucro, string Forma);

    private Task<List<VendaResumo>> VendasAsync(int empresaId, DateTime inicio, DateTime fim) =>
        db.Vendas.IgnoreQueryFilters()
            .Where(v => v.EmpresaId == empresaId && v.Status == Domain.Enums.StatusVenda.CONCLUIDA && v.DataVenda >= inicio && v.DataVenda < fim)
            .Select(v => new VendaResumo(v.DataVenda, v.ValorLiquido, v.ValorTaxa, v.CustoTotal, v.Lucro, v.FormaPagamento!.Nome))
            .ToListAsync();
}
